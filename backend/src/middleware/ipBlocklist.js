import mongoose from "mongoose";

import {env} from "../config/env.js";
import {logger} from "../config/logger.js";
import {BlockedIp} from "../models/BlockedIp.js";

// IP blocklist for quick reaction during an active attack. This is NOT a
// substitute for Cloud Armor or Cloudflare — it is the emergency brake you
// pull while the heavier defenses are being configured.
//
// The database is the source of truth, so a block reaches every instance and
// survives a restart. Each instance checks a local copy (entries are
// {ip: {until: timestamp, reason: string}}) refreshed from the database every
// SYNC_INTERVAL, so the per-request check never waits on a query.

const blocklist = new Map();

const SYNC_INTERVAL = 30_000;

const isConnected = () => mongoose.connection.readyState === 1;

const persist = (operation) => {
  if (!isConnected()) return;
  operation().catch((error) => logger.error({err: error}, "Blocklist write failed"));
};

const syncFromDatabase = async () => {
  if (!isConnected()) {
    // No database to read from: just drop lapsed local entries.
    const now = Date.now();
    for (const [ip, entry] of blocklist) {
      if (entry.until <= now) blocklist.delete(ip);
    }
    return;
  }

  const rows = await BlockedIp.find({until: {$gt: new Date()}}).lean();
  blocklist.clear();
  for (const row of rows) blocklist.set(row.ip, {until: row.until.getTime(), reason: row.reason});
};

if (!env.isTest) {
  setInterval(() => {
    syncFromDatabase().catch((error) => logger.error({err: error}, "Blocklist sync failed"));
  }, SYNC_INTERVAL).unref();
}

// Bounded so a typo cannot block forever, and a non-number cannot become NaN.
const MAX_BLOCK_MS = 7 * 24 * 60 * 60 * 1000;

export const blockIP = (ip, {durationMs = 30 * 60 * 1000, reason = "manual"} = {}) => {
  const requested = Number(durationMs);
  const duration = Math.min(Number.isFinite(requested) ? requested : 30 * 60 * 1000, MAX_BLOCK_MS);
  const until = Date.now() + duration;
  const why = String(reason || "manual").slice(0, 200);

  blocklist.set(ip, {until, reason: why});
  persist(() =>
    BlockedIp.updateOne({ip}, {$set: {until: new Date(until), reason: why}}, {upsert: true}),
  );
  logger.warn({ip, reason: why, durationMs: duration}, "IP blocked");
};

export const unblockIP = (ip) => {
  blocklist.delete(ip);
  persist(() => BlockedIp.deleteOne({ip}));
  logger.info({ip}, "IP unblocked");
};

const isBlocked = (ip) => {
  const entry = blocklist.get(ip);
  if (!entry) return false;
  if (entry.until <= Date.now()) {
    blocklist.delete(ip);
    return false;
  }
  return true;
};

// Middleware: reject blocked IPs with 403.
export const ipBlockGuard = (req, res, next) => {
  if (env.isTest) return next();

  const ip = req.ip;
  if (isBlocked(ip)) {
    const entry = blocklist.get(ip);
    logger.warn({ip, reason: entry?.reason}, "Blocked request from blacklisted IP");
    return res.status(403).json({
      success: false,
      error: {code: "FORBIDDEN", message: "Access denied"},
      meta: {requestId: req.id},
    });
  }
  next();
};

// Export current blocklist state for monitoring endpoints.
export const getBlocklist = () => {
  const now = Date.now();
  const entries = [];
  for (const [ip, entry] of blocklist) {
    if (entry.until > now) {
      entries.push({ip, until: new Date(entry.until).toISOString(), reason: entry.reason});
    }
  }
  return entries;
};
