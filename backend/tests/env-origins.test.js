import {spawnSync} from "node:child_process";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {describe, expect, it} from "vitest";

// env.js validates at import time and exits on a bad config, so each case boots
// it in a fresh process with a controlled environment.
const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const boot = (overrides) =>
  spawnSync(process.execPath, ["--input-type=module", "-e", "await import('./src/config/env.js')"], {
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
});
