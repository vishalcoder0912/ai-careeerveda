import {afterEach, beforeEach, describe, expect, it, jest} from "@jest/globals";

import {env} from "../../../src/config/env.js";
import {
  adminLimiter,
  authLimiter,
  formLimiter,
  publicLimiter,
  uploadLimiter,
} from "../../../src/middleware/rateLimit.js";
import {ApiError} from "../../../src/utils/apiError.js";

// express-rate-limit v7 runs its key generation and counting asynchronously
// and validates the request on the way — the stand-ins below carry the fields
// its defaults read (ip, headers, the trust-proxy setting) so the real
// middleware, not a facsimile, is under test. Every call gets a fresh request
// object: v7's double-count validation keys on the object identity.

const LIMITERS = [authLimiter, formLimiter, publicLimiter, adminLimiter, uploadLimiter];

const makeRequest = (ip) => ({
  ip,
  headers: {},
  app: {get: (name) => (name === "trust proxy" ? false : undefined)},
});

const makeResponse = () => ({setHeader: jest.fn(), headersSent: false, statusCode: 200});

const run = async (limiter, ip) => {
  const request = makeRequest(ip);
  const response = makeResponse();
  const next = jest.fn();
  await limiter(request, response, next);
  return {request, response, next};
};

const REAL_IS_TEST = env.isTest;

beforeEach(() => {
  expect(env.isTest).toBe(true);
});

afterEach(() => {
  env.isTest = REAL_IS_TEST;
});

describe("rate limiters", () => {
  it("exports a middleware for every route category", () => {
    for (const limiter of LIMITERS) {
      expect(typeof limiter).toBe("function");
    }
  });

  it("passes requests straight through in the test environment, so suites do not trip each other", async () => {
    for (const limiter of LIMITERS) {
      const {next} = await run(limiter, "203.0.113.1");

      expect(next).toHaveBeenCalledWith();
    }
  });

  it("leaves no rate-limit bookkeeping on a skipped request", async () => {
    const {request} = await run(authLimiter, "203.0.113.1");

    expect(request.rateLimit).toBeUndefined();
  });

  it("counts requests per key and stamps the running totals on the request", async () => {
    env.isTest = false;

    for (let hit = 1; hit <= 10; hit += 1) {
      const {request, next} = await run(authLimiter, "198.51.100.10");

      expect(request.rateLimit).toMatchObject({limit: 10, used: hit, remaining: 10 - hit});
      expect(next).toHaveBeenCalledWith();
    }
  });

  it("refuses the request that crosses the budget with the documented 429 contract", async () => {
    env.isTest = false;

    for (let hit = 1; hit <= 10; hit += 1) await run(authLimiter, "198.51.100.11");

    const {request, next} = await run(authLimiter, "198.51.100.11");

    expect(request.rateLimit.used).toBe(11);
    expect(next).toHaveBeenCalledTimes(1);

    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(429);
    expect(error.code).toBe("RATE_LIMITED");
    expect(error.message).toMatch(/Too many attempts/);
  });

  it("keeps each IP on its own budget, so one attacker cannot starve the neighbours", async () => {
    env.isTest = false;

    for (let hit = 1; hit <= 11; hit += 1) await run(authLimiter, "198.51.100.12");

    const {request, next} = await run(authLimiter, "198.51.100.13");

    expect(request.rateLimit.used).toBe(1);
    expect(next).toHaveBeenCalledWith();
  });

  it("applies a distinct budget per route category, tightest where the work is most expensive", async () => {
    env.isTest = false;

    const budgets = {
      authLimiter: 10,
      formLimiter: 15,
      uploadLimiter: 30,
      publicLimiter: 200,
      adminLimiter: 300,
    };

    for (const [name, budget] of Object.entries(budgets)) {
      const limiter = {authLimiter, formLimiter, uploadLimiter, publicLimiter, adminLimiter}[name];
      const {request} = await run(limiter, "203.0.113.30");
      expect(request.rateLimit.limit).toBe(budget);
    }
  });

  it("sends the exceeded message as an ApiError, the shape the error handler renders", async () => {
    env.isTest = false;

    const {next} = await run(formLimiter, "198.51.100.20");
    for (let hit = 1; hit < 15; hit += 1) await run(formLimiter, "198.51.100.20");
    const {next: afterLimit} = await run(formLimiter, "198.51.100.20");

    expect(next).toHaveBeenCalledWith();
    expect(afterLimit.mock.calls[0][0]).toBeInstanceOf(ApiError);
    expect(afterLimit.mock.calls[0][0].code).toBe("RATE_LIMITED");
  });
});