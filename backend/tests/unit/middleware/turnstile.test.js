import {afterEach, describe, expect, it, jest} from "@jest/globals";

import {verifyTurnstile} from "../../../src/middleware/turnstile.js";
import {env} from "../../../src/config/env.js";

// siteverify is stubbed: the cases are what we do with each answer.

const originalFetch = globalThis.fetch;
const originalSecret = env.TURNSTILE_SECRET_KEY;

afterEach(() => {
  globalThis.fetch = originalFetch;
  env.TURNSTILE_SECRET_KEY = originalSecret;
});

const run = async (body, siteverify) => {
  env.TURNSTILE_SECRET_KEY = "secret";
  globalThis.fetch = jest.fn(siteverify || (async () => ({ok: true, json: async () => ({success: true})})));
  const next = jest.fn();
  await verifyTurnstile({body, ip: "203.0.113.9"}, {}, next);
  return next.mock.calls[0][0];
};

describe("verifyTurnstile", () => {
  it("passes a token Cloudflare accepts", async () => {
    expect(await run({turnstileToken: "ok"})).toBeUndefined();
    const sent = globalThis.fetch.mock.calls[0][1].body;
    expect(sent.get("response")).toBe("ok");
    expect(sent.get("remoteip")).toBe("203.0.113.9");
  });

  it.each([
    ["no token", {}],
    ["a non-string token", {turnstileToken: {$ne: ""}}],
    ["an oversized token", {turnstileToken: "x".repeat(2049)}],
  ])("refuses %s without calling Cloudflare", async (_, body) => {
    expect((await run(body)).code).toBe("CAPTCHA_FAILED");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("refuses a token Cloudflare rejects", async () => {
    const error = await run({turnstileToken: "bad"}, async () => ({
      ok: true,
      json: async () => ({success: false, "error-codes": ["invalid-input-response"]}),
    }));
    expect(error.code).toBe("CAPTCHA_FAILED");
  });

  it("fails closed when Cloudflare is unreachable", async () => {
    const error = await run({turnstileToken: "ok"}, async () => {
      throw new Error("timeout");
    });
    expect(error.status).toBe(503);
  });

  it("reports a Cloudflare 5xx as unavailable, not a failed captcha", async () => {
    const error = await run({turnstileToken: "ok"}, async () => ({
      ok: false,
      status: 502,
      json: async () => ({success: false}),
    }));
    expect(error.status).toBe(503);
  });

  it("is skipped when no secret is configured", async () => {
    env.TURNSTILE_SECRET_KEY = "";
    const next = jest.fn();
    await verifyTurnstile({body: {}}, {}, next);
    expect(next).toHaveBeenCalledWith();
  });
});
