import {afterEach, beforeEach, describe, expect, it, jest} from "@jest/globals";

import {env} from "../../../src/config/env.js";
import {
  authSlowDown,
  formSlowDown,
  publicSlowDown,
} from "../../../src/middleware/slowDown.js";

// express-slow-down is the rate-limit cousin: instead of refusing the request
// it delays it. Same test shape as rateLimit.test.js — call the real middleware
// with minimal request/response stand-ins and read back what it did.

const SLOWDOWNS = [authSlowDown, formSlowDown, publicSlowDown];

const makeRequest = (ip) => ({
  ip,
  headers: {},
  app: {get: (name) => (name === "trust proxy" ? false : undefined)},
});

const makeResponse = () => ({
  setHeader: jest.fn(),
  headersSent: false,
  statusCode: 200,
  on: jest.fn(),
  once: jest.fn(),
});

const run = async (limiter, ip) => {
  const request = makeRequest(ip);
  const response = makeResponse();
  const next = jest.fn();
  await limiter(request, response, next);
  return {request, response, next};
};

const REAL_IS_TEST = env.isTest;

beforeEach(() => {
  env.isTest = true;
});

afterEach(() => {
  env.isTest = REAL_IS_TEST;
  jest.useRealTimers();
});

describe("slow-down limiters", () => {
  it("exports one middleware per route category", () => {
    for (const limiter of SLOWDOWNS) {
      expect(typeof limiter).toBe("function");
    }
  });

  it("applies an increasing daily-request allowance on auth, then tighter caps elsewhere", async () => {
    env.isTest = false;

    const cases = [
      [authSlowDown, 20, "198.51.100.50"],
      [publicSlowDown, 100, "198.51.100.51"],
      [formSlowDown, 5, "198.51.100.52"],
    ];

    for (const [limiter, expected, ip] of cases) {
      const {request} = await run(limiter, ip);
      expect(request.slowDown.limit).toBe(expected);
    }
  });

  it("lets requests straight through in the test environment so suites do not throttle each other", async () => {
    for (const limiter of SLOWDOWNS) {
      const {next} = await run(limiter, "203.0.113.40");
      expect(next).toHaveBeenCalledWith();
    }
  });

  it("stamps the running used/remaining counts on the request outside test mode", async () => {
    env.isTest = false;

    for (let hit = 1; hit <= 3; hit += 1) {
      const {request, next} = await run(formSlowDown, "198.51.100.40");
      expect(request.slowDown.used).toBe(hit);
      expect(request.slowDown.remaining).toBe(5 - hit);
      expect(next).toHaveBeenCalledWith();
    }
  });

  it("holds a throttled request before continuing it, never dropping it", async () => {
    env.isTest = false;
    jest.useFakeTimers();

    const ip = "198.51.100.41";
    for (let hit = 1; hit <= 6; hit += 1) await run(formSlowDown, ip);

    const {request, next} = await run(formSlowDown, ip);

    expect(request.slowDown.delay).toBeGreaterThan(0);
    expect(next).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(2_000);
    expect(next).toHaveBeenCalledWith();
  });

  it("ramps the delay with each extra request and caps it at maxDelayMs", async () => {
    env.isTest = false;
    jest.useFakeTimers();

    const ip = "198.51.100.42";
    for (let hit = 1; hit <= 10; hit += 1) await run(formSlowDown, ip);
    const {request} = await run(formSlowDown, ip);
    expect(request.slowDown.delay).toBe((11 - 5) * 500);

    const cappedIp = "198.51.100.43";
    for (let hit = 1; hit <= 40; hit += 1) await run(formSlowDown, cappedIp);
    const {request: cappedRequest} = await run(formSlowDown, cappedIp);
    expect(cappedRequest.slowDown.delay).toBe(15_000);
  });
});