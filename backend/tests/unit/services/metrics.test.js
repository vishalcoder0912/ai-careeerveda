import {EventEmitter} from "node:events";

import {describe, expect, it, jest} from "@jest/globals";

import {getMetricsSnapshot, metricsMiddleware} from "../../../src/services/metrics.js";

// metrics.js owns one module-level store, so assertions compare the snapshot
// before and after each action rather than expecting absolute values — that
// keeps every test independent of whatever previous tests recorded.

const emitFinish = (path, statusCode, ip = "203.0.113.50") => {
  const res = new EventEmitter();
  res.statusCode = statusCode;
  const next = jest.fn();
  metricsMiddleware({path, ip}, res, next);
  res.emit("finish");
  return {next, res};
};

describe("metricsMiddleware", () => {
  it("counts a finished request against its path", () => {
    const path = "/api/v1/public/metrics-probe";
    const before = getMetricsSnapshot();
    emitFinish(path, 200);
    const after = getMetricsSnapshot();
    expect(after.totalRequests).toBe(before.totalRequests + 1);
    expect(after.requests[path].count).toBe((before.requests[path]?.count || 0) + 1);
  });

  it("records 4xx and 5xx failures separately from successes", () => {
    const path = "/api/v1/public/failure-probe";
    const before = getMetricsSnapshot();
    emitFinish(path, 501);
    emitFinish(path, 401);
    const after = getMetricsSnapshot();
    expect(after.errors[path]["5xx"]).toBe((before.errors[path]?.["5xx"] || 0) + 1);
    expect(after.errors[path]["4xx"]).toBe((before.errors[path]?.["4xx"] || 0) + 1);
  });

  it("tracks per-IP 429 hits and ranks the worst offenders", () => {
    const path = "/api/v1/public/limits-probe";
    for (let hit = 0; hit < 3; hit += 1) emitFinish(path, 429, "198.51.100.21");
    emitFinish(path, 429, "198.51.100.22");

    const top = getMetricsSnapshot().topRateLimitedIPs;
    const offender = top.find((entry) => entry.ip === "198.51.100.21");
    expect(offender).toEqual({ip: "198.51.100.21", count: 3});
    const justOnce = top.find((entry) => entry.ip === "198.51.100.22");
    expect(justOnce).toEqual({ip: "198.51.100.22", count: 1});
  });

  it("surfaces the snapshot shape the monitoring endpoint expects", () => {
    const snapshot = getMetricsSnapshot();
    expect(snapshot.uptimeSeconds).toEqual(expect.any(Number));
    expect(snapshot.totalRequests).toEqual(expect.any(Number));
    expect(typeof snapshot.requests).toBe("object");
    expect(typeof snapshot.errors).toBe("object");
    expect(Array.isArray(snapshot.topRateLimitedIPs)).toBe(true);
    expect(snapshot.memoryUsageMB).toEqual(expect.any(Number));
    expect(snapshot.cpuUserSeconds).toEqual(expect.any(Number));
  });

  it("does not wait for the response to move the request on", () => {
    const res = new EventEmitter();
    const next = jest.fn();
    metricsMiddleware({path: "/health", ip: "203.0.113.51"}, res, next);
    expect(next).toHaveBeenCalledWith();
  });
});