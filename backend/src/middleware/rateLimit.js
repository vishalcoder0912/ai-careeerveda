import rateLimit from "express-rate-limit";

import {env} from "../config/env.js";
import {tooManyRequests} from "../utils/apiError.js";

// Limits are per route category rather than one global number, because the
// budgets are genuinely different: a public listing page may be polled by every
// visitor, while six login attempts a minute from one IP is already an attack.

const handler = (message) => (request, response, next) => next(tooManyRequests(message));

const base = {
  standardHeaders: "draft-7",
  legacyHeaders: false,
  // Tests would otherwise trip the login limiter across cases and fail for
  // reasons unrelated to what they assert.
  skip: () => env.isTest,
};

// Auth: strict, and counted per IP. Deliberately does NOT key on the submitted
// email — that would let an attacker spread attempts across accounts for free.
export const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  handler: handler("Too many attempts. Please wait a few minutes and try again."),
});

// Public form submissions. Low, because each one writes a lead row.
export const formLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 15,
  handler: handler("Too many submissions from this network. Please try again later."),
});

// Public reads. High enough to be invisible to a real visitor.
export const publicLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 200,
  handler: handler("Too many requests. Please slow down."),
});

// Authenticated admin work: generous, since a single editor session makes many
// legitimate calls, but still bounded so a runaway script cannot saturate us.
export const adminLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 300,
  handler: handler("Too many requests. Please slow down."),
});

// Uploads are the most expensive thing we do — bandwidth in, then an ImageKit
// round trip out — so they get their own, much smaller budget.
export const uploadLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 30,
  handler: handler("Too many uploads. Please wait a moment."),
});
