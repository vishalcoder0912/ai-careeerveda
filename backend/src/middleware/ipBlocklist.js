import {env} from "../config/env.js";
import {logger} from "../config/logger.js";

// In-memory IP blocklist for quick reaction during an active attack.
// Entries are {ip: {until: timestamp, reason: string}}.
// This is NOT a substitute for Cloud Armor or Cloudflare — it is the emergency
// brake you pull while the heavier defenses are being configured.
//
// Persist blocklists to Redis or a database for multi-instance deployments.
// For a single-VM setup, in-memory is sufficient and avoids an external dependency.

const blocklist = new Map();

// Auto-expire entries every 60 seconds to prevent unbounded memory growth.
const CLEANUP_INTERVAL = 60_000;
if (!env.isTest) {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of blocklist) {
      if (entry.until <= now) blocklist.delete(ip);
    }
  }, CLEANUP_INTERVAL).unref();
}

export const blockIP = (ip, {durationMs = 30 * 60 * 1000, reason = "manual"} = {}) => {
  blocklist.set(ip, {until: Date.now() + durationMs, reason});
  logger.warn({ip, reason, durationMs}, "IP blocked");
};

export const unblockIP = (ip) => {
  blocklist.delete(ip);
  logger.info({ip}, "IP unblocked");
};

export const isBlocked = (ip) => {
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
