import {describe, expect, it, jest} from "@jest/globals";

import {requestId} from "../../src/middleware/requestId.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const contextOf = (inbound) => {
  const request = {get: jest.fn(() => inbound)};
  const response = {locals: {}, setHeader: jest.fn()};
  const next = jest.fn();

  requestId(request, response, next);
  return {request, response, next};
};

describe("requestId", () => {
  it("mints a UUID when no id arrives with the request", () => {
    const {request} = contextOf(undefined);

    expect(request.id).toMatch(UUID);
  });

  it("puts the same id on the request, res.locals and the response header", () => {
    const {request, response} = contextOf(undefined);

    expect(response.locals.requestId).toBe(request.id);
    expect(response.setHeader).toHaveBeenCalledWith("X-Request-Id", request.id);
  });

  it("always continues the chain", () => {
    const {next} = contextOf(undefined);

    expect(next).toHaveBeenCalledWith();
  });

  it("honours an inbound id so a trace survives a proxy hop", () => {
    const {request} = contextOf("trace-abc_123");

    expect(request.id).toBe("trace-abc_123");
  });

  it("gives each request its own id", () => {
    expect(contextOf(undefined).request.id).not.toBe(contextOf(undefined).request.id);
  });

  it.each([
    ["a header-injection attempt", "abc\r\nX-Admin: true"],
    ["a value with a space", "abc def"],
    ["a value with a semicolon", "abc;def"],
    ["an empty string", ""],
    ["65 characters, one past the cap", "a".repeat(65)],
  ])("rejects %s and mints its own instead", (_label, inbound) => {
    const {request} = contextOf(inbound);

    expect(request.id).toMatch(UUID);
  });

  it("accepts the boundary case of exactly 64 safe characters", () => {
    const inbound = "a".repeat(64);

    expect(contextOf(inbound).request.id).toBe(inbound);
  });

  it("reads the header case-insensitively, the way Express delivers it", () => {
    const request = {get: jest.fn(() => "from-proxy")};
    requestId(request, {locals: {}, setHeader: () => {}}, () => {});

    expect(request.get).toHaveBeenCalledWith("x-request-id");
  });
});
