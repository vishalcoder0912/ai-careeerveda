import rateLimit, {MemoryStore} from "express-rate-limit";
import mongoose from "mongoose";

import {RateLimit} from "../models/RateLimit.js";
import {env} from "../config/env.js";
import {tooManyRequests} from "../utils/apiError.js";

// Counters shared by every instance. Cloud Run runs up to ten copies of this
// process, and an in-memory counter is per copy — "10 logins per 15 minutes"
// silently became up to 100. The budgets that guard credentials and writes
// (auth, forms) therefore count in MongoDB; the cheap read limits stay in
// memory, where a per-instance budget is an acceptable approximation.
//
// While the database is not connected (boot, an outage, unit tests) the store
// counts in memory instead of failing the request — a degraded limit beats
// refusing every login because the counter is unreachable.
class SharedStore {
  constructor(prefix) {
    this.prefix = prefix;
    this.fallback = new MemoryStore();
  }

  init(options) {
    this.windowMs = options.windowMs;
    this.fallback.init(options);
  }

  get collection() {
    return mongoose.connection.readyState === 1 ? RateLimit.collection : null;
  }

  async increment(key) {
    const collection = this.collection;
    if (!collection) return this.fallback.increment(key);

    const now = new Date();
    const live = {$gt: ["$resetAt", now]};
    // One atomic upsert: restarts the window when it has lapsed, otherwise
    // adds one. Two instances counting the same IP cannot both read 9.
    const document = await collection.findOneAndUpdate(
      {_id: `${this.prefix}:${key}`},
      [
        {
          $set: {
            hits: {$cond: [live, {$add: ["$hits", 1]}, 1]},
            resetAt: {$cond: [live, "$resetAt", new Date(now.getTime() + this.windowMs)]},
          },
        },
      ],
      {upsert: true, returnDocument: "after"},
    );

    return {totalHits: document.hits, resetTime: document.resetAt};
  }

  async decrement(key) {
    const collection = this.collection;
    if (!collection) return this.fallback.decrement(key);
    await collection.updateOne({_id: `${this.prefix}:${key}`}, {$inc: {hits: -1}});
  }

  async resetKey(key) {
    const collection = this.collection;
    if (!collection) return this.fallback.resetKey(key);
    await collection.deleteOne({_id: `${this.prefix}:${key}`});
  }
}

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

// Global baseline: every request, regardless of route. This is the safety net
// that catches an attacker who hits different paths to evade per-route limits.
// 500 req/min/IP is invisible to real users but prevents a single IP from
// generating thousands of requests across many endpoints.
export const globalLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 500,
  handler: handler("Too many requests from this network. Please try again later."),
  keyGenerator: (req) => req.ip,
});

// Auth: strict, and counted per IP. Deliberately does NOT key on the submitted
// email — that would let an attacker spread attempts across accounts for free.
export const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  store: new SharedStore("auth"),
  handler: handler("Too many attempts. Please wait a few minutes and try again."),
});

// Public lead submissions. Low, because each one writes a lead row: a person
// fills in a form once or twice, so five an hour per network is generous for
// people and a hard ceiling for a script. Job applications have their own,
// wider budget below.
export const formLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 5,
  store: new SharedStore("form"),
  handler: handler("Too many submissions from this network. Please try again later."),
});

// Second form budget, keyed on who the submission claims to be rather than on
// the IP. The IP limiter alone falls to anyone rotating addresses (or spoofing
// X-Forwarded-For when the API is reachable without the proxy); this one caps
// how often one phone/email can be re-submitted, which bounds repeat-note spam
// and archived-lead resurfacing however many IPs are used. Runs after
// validate(), so mobile/email are already well-formed.
const identityKey = (request) => {
  const mobile = String(request.body?.mobile || "").replace(/\D/g, "").slice(-10);
  return mobile || String(request.body?.email || "").trim().toLowerCase() || "anonymous";
};

export const formIdentityLimiter = rateLimit({
  ...base,
  windowMs: 24 * 60 * 60 * 1000,
  limit: 3,
  store: new SharedStore("form-identity"),
  keyGenerator: identityKey,
  handler: handler("Too many submissions for these details. Please try again tomorrow."),
});

// Job applications keep their own budget instead of spending the lead form's
// five-an-hour. A candidate applying to several roles in one sitting is normal,
// and many candidates can sit behind one college/office NAT address. The
// database already enforces one row per job per phone, and the per-IP cap still
// bounds the write volume, so a wider budget here does not open a spam lane.
export const jobApplicationLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 20,
  store: new SharedStore("job-form"),
  handler: handler("Too many applications from this network. Please try again later."),
});

// Separate identity budget for the same reason: a real job hunt can exceed the
// lead form's three-per-day without being spam. Duplicate applications to the
// same job still collapse onto one row via the model's unique key.
export const jobApplicationIdentityLimiter = rateLimit({
  ...base,
  windowMs: 24 * 60 * 60 * 1000,
  limit: 10,
  store: new SharedStore("job-form-identity"),
  keyGenerator: identityKey,
  handler: handler("Too many applications for these details. Please try again tomorrow."),
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
