import slowDown from "express-slow-down";

import {env} from "../config/env.js";

// Progressive delay: after `threshold` requests within `windowMs`, each
// additional request is delayed by an increasing amount. This lets real users
// through untouched while making brute-force and scanning attacks painfully slow.
// Unlike rate-limiting (which returns 429), this still serves the request — it
// just takes longer, which wastes attacker resources more effectively.
//
// express-slow-down v2 requires `delayMs` as a *function*; the function receives
// (used, req) and must return the per-request delay. We compute an increasing
// delay from how far past the threshold the request is, capped at maxDelayMs.

const incrementalDelay = (stepMs) => (used, req) => {
  const threshold = req.slowDown.limit;
  const excess = Math.max(0, used - threshold);
  return Math.min(excess * stepMs, req.slowDown.maxDelayMs);
};

const skipInTest = () => env.isTest;

// Auth endpoints: generous initial window, then steep ramp.
// An attacker trying 10 000 password combinations hits a 2-second delay after 20
// requests and a 20-second delay after 50 — at that point they get ~3 attempts
// per minute instead of dozens.
export const authSlowDown = slowDown({
  windowMs: 15 * 60 * 1000,
  delayMs: incrementalDelay(200),
  delayAfter: 20,
  maxDelayMs: 20_000,
  skip: skipInTest,
});

// Public API: start delaying after 100 requests per minute.
// Real visitors rarely exceed 60 req/min; scrapers and bots blow past 100 fast.
export const publicSlowDown = slowDown({
  windowMs: 60 * 1000,
  delayMs: incrementalDelay(100),
  delayAfter: 100,
  maxDelayMs: 5_000,
  skip: skipInTest,
});

// Form submissions: start delaying after 5 requests per minute.
// Forms are write-heavy and each one creates a lead row.
export const formSlowDown = slowDown({
  windowMs: 60 * 1000,
  delayMs: incrementalDelay(500),
  delayAfter: 5,
  maxDelayMs: 15_000,
  skip: skipInTest,
});
