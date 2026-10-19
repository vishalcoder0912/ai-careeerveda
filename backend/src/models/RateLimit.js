import mongoose from "mongoose";

// One counter per limiter and key (e.g. "auth:203.0.113.7"), written by the
// shared store in middleware/rateLimit.js. The TTL index lets the database
// drop a window once it has lapsed, so the collection never grows past the
// set of networks seen in the last hour.
const rateLimitSchema = new mongoose.Schema(
  {
    _id: {type: String},
    hits: {type: Number, default: 0},
    resetAt: {type: Date, required: true},
  },
  {versionKey: false},
);

rateLimitSchema.index({resetAt: 1}, {expireAfterSeconds: 0});

export const RateLimit = mongoose.model("RateLimit", rateLimitSchema);
