import {describe, it, expect} from "vitest";
import request from "supertest";

import {createApp} from "../src/app.js";
import {Admin} from "../src/models/Admin.js";
import {RefreshToken} from "../src/models/RefreshToken.js";
import {AuditLog, AUDIT_ACTIONS} from "../src/models/AuditLog.js";
import {createAdmin, login, TEST_PASSWORD, refreshCookieValue} from "./helpers/auth.js";

const app = createApp();

describe("login", () => {
  it("issues an access token, a refresh cookie and a CSRF token", async () => {
    await createAdmin();
    const {status, response, accessToken, csrfToken, cookies} = await login(app);

    expect(status).toBe(200);
    expect(accessToken).toEqual(expect.any(String));
    expect(csrfToken).toEqual(expect.any(String));
    expect(response.body.data.admin.role).toBe("super-admin");

    const refreshCookie = cookies.find((cookie) => cookie.startsWith("cv_refresh="));
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain("HttpOnly");
    expect(refreshCookie).toContain("Path=/api/v1/auth");
  });

  it("never returns the password hash", async () => {
    await createAdmin();
    const {response} = await login(app);

    expect(JSON.stringify(response.body)).not.toContain("argon2");
    expect(response.body.data.admin.passwordHash).toBeUndefined();
  });

  it("rejects a wrong password", async () => {
    await createAdmin();
    const {status, response} = await login(app, {password: "wrong-password-here-1"});

    expect(status).toBe(401);
    expect(response.body.error.message).toBe("Invalid email or password.");
  });

  it("gives the identical message for an unknown account, so emails cannot be enumerated", async () => {
    await createAdmin();
    const unknown = await login(app, {email: "nobody@careerveda.test"});
    const wrongPassword = await login(app, {password: "wrong-password-here-1"});

    expect(unknown.response.body.error.message).toBe(wrongPassword.response.body.error.message);
    expect(unknown.status).toBe(wrongPassword.status);
  });

  it("refuses a suspended account", async () => {
    await createAdmin({status: "suspended"});
    const {status} = await login(app);

    expect(status).toBe(401);
  });

  it("rejects a NoSQL operator in place of the email", async () => {
    await createAdmin();
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({email: {$ne: null}, password: {$ne: null}});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("records a successful login in the audit trail", async () => {
    await createAdmin();
    await login(app);

    const entry = await AuditLog.findOne({action: AUDIT_ACTIONS.LOGIN_SUCCESS});
    expect(entry).not.toBeNull();
    expect(entry.actorEmail).toBe("super@careerveda.test");
  });

  it("records failed logins as failures", async () => {
    await createAdmin();
    await login(app, {password: "wrong-password-here-1"});

    const entry = await AuditLog.findOne({action: AUDIT_ACTIONS.LOGIN_FAILED});
    expect(entry.outcome).toBe("failure");
  });
});

describe("account lockout", () => {
  it("locks the account after repeated failures and then refuses the correct password", async () => {
    await createAdmin();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await login(app, {password: "wrong-password-here-1"});
    }

    const locked = await login(app);
    expect(locked.status).toBe(423);
    expect(locked.response.body.error.code).toBe("ACCOUNT_LOCKED");

    const admin = await Admin.findOne({email: "super@careerveda.test"});
    expect(admin.failedLoginAttempts).toBeGreaterThanOrEqual(5);
    expect(admin.isLocked()).toBe(true);
  });

  it("clears the failure count on a successful login", async () => {
    await createAdmin();
    await login(app, {password: "wrong-password-here-1"});
    await login(app);

    const admin = await Admin.findOne({email: "super@careerveda.test"});
    expect(admin.failedLoginAttempts).toBe(0);
    expect(admin.lockedUntil).toBeNull();
  });
});

describe("access token handling", () => {
  it("returns the current admin for a valid bearer token", async () => {
    await createAdmin();
    const {accessToken} = await login(app);

    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.admin.email).toBe("super@careerveda.test");
    expect(response.body.data.admin.permissions).toContain("users.manage");
  });

  it("refuses a request with no token", async () => {
    const response = await request(app).get("/api/v1/auth/me");

    expect(response.status).toBe(401);
  });

  it("refuses a malformed token", async () => {
    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer not.a.jwt");

    expect(response.status).toBe(401);
  });

  it("refuses a token signed with the wrong secret", async () => {
    const jwt = (await import("jsonwebtoken")).default;
    const admin = await createAdmin();
    const forged = jwt.sign({sub: String(admin._id), role: "super-admin"}, "attacker-secret", {
      issuer: "careerveda-api",
      audience: "careerveda-admin",
      expiresIn: "15m",
    });

    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${forged}`);

    expect(response.status).toBe(401);
  });

  it("refuses an alg:none token", async () => {
    const admin = await createAdmin();
    const header = Buffer.from(JSON.stringify({alg: "none", typ: "JWT"})).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({sub: String(admin._id), role: "super-admin", iss: "careerveda-api", aud: "careerveda-admin"}),
    ).toString("base64url");

    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${header}.${payload}.`);

    expect(response.status).toBe(401);
  });

  it("stops honouring a token once the account is suspended", async () => {
    const admin = await createAdmin();
    const {accessToken} = await login(app);

    admin.status = "suspended";
    await admin.save();

    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(401);
  });
});

describe("refresh rotation", () => {
  it("exchanges a refresh cookie for a new access token and a new cookie", async () => {
    await createAdmin();
    const first = await login(app);

    const response = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", first.cookieHeader)
      .set("X-CSRF-Token", first.csrfToken);

    expect(response.status).toBe(200);
    expect(response.body.data.accessToken).toEqual(expect.any(String));

    const rotated = refreshCookieValue(response.headers["set-cookie"]);
    expect(rotated).not.toBe(refreshCookieValue(first.cookies));
  });

  it("keeps the rotated token in the same family", async () => {
    await createAdmin();
    const first = await login(app);

    await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", first.cookieHeader)
      .set("X-CSRF-Token", first.csrfToken);

    const families = await RefreshToken.distinct("family");
    expect(families).toHaveLength(1);
  });

  it("detects reuse of an already-rotated token and revokes the whole family", async () => {
    await createAdmin();
    const first = await login(app);

    // Legitimate rotation.
    const rotated = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", first.cookieHeader)
      .set("X-CSRF-Token", first.csrfToken);
    expect(rotated.status).toBe(200);

    // The attacker replays the original, already-consumed token.
    const replay = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", first.cookieHeader)
      .set("X-CSRF-Token", first.csrfToken);

    expect(replay.status).toBe(401);

    // And the legitimate user's freshly-rotated token is dead too, because we
    // cannot tell which party is which.
    const rotatedCookies = (rotated.headers["set-cookie"] || [])
      .map((cookie) => cookie.split(";")[0])
      .join("; ");
    const rotatedCsrf = rotated.body.data.csrfToken;

    const afterBurn = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", rotatedCookies)
      .set("X-CSRF-Token", rotatedCsrf);

    expect(afterBurn.status).toBe(401);

    const live = await RefreshToken.countDocuments({revokedAt: null});
    expect(live).toBe(0);
  });

  it("audits a detected reuse", async () => {
    await createAdmin();
    const first = await login(app);

    await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", first.cookieHeader)
      .set("X-CSRF-Token", first.csrfToken);
    await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", first.cookieHeader)
      .set("X-CSRF-Token", first.csrfToken);

    const entry = await AuditLog.findOne({action: AUDIT_ACTIONS.TOKEN_REUSE_DETECTED});
    expect(entry).not.toBeNull();
  });

  it("refuses a refresh with no cookie", async () => {
    const csrf = "abcdefghijklmnopqrstuvwxyz123456";
    const response = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", `cv_csrf=${csrf}`)
      .set("X-CSRF-Token", csrf);

    expect(response.status).toBe(401);
  });

  it("refuses a forged refresh token", async () => {
    await createAdmin();
    const first = await login(app);

    const response = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", `cv_refresh=forged-token-value; cv_csrf=${first.csrfToken}`)
      .set("X-CSRF-Token", first.csrfToken);

    expect(response.status).toBe(401);
  });
});

describe("CSRF protection on cookie endpoints", () => {
  it("refuses a refresh with a valid cookie but no CSRF header", async () => {
    await createAdmin();
    const first = await login(app);

    const response = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", first.cookieHeader);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("refuses a refresh when the CSRF header does not match the cookie", async () => {
    await createAdmin();
    const first = await login(app);

    const response = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", first.cookieHeader)
      .set("X-CSRF-Token", "a".repeat(43));

    expect(response.status).toBe(403);
  });

  // The guard is mounted app-wide rather than per route, so these two pin the
  // edges: it must not start demanding a header from a browser that has no
  // session yet, and it must not let a cookie-authenticated write through.
  it("still lets a cookie-carrying browser log in again without a CSRF header", async () => {
    await createAdmin();
    const first = await login(app);

    const response = await request(app)
      .post("/api/v1/auth/login")
      .set("Cookie", first.cookieHeader)
      .send({email: "super@careerveda.test", password: TEST_PASSWORD});

    expect(response.status).toBe(200);
  });

  it("refuses any state change made with the refresh cookie and no header", async () => {
    await createAdmin();
    const first = await login(app);

    const response = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", first.cookieHeader);

    expect(response.status).toBe(403);
  });
});

describe("logout", () => {
  it("revokes the session family and clears the cookies", async () => {
    await createAdmin();
    const first = await login(app);

    const response = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", first.cookieHeader)
      .set("X-CSRF-Token", first.csrfToken);

    expect(response.status).toBe(200);

    const live = await RefreshToken.countDocuments({revokedAt: null});
    expect(live).toBe(0);

    const afterLogout = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", first.cookieHeader)
      .set("X-CSRF-Token", first.csrfToken);

    expect(afterLogout.status).toBe(401);
  });
});

describe("change password", () => {
  it("changes the password and ends every other session", async () => {
    await createAdmin();
    const first = await login(app);
    const other = await login(app);

    const response = await request(app)
      .post("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${first.accessToken}`)
      .send({currentPassword: TEST_PASSWORD, newPassword: "a-brand-new-passphrase-9"});

    expect(response.status).toBe(200);

    // The other device's refresh token is dead.
    const stale = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", other.cookieHeader)
      .set("X-CSRF-Token", other.csrfToken);
    expect(stale.status).toBe(401);

    // And so is its access token, because it predates passwordChangedAt.
    const staleAccess = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${other.accessToken}`);
    expect(staleAccess.status).toBe(401);
  });

  it("refuses when the current password is wrong", async () => {
    await createAdmin();
    const {accessToken} = await login(app);

    const response = await request(app)
      .post("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({currentPassword: "not-the-password-1", newPassword: "a-brand-new-passphrase-9"});

    expect(response.status).toBe(400);
  });

  it("refuses a weak new password", async () => {
    await createAdmin();
    const {accessToken} = await login(app);

    const response = await request(app)
      .post("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({currentPassword: TEST_PASSWORD, newPassword: "short"});

    expect(response.status).toBe(400);
    expect(response.body.error.fields.newPassword).toContain("12 characters");
  });

  it("refuses reusing the previous password", async () => {
    await createAdmin();
    const {accessToken} = await login(app);

    await request(app)
      .post("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({currentPassword: TEST_PASSWORD, newPassword: "a-brand-new-passphrase-9"});

    const fresh = await login(app, {password: "a-brand-new-passphrase-9"});

    const response = await request(app)
      .post("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${fresh.accessToken}`)
      .send({currentPassword: "a-brand-new-passphrase-9", newPassword: TEST_PASSWORD});

    expect(response.status).toBe(400);
  });
});

// Self-service password reset was removed deliberately: no mail provider was
// ever wired up, so the endpoints minted account-takeover tokens that only
// reached a log file. Recovery is out of band, via
// `npm --prefix backend run seed:admin -- --reset`. These assert the routes
// stay gone.
describe("password reset is not exposed", () => {
  it.each(["/api/v1/auth/forgot-password", "/api/v1/auth/reset-password"])(
    "returns 404 for %s",
    async (path) => {
      await createAdmin();

      const response = await request(app)
        .post(path)
        .send({email: "super@careerveda.test", token: "x".repeat(32), password: "irrelevant-1"});

      expect(response.status).toBe(404);
    },
  );
});

describe("sessions", () => {
  it("lists the caller's own live sessions without exposing token hashes", async () => {
    await createAdmin();
    const first = await login(app);
    await login(app);

    const response = await request(app)
      .get("/api/v1/auth/sessions")
      .set("Authorization", `Bearer ${first.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(JSON.stringify(response.body)).not.toContain("tokenHash");
  });

  it("refuses to revoke another admin's session (IDOR)", async () => {
    await createAdmin();
    await createAdmin({email: "victim@careerveda.test", name: "Victim"});

    const attacker = await login(app);
    const victim = await login(app, {email: "victim@careerveda.test"});

    const victimSession = await RefreshToken.findOne({
      admin: (await Admin.findOne({email: "victim@careerveda.test"}))._id,
    });

    const response = await request(app)
      .delete(`/api/v1/auth/sessions/${victimSession._id}`)
      .set("Authorization", `Bearer ${attacker.accessToken}`);

    expect(response.status).toBe(404);

    // The victim's session still works.
    const stillValid = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", victim.cookieHeader)
      .set("X-CSRF-Token", victim.csrfToken);
    expect(stillValid.status).toBe(200);
  });
});

describe("audit log immutability", () => {
  it("refuses to update an entry", async () => {
    await createAdmin();
    await login(app);

    const entry = await AuditLog.findOne({});
    entry.action = "tampered";

    await expect(entry.save()).rejects.toThrow(/immutable/);
    await expect(AuditLog.updateOne({_id: entry._id}, {$set: {action: "x"}})).rejects.toThrow(
      /immutable/,
    );
    await expect(AuditLog.deleteOne({_id: entry._id})).rejects.toThrow(/immutable/);
  });
});
