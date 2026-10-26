import {env} from "../config/env.js";
import {logger} from "../config/logger.js";
import {blockIP} from "./ipBlocklist.js";

// Lightweight anomaly detection at the application layer. This catches patterns
// that bypass network-level controls (Cloudflare, Cloud Armor) or originate from
// trusted proxies.
//
// This is NOT a WAF. It is a tripwire: when it detects a suspicious pattern it
// logs the event, adds a header, and optionally escalates to the IP blocklist.
// False positives are logged at warn level; real attacks at error.

const THRESHOLDS = {
  // Requests per IP within the tracking window before we flag it.
  maxRequestsPerWindow: 500,
  // Window in milliseconds.
  windowMs: 60 * 1000,
  // Maximum allowed path depth (e.g. /a/b/c = depth 3).
  maxPathDepth: 10,
  // Maximum query string length — anything beyond this is almost certainly probing.
  maxQueryLength: 2048,
  // Maximum User-Agent length.
  maxUserAgentLength: 512,
};

// Per-IP request counters: {ip: {count, resetAt}}.
const counters = new Map();

const CLEANUP_INTERVAL = 60_000;
if (!env.isTest) {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of counters) {
      if (data.resetAt <= now) counters.delete(ip);
    }
  }, CLEANUP_INTERVAL).unref();
}

// Paths that should never be probed — if you see these, someone is scanning
// for known vulnerabilities in other frameworks.
const SUSPICIOUS_PATHS = new Set([
  "/wp-admin",
  "/wp-login.php",
  "/xmlrpc.php",
  "/.env",
  "/.git/config",
  "/phpMyAdmin",
  "/phpmyadmin",
  "/admin/config.php",
  "/wp-content/debug.log",
  "/server-status",
  "/server-info",
]);

// Path traversal patterns.
const TRAVERSAL_PATTERN = /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\/|\.%2e\/|%2e\.%2f)/i;

export const anomalyDetector = (req, res, next) => {
  if (env.isTest) return next();

  const ip = req.ip;
  const now = Date.now();

  // ── 1. Suspicious path probing ─────────────────────────────────────────────
  if (SUSPICIOUS_PATHS.has(req.path) || TRAVERSAL_PATTERN.test(req.path)) {
    logger.error({ip, path: req.path, method: req.method}, "Suspicious path probe detected");
    res.setHeader("X-Security-Flag", "path-probe");
    return res.status(404).json({
      success: false,
      error: {code: "NOT_FOUND", message: "Not found"},
      meta: {requestId: req.id},
    });
  }

  // ── 2. Excessive path depth ────────────────────────────────────────────────
  const depth = req.path.split("/").filter(Boolean).length;
  if (depth > THRESHOLDS.maxPathDepth) {
    logger.warn({ip, path: req.path, depth}, "Excessive path depth");
    res.setHeader("X-Security-Flag", "depth-exceeded");
    return res.status(400).json({
      success: false,
      error: {code: "BAD_REQUEST", message: "Request path too deep"},
      meta: {requestId: req.id},
    });
  }

  // ── 3. Oversized query string ──────────────────────────────────────────────
  if (req.originalUrl.length > THRESHOLDS.maxQueryLength + 200) {
    logger.warn({ip, path: req.path, queryLength: req.originalUrl.length}, "Oversized request URL");
    res.setHeader("X-Security-Flag", "url-oversized");
    return res.status(414).json({
      success: false,
      error: {code: "URI_TOO_LONG", message: "Request URI too long"},
      meta: {requestId: req.id},
    });
  }

  // ── 4. Suspicious User-Agent ───────────────────────────────────────────────
  const ua = req.headers["user-agent"] || "";
  if (ua.length > THRESHOLDS.maxUserAgentLength) {
    logger.warn({ip, uaLength: ua.length}, "Oversized User-Agent");
    res.setHeader("X-Security-Flag", "ua-oversized");
  }

  // Empty User-Agent from a browser-like request is suspicious.
  if (!ua && req.headers.accept?.includes("text/html")) {
    logger.warn({ip, path: req.path}, "Missing User-Agent on navigation request");
    res.setHeader("X-Security-Flag", "no-ua");
  }

  // ── 5. (removed) SQL keyword matching ─────────────────────────────────────
  // There is no SQL database behind this API, and the keyword filter rejected
  // ordinary prose — "select a program from your list" got a 400 on the lead
  // form and in blog edits. NoSQL operator injection is handled structurally by
  // sanitizeRequest ($-keys stripped) and zod (typed fields), which is the
  // defence that actually applies here.

  // ── 6. Request frequency tracking ──────────────────────────────────────────
  let counter = counters.get(ip);
  if (!counter || counter.resetAt <= now) {
    counter = {count: 0, resetAt: now + THRESHOLDS.windowMs};
    counters.set(ip, counter);
  }
  counter.count++;

  if (counter.count > THRESHOLDS.maxRequestsPerWindow) {
    logger.error(
      {ip, count: counter.count, windowMs: THRESHOLDS.windowMs},
      "Request frequency threshold exceeded",
    );
    res.setHeader("X-Security-Flag", "rate-exceeded");
    // Escalate to the blocklist for repeat offenders.
    if (counter.count > THRESHOLDS.maxRequestsPerWindow * 2) {
      blockIP(ip, {durationMs: 30 * 60 * 1000, reason: "anomaly-threshold-exceeded"});
    }
  }

  // ── 7. Suspicious HTTP methods ─────────────────────────────────────────────
  const UNSUPPORTED_METHODS = new Set(["TRACE", "TRACK", "CONNECT"]);
  if (UNSUPPORTED_METHODS.has(req.method)) {
    logger.warn({ip, method: req.method}, "Unsupported HTTP method");
    return res.status(405).json({
      success: false,
      error: {code: "METHOD_NOT_ALLOWED", message: `${req.method} is not allowed`},
      meta: {requestId: req.id},
    });
  }

  next();
};
