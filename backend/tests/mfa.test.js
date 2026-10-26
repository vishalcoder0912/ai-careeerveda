import {describe, it, expect, afterEach} from "vitest";
import request from "supertest";

import {createApp} from "../src/app.js";
import {env} from "../src/config/env.js";
import {Admin} from "../src/models/Admin.js";
import {codeAt, currentStep, decryptSecret, verifyCode} from "../src/services/totp.service.js";
import {createAdmin, login, TEST_PASSWORD} from "./helpers/auth.js";

const app = createApp();
const EMAIL = "super@careerveda.test";

const enrol = async () => {
  await createAdmin();
  const {accessToken} = await login(app);

  const setup = await request(app)
    .post("/api/v1/auth/mfa/setup")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({password: TEST_PASSWORD});
  expect(setup.status).toBe(200);
  const {secret} = setup.body.data;

  const enabled = await request(app)
    .post("/api/v1/auth/mfa/enable")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({code: codeAt(secret, currentStep())});
  expect(enabled.status).toBe(200);

  return {secret, oldToken: accessToken, newToken: enabled.body.data.accessToken};
};

describe("totp service", () => {
  it("matches the RFC 6238 SHA-1 test vector", () => {
    // RFC 6238 Appendix B: secret "12345678901234567890", T = 59s -> 94287082 (8 digits).
    const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
    expect(codeAt(secret, 1)).toBe("287082");
  });

  it("refuses a step at or before the last one used", () => {
    const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
    const step = currentStep();
    expect(verifyCode(secret, codeAt(secret, step))).toBe(step);
    expect(verifyCode(secret, codeAt(secret, step), {lastUsedStep: step})).toBeNull();
  });
});

describe("two-factor sign-in", () => {
  it("stores the secret encrypted, never in plain text", async () => {
    const {secret} = await enrol();
    const stored = await Admin.findOne({email: EMAIL}).select("+totpSecret").lean();
    expect(stored.totpSecret).not.toContain(secret);
    expect(decryptSecret(stored.totpSecret)).toBe(secret);
  });

  it("needs the password to start enrolment, so a stolen token cannot enrol a thief's phone", async () => {
    await createAdmin();
    const {accessToken} = await login(app);
    const response = await request(app)
      .post("/api/v1/auth/mfa/setup")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({password: "wrong-password-here-1"});
    expect(response.status).toBe(400);
  });

  it("ends the password-only sessions once enabled", async () => {
    const {oldToken} = await enrol();
    const me = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${oldToken}`);
    expect(me.status).toBe(401);
  });

  it("asks for a code after a correct password, and accepts a valid one exactly once", async () => {
    const {secret} = await enrol();

    const noCode = await login(app);
    expect(noCode.status).toBe(401);
    expect(noCode.response.body.error.code).toBe("MFA_REQUIRED");

    const code = codeAt(secret, currentStep() + 1);
    const ok = await request(app).post("/api/v1/auth/login").send({email: EMAIL, password: TEST_PASSWORD, totp: code});
    expect(ok.status).toBe(200);
    expect(ok.body.data.admin.mfaEnabled).toBe(true);

    const replay = await request(app).post("/api/v1/auth/login").send({email: EMAIL, password: TEST_PASSWORD, totp: code});
    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe("MFA_INVALID");
  });

  it("counts wrong codes toward the lockout", async () => {
    await enrol();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app).post("/api/v1/auth/login").send({email: EMAIL, password: TEST_PASSWORD, totp: "000000"});
    }
    expect((await Admin.findOne({email: EMAIL})).isLocked()).toBe(true);
  });

  it("does not ask for a code when the password is wrong", async () => {
    await enrol();
    const response = await login(app, {password: "wrong-password-here-1"});
    expect(response.response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("needs both the password and a code to turn it off", async () => {
    const {secret, newToken} = await enrol();
    const passwordOnly = await request(app)
      .post("/api/v1/auth/mfa/disable")
      .set("Authorization", `Bearer ${newToken}`)
      .send({password: TEST_PASSWORD, code: "000000"});
    expect(passwordOnly.status).toBe(400);

    const both = await request(app)
      .post("/api/v1/auth/mfa/disable")
      .set("Authorization", `Bearer ${newToken}`)
      .send({password: TEST_PASSWORD, code: codeAt(secret, currentStep() + 1)});
    expect(both.status).toBe(200);
    expect((await Admin.findOne({email: EMAIL})).totpEnabled).toBe(false);
  });
});

describe("mandatory two-factor", () => {
  afterEach(() => {
    env.requireAdminMfa = false;
  });

  it("keeps an unenrolled admin out of everything but /auth", async () => {
    env.requireAdminMfa = true;
    await createAdmin();
    const {accessToken, response} = await login(app);
    expect(response.body.data.admin.mfaRequired).toBe(true);

    const leads = await request(app).get("/api/v1/admin/leads").set("Authorization", `Bearer ${accessToken}`);
    expect(leads.status).toBe(403);
    expect(leads.body.error.code).toBe("MFA_ENROLLMENT_REQUIRED");

    const me = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${accessToken}`);
    expect(me.status).toBe(200);
  });

  it("lets an enrolled admin through", async () => {
    const {newToken} = await enrol();
    env.requireAdminMfa = true;
    const leads = await request(app).get("/api/v1/admin/leads").set("Authorization", `Bearer ${newToken}`);
    expect(leads.status).toBe(200);
  });
});
