// authenticate() has seven ways to say no and one way to say yes. The route
// suites only ever exercise the happy path and the missing-header path, so the
// other five — expired, malformed, deleted account, suspended, locked, stale
// token version — could each break silently and let a revoked session back in.

import {describe, it, expect, beforeEach} from "vitest";
import jwt from "jsonwebtoken";

import {authenticate} from "../src/middleware/authenticate.js";
import {Admin} from "../src/models/Admin.js";
import {signAccessToken} from "../src/services/token.service.js";
import {env} from "../src/config/env.js";
import {permissionsForRole, ROLES, PERMISSIONS} from "../src/config/permissions.js";

const ISSUER = "careerveda-api";
const AUDIENCE = "careerveda-admin";

const makeAdmin = (overrides = {}) =>
  Admin.create({
    name: "Editor",
    email: `editor-${Math.random().toString(36).slice(2)}@careerveda.test`,
    passwordHash: "argon2-hash",
    role: ROLES.EDITOR,
    ...overrides,
  });

// Runs the middleware and reports what it did: `error` for a refusal, `passed`
// for a call to next() with nothing.
const run = async (header) => {
  const request = {get: (name) => (name === "authorization" ? header : undefined)};
  let error = null;
  let passed = false;

  await authenticate(request, {}, (value) => {
    if (value) error = value;
    else passed = true;
  });

  return {request, error, passed};
};

const bearer = (token) => run(`Bearer ${token}`);

let admin;

beforeEach(async () => {
  admin = await makeAdmin();
});

describe("authenticate — the way through", () => {
  it("accepts a valid token and attaches the admin", async () => {
    const {request, error, passed} = await bearer(signAccessToken(admin));

    expect(error).toBeNull();
    expect(passed).toBe(true);
    expect(String(request.admin._id)).toBe(String(admin._id));
  });

  it("resolves permissions from the role in the database, never from the token", async () => {
    // A token minted while they were an editor, presented after a demotion.
    const token = signAccessToken(admin);
    await Admin.updateOne({_id: admin._id}, {$set: {role: ROLES.VIEWER}});

    const {request} = await bearer(token);

    expect(request.permissions).toEqual(permissionsForRole(ROLES.VIEWER));
    expect(request.permissions).not.toContain(PERMISSIONS.PROGRAMS_CREATE);
  });

  it("applies a promotion on the very next request too", async () => {
    const token = signAccessToken(admin);
    await Admin.updateOne({_id: admin._id}, {$set: {role: ROLES.SUPER_ADMIN}});

    const {request} = await bearer(token);

    expect(request.permissions).toContain(PERMISSIONS.CONTENT_PURGE);
  });

  it("loads a real document, so the caller can call its methods", async () => {
    const {request} = await bearer(signAccessToken(admin));

    expect(typeof request.admin.isLocked).toBe("function");
  });
});

describe("authenticate — no credential", () => {
  it("refuses a request with no Authorization header", async () => {
    const {error} = await run(undefined);

    expect(error).toMatchObject({status: 401, code: "UNAUTHORIZED"});
  });

  it("refuses a header that is not a Bearer one", async () => {
    const {error} = await run("Basic dXNlcjpwYXNz");

    expect(error.status).toBe(401);
  });

  it("refuses a Bearer header with nothing after it", async () => {
    expect((await run("Bearer ")).error.status).toBe(401);
    expect((await run("Bearer    ")).error.status).toBe(401);
  });

  it("is case-sensitive about the scheme, so 'bearer x' is not a credential", async () => {
    expect((await run("bearer abc")).error.status).toBe(401);
  });
});

describe("authenticate — bad token", () => {
  it("distinguishes an expired token, so the SPA refreshes instead of bouncing to login", async () => {
    const expired = jwt.sign(
      {sub: String(admin._id), tv: 0},
      env.JWT_ACCESS_SECRET,
      {expiresIn: "-1s", issuer: ISSUER, audience: AUDIENCE},
    );

    const {error} = await bearer(expired);

    expect(error.status).toBe(401);
    expect(error.message).toMatch(/expired/i);
  });

  it("refuses a token that is not a JWT at all", async () => {
    const {error} = await bearer("not-a-token");

    expect(error.message).toMatch(/invalid/i);
  });

  it("refuses a token signed with the wrong secret", async () => {
    const forged = jwt.sign({sub: String(admin._id), tv: 0}, "a-different-secret-entirely-0123456789", {
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    expect((await bearer(forged)).error.message).toMatch(/invalid/i);
  });

  it("refuses a token with the wrong issuer or audience", async () => {
    const wrongIssuer = jwt.sign({sub: String(admin._id), tv: 0}, env.JWT_ACCESS_SECRET, {
      issuer: "somewhere-else",
      audience: AUDIENCE,
    });
    const wrongAudience = jwt.sign({sub: String(admin._id), tv: 0}, env.JWT_ACCESS_SECRET, {
      issuer: ISSUER,
      audience: "some-other-app",
    });

    expect((await bearer(wrongIssuer)).error.status).toBe(401);
    expect((await bearer(wrongAudience)).error.status).toBe(401);
  });

  it("refuses an alg:none token — the classic JWT confusion attack", async () => {
    const header = Buffer.from(JSON.stringify({alg: "none", typ: "JWT"})).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({sub: String(admin._id), tv: 0, iss: ISSUER, aud: AUDIENCE}),
    ).toString("base64url");

    expect((await bearer(`${header}.${payload}.`)).error.status).toBe(401);
  });

  it("never leaks why a token was rejected beyond expired-vs-invalid", async () => {
    const {error} = await bearer("garbage.garbage.garbage");

    expect(error.message).toBe("Invalid access token");
  });
});

describe("authenticate — the account behind the token", () => {
  it("refuses a token whose account has since been deleted", async () => {
    const token = signAccessToken(admin);
    await Admin.deleteOne({_id: admin._id});

    const {error} = await bearer(token);

    expect(error.status).toBe(401);
    // Deliberately the same message as a bad token: whether the account existed
    // is not something an unauthenticated caller gets to learn.
    expect(error.message).toBe("Invalid access token");
  });

  it("refuses a suspended account immediately, not when its token expires", async () => {
    const token = signAccessToken(admin);
    await Admin.updateOne({_id: admin._id}, {$set: {status: "suspended"}});

    const {error} = await bearer(token);

    expect(error.status).toBe(401);
    expect(error.message).toMatch(/not active/i);
  });

  it("refuses an account locked mid-session, so lockout is not only about the login form", async () => {
    const token = signAccessToken(admin);
    await Admin.updateOne({_id: admin._id}, {$set: {lockedUntil: new Date(Date.now() + 60_000)}});

    const {error} = await bearer(token);

    expect(error.message).toMatch(/locked/i);
  });

  it("accepts an account whose lock has since expired", async () => {
    const token = signAccessToken(admin);
    await Admin.updateOne({_id: admin._id}, {$set: {lockedUntil: new Date(Date.now() - 1000)}});

    expect((await bearer(token)).passed).toBe(true);
  });

  it("refuses a token whose version no longer matches — this is what a password change revokes", async () => {
    const token = signAccessToken(admin);
    await Admin.updateOne({_id: admin._id}, {$inc: {tokenVersion: 1}});

    const {error} = await bearer(token);

    expect(error.status).toBe(401);
    expect(error.message).toMatch(/sign in again/i);
  });

  it("accepts the replacement token issued alongside that same change", async () => {
    await Admin.updateOne({_id: admin._id}, {$inc: {tokenVersion: 1}});
    const refreshed = await Admin.findById(admin._id);

    expect((await bearer(signAccessToken(refreshed))).passed).toBe(true);
  });

  it("treats a token predating the tokenVersion field as version 0", async () => {
    const legacy = jwt.sign({sub: String(admin._id)}, env.JWT_ACCESS_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
      expiresIn: "5m",
    });

    expect((await bearer(legacy)).passed).toBe(true);
  });

  it("checks status before the lock, so a suspended AND locked account reports suspension", async () => {
    const token = signAccessToken(admin);
    await Admin.updateOne(
      {_id: admin._id},
      {$set: {status: "suspended", lockedUntil: new Date(Date.now() + 60_000)}},
    );

    expect((await bearer(token)).error.message).toMatch(/not active/i);
  });

  it("never attaches an admin to the request when it refuses", async () => {
    const token = signAccessToken(admin);
    await Admin.updateOne({_id: admin._id}, {$set: {status: "suspended"}});

    const {request} = await bearer(token);

    expect(request.admin).toBeUndefined();
    expect(request.permissions).toBeUndefined();
  });
});

describe("authenticate — unexpected failures", () => {
  it("hands an unexpected throw to next() rather than leaving the request hanging", async () => {
    const request = {
      get: () => {
        throw new TypeError("header lookup blew up");
      },
    };
    let error = null;

    await authenticate(request, {}, (value) => {
      error = value;
    });

    expect(error).toBeInstanceOf(TypeError);
  });
});
