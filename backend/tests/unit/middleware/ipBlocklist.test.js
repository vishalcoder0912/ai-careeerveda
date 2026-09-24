import {afterEach, beforeEach, describe, expect, it, jest} from "@jest/globals";

import {env} from "../../../src/config/env.js";
import {
  blockIP,
  getBlocklist,
  ipBlockGuard,
  unblockIP,
} from "../../../src/middleware/ipBlocklist.js";

const makeRequest = (ip) => ({ip, id: "req-1"});
const makeResponse = () => {
  const res = {
    statusCode: 200,
    setHeader: jest.fn(),
    json: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
  };
  return res;
};

const REAL_IS_TEST = env.isTest;

beforeEach(() => {
  env.isTest = false;
});

afterEach(() => {
  env.isTest = REAL_IS_TEST;
  // Reset global state so suites and test files do not leak blocks into each other.
  for (const {ip} of getBlocklist()) unblockIP(ip);
});

describe("blocklist store", () => {
  it("blocks an IP for a custom duration and reason", () => {
    blockIP("203.0.113.9", {durationMs: 60_000, reason: "probe"});
    const entries = getBlocklist();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ip: "203.0.113.9", reason: "probe"});
  });

  it("applies sensible defaults when no options are given", () => {
    blockIP("203.0.113.10");
    const entry = getBlocklist()[0];
    expect(entry.reason).toBe("manual");
    expect(Date.parse(entry.until)).toBeGreaterThan(Date.now());
  });

  it("unblocks an IP and reports it as gone", () => {
    blockIP("203.0.113.11", {reason: "temporary"});
    expect(getBlocklist()).toHaveLength(1);
    unblockIP("203.0.113.11");
    expect(getBlocklist()).toHaveLength(0);
  });

  it("does not list expired entries", () => {
    blockIP("203.0.113.12", {durationMs: -1, reason: "already-expired"});
    expect(getBlocklist()).toHaveLength(0);
  });
});

describe("ipBlockGuard middleware", () => {
  it("rejects a blocked IP with the documented 403 contract", () => {
    blockIP("198.51.100.7", {reason: "attack"});
    const req = makeRequest("198.51.100.7");
    const res = makeResponse();
    const next = jest.fn();

    ipBlockGuard(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: {code: "FORBIDDEN", message: "Access denied"},
      }),
    );
  });

  it("lets an unknown IP straight through", () => {
    const req = makeRequest("198.51.100.8");
    const res = makeResponse();
    const next = jest.fn();

    ipBlockGuard(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("lets a freshly expired block through and forgets it", () => {
    blockIP("198.51.100.9", {durationMs: -1});
    const req = makeRequest("198.51.100.9");
    const res = makeResponse();
    const next = jest.fn();

    ipBlockGuard(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(getBlocklist()).toHaveLength(0);
  });

  it("passes every request through untouched in the test environment", () => {
    env.isTest = true;
    blockIP("198.51.100.10");

    const req = makeRequest("198.51.100.10");
    const res = makeResponse();
    const next = jest.fn();

    ipBlockGuard(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });
});