import {describe, expect, it} from "@jest/globals";
import {
  ApiError,
  badRequest,
  conflict,
  forbidden,
  notFound,
  serviceUnavailable,
  tooManyRequests,
  unauthorized,
} from "../../src/utils/apiError.js";

// `code` is the contract the admin panel switches on; `message` is prose that may
// be reworded freely. These tests pin the codes and statuses and deliberately do
// not assert exact default wording beyond it being present.

describe("ApiError", () => {
  it("is a real Error, so it survives throw/catch and stack capture", () => {
    const error = new ApiError(400, "X", "boom");

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.name).toBe("ApiError");
    expect(error.message).toBe("boom");
    expect(typeof error.stack).toBe("string");
  });

  it("carries status, code and optional field map", () => {
    const fields = {title: "Title is required"};
    const error = new ApiError(422, "VALIDATION_ERROR", "bad", {fields});

    expect(error.status).toBe(422);
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.fields).toBe(fields);
  });

  it("attaches a cause only when one is given", () => {
    const root = new Error("underlying");

    expect(new ApiError(500, "X", "m", {cause: root}).cause).toBe(root);
    expect("cause" in new ApiError(500, "X", "m")).toBe(false);
  });

  it("defaults its options, so it can be constructed with three arguments", () => {
    const error = new ApiError(500, "X", "m");

    expect(error.fields).toBeUndefined();
  });
});

describe("error factories", () => {
  // status, code, factory — the table is the contract.
  const cases = [
    [badRequest, 400, "VALIDATION_ERROR"],
    [unauthorized, 401, "UNAUTHORIZED"],
    [forbidden, 403, "FORBIDDEN"],
    [notFound, 404, "NOT_FOUND"],
    [conflict, 409, "CONFLICT"],
    [tooManyRequests, 429, "RATE_LIMITED"],
    [serviceUnavailable, 503, "SERVICE_UNAVAILABLE"],
  ];

  it.each(cases)("%p produces status %i with code %s", (factory, status, code) => {
    const error = factory();

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(status);
    expect(error.code).toBe(code);
  });

  it.each(cases)("%p falls back to a non-empty default message", (factory) => {
    expect(factory().message.length).toBeGreaterThan(0);
  });

  it.each(cases)("%p uses the caller's message when given one", (factory) => {
    expect(factory("custom wording").message).toBe("custom wording");
  });

  it("distinguishes 401 from 403 — the panel refreshes on one and warns on the other", () => {
    expect(unauthorized().status).toBe(401);
    expect(forbidden().status).toBe(403);
    expect(unauthorized().code).not.toBe(forbidden().code);
  });

  it("carries a field map on the two errors that can name an offending input", () => {
    const fields = {slug: "already taken"};

    expect(badRequest("bad", fields).fields).toBe(fields);
    expect(conflict("taken", fields).fields).toBe(fields);
  });
});
