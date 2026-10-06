import {afterEach, beforeEach, describe, expect, it, jest} from "@jest/globals";

import {env} from "../../../src/config/env.js";
import {getBlocklist, unblockIP} from "../../../src/middleware/ipBlocklist.js";
import {anomalyDetector} from "../../../src/middleware/anomalyDetector.js";

const makeRequest = (overrides = {}) => ({
  ip: "203.0.113.77",
  id: "req-1",
  path: "/api/v1/public/programs",
  originalUrl: "/api/v1/public/programs",
  method: "GET",
  query: {},
  body: undefined,
  headers: {"user-agent": "Mozilla/5.0", accept: "text/html"},
  ...overrides,
});

const makeResponse = () => {
  const res = {
    statusCode: 200,
    setHeader: jest.fn().mockReturnThis(),
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
  for (const {ip} of getBlocklist()) unblockIP(ip);
});

describe("anomalyDetector — pass-through", () => {
  it("lets an ordinary navigation request through untouched", () => {
    const req = makeRequest();
    const res = makeResponse();
    const next = jest.fn();

    anomalyDetector(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(res.setHeader).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("passes everything through in the test environment so suites never trip it", () => {
    env.isTest = true;
    const req = makeRequest({path: "/.env"});
    const res = makeResponse();
    const next = jest.fn();

    anomalyDetector(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });
});

describe("anomalyDetector — probe responses", () => {
  it("answers 404 for a known vulnerability-scanner path and tags it", () => {
    const req = makeRequest({path: "/.env"});
    const res = makeResponse();
    const next = jest.fn();

    anomalyDetector(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({success: false, error: {code: "NOT_FOUND", message: "Not found"}}),
    );
    expect(res.setHeader).toHaveBeenCalledWith("X-Security-Flag", "path-probe");
  });

  it("answers 404 for traversal attempts", () => {
    const req = makeRequest({path: "/api/v1/../../etc/passwd"});
    const res = makeResponse();
    const next = jest.fn();

    anomalyDetector(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("answers 400 when the request path exceeds the permitted depth", () => {
    const req = makeRequest({path: "/a/b/c/d/e/f/g/h/i/j/k"});
    const res = makeResponse();
    const next = jest.fn();

    anomalyDetector(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.setHeader).toHaveBeenCalledWith("X-Security-Flag", "depth-exceeded");
  });

  it("answers 414 for an oversized URL", () => {
    const req = makeRequest({originalUrl: `/api/v1/programs?q=${"a".repeat(3000)}`});
    const res = makeResponse();
    const next = jest.fn();

    anomalyDetector(req, res, next);

    expect(res.status).toHaveBeenCalledWith(414);
    expect(res.setHeader).toHaveBeenCalledWith("X-Security-Flag", "url-oversized");
  });

  it("answers 400 for SQL injection markers in the query string", () => {
    const req = makeRequest({query: {q: "x' OR 1=1 --"}});
    const res = makeResponse();
    const next = jest.fn();

    anomalyDetector(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.setHeader).toHaveBeenCalledWith("X-Security-Flag", "sqli-attempt");
  });

  it("answers 400 for SQL injection markers in the body", () => {
    const req = makeRequest({body: {comment: "x; drop table users"}});
    const res = makeResponse();
    const next = jest.fn();

    anomalyDetector(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("answers 405 for TRACE, TRACK and CONNECT", () => {
    for (const method of ["TRACE", "TRACK", "CONNECT"]) {
      const req = makeRequest({method});
      const res = makeResponse();
      const next = jest.fn();

      anomalyDetector(req, res, next);

      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: {code: "METHOD_NOT_ALLOWED", message: `${method} is not allowed`},
        }),
      );
    }
  });
});

describe("anomalyDetector — warnings that still serve the request", () => {
  it("tags but serves an oversized User-Agent", () => {
    const req = makeRequest({headers: {"user-agent": "A".repeat(600), accept: "text/html"}});
    const res = makeResponse();
    const next = jest.fn();

    anomalyDetector(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith("X-Security-Flag", "ua-oversized");
    expect(next).toHaveBeenCalledWith();
  });

  it("tags but serves a browser request with no User-Agent", () => {
    const req = makeRequest({headers: {accept: "text/html"}});
    const res = makeResponse();
    const next = jest.fn();

    anomalyDetector(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith("X-Security-Flag", "no-ua");
    expect(next).toHaveBeenCalledWith();
  });
});

describe("anomalyDetector — request frequency escalation", () => {
  it("flags an IP once it exceeds the per-window budget", () => {
    const res = makeResponse();
    const next = jest.fn();
    for (let hit = 0; hit < 500; hit += 1) {
      anomalyDetector(makeRequest({ip: "198.51.100.30"}), makeResponse(), jest.fn());
    }
    anomalyDetector(makeRequest({ip: "198.51.100.30"}), res, next);

    expect(res.setHeader).toHaveBeenCalledWith("X-Security-Flag", "rate-exceeded");
    expect(next).toHaveBeenCalledWith();
  });

  it("escalates a repeat offender to the IP blocklist", () => {
    for (let hit = 0; hit <= 1000; hit += 1) {
      anomalyDetector(makeRequest({ip: "198.51.100.31"}), makeResponse(), jest.fn());
    }

    const blocked = getBlocklist().find((entry) => entry.ip === "198.51.100.31");
    expect(blocked).toBeDefined();
    expect(blocked.reason).toBe("anomaly-threshold-exceeded");
  });
});