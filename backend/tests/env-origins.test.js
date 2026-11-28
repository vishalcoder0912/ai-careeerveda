import {spawnSync} from "node:child_process";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {describe, expect, it} from "vitest";

// env.js validates at import time and exits on a bad config, so each case boots
// it in a fresh process with a controlled environment.
const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const boot = (overrides, code = "await import('./src/config/env.js')") =>
  spawnSync(process.execPath, ["--input-type=module", "-e", code], {
    cwd: backendRoot,
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      NODE_ENV: "production",
      MONGODB_URI: "mongodb://127.0.0.1:27017/test",
      JWT_ACCESS_SECRET: "a".repeat(32),
      JWT_REFRESH_SECRET: "b".repeat(32),
      FRONTEND_URL: "https://careerveda.in",
      ADMIN_URL: "https://admin.careerveda.in",
      CORS_ALLOWED_ORIGINS: "",
      COOKIE_SECURE: "true",
      TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
      ...overrides,
    },
  });

describe("allowed origins on a secure-cookie deploy", () => {
  it("boots with https domains only", () => {
    expect(boot({}).status).toBe(0);
  });

  it("allows the www form of each app URL", () => {
    const result = boot(
      {},
      "const {env} = await import('./src/config/env.js'); console.log(JSON.stringify(env.allowedOrigins));",
    );
    expect(result.status).toBe(0);
    const origins = JSON.parse(result.stdout.trim().split("\n").pop());
    expect(origins).toContain("https://www.careerveda.in");
    expect(origins).toContain("https://www.admin.careerveda.in");
  });

  it.each([
    ["FRONTEND_URL", "http://localhost:5173"],
    ["ADMIN_URL", "https://localhost:5174"],
    ["CORS_ALLOWED_ORIGINS", "http://careerveda.in"],
    ["CORS_ALLOWED_ORIGINS", "https://127.0.0.1:8443"],
  ])("refuses %s=%s", (key, value) => {
    const result = boot({[key]: value});
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(value);
  });

  it("refuses to boot without a Turnstile secret", () => {
    const result = boot({TURNSTILE_SECRET_KEY: ""});
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("TURNSTILE_SECRET_KEY");
  });

  it("boots without a Turnstile secret when TURNSTILE_DISABLED=true", () => {
    expect(boot({TURNSTILE_SECRET_KEY: "", TURNSTILE_DISABLED: "true"}).status).toBe(0);
  });

  it("still allows localhost when cookies are not secure (local Docker)", () => {
    expect(boot({COOKIE_SECURE: "false", FRONTEND_URL: "http://localhost:5173"}).status).toBe(0);
  });

  // Finding 5: a wrong hop count silently breaks every per-IP control, so a
  // typo must fail at boot instead of being handed to Express as a trust list.
  it("accepts a hop count and an explicit proxy list", () => {
    expect(boot({TRUST_PROXY: "2"}).status).toBe(0);
    expect(boot({TRUST_PROXY: "loopback, 10.0.0.0/8"}).status).toBe(0);
  });

  it("refuses an unrecognised TRUST_PROXY value", () => {
    const result = boot({TRUST_PROXY: "yes"});
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("TRUST_PROXY");
  });
});
