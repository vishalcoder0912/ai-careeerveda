import {beforeEach, describe, expect, it, jest} from "@jest/globals";
import jwt from "jsonwebtoken";

import {env} from "../../../src/config/env.js";
import {Admin} from "../../../src/models/Admin.js";
import {PERMISSIONS} from "../../../src/config/permissions.js";
import {signAccessToken} from "../../../src/services/token.service.js";
import {authenticate} from "../../../src/middleware/authenticate.js";
import {ApiError} from "../../../src/utils/apiError.js";

// Tokens are signed with the same secret the service reads (env.JWT_ACCESS_SECRET),
// so the tests exercise the real verify path. Only the database lookup is
// stubbed — everything after it (status, lock, token-version checks) runs for real.

const ISSUER = "careerveda-api";
const AUDIENCE = "careerveda-admin";

const adminFixture = (overrides = {}) => ({
  _id: "64b7f9d2e4b0a1b2c3d4e5f6",
  role: "editor",
  email: "editor@careerveda.in",
  tokenVersion: 0,
  status: "active",
  isLocked: () => false,
  // Mirrors the real model method (Admin.js): a token predating the account's
  // current version is stale.
  tokenIsStale: function tokenIsStale(tokenVersion) {
    return (tokenVersion || 0) !== (this.tokenVersion || 0);
  },
  ...overrides,
});

const makeContext = (authorization) => {
  const request = {get: jest.fn(() => authorization)};
  const next = jest.fn();
  return {request, next};
};

const run = async (authorization) => {
  const {request, next} = makeContext(authorization);
  await authenticate(request, {}, next);
  return {request, next};
};

const unauthorizedError = (next) => {
  expect(next).toHaveBeenCalledTimes(1);
  const error = next.mock.calls[0][0];
  expect(error).toBeInstanceOf(ApiError);
  expect(error.status).toBe(401);
  expect(error.code).toBe("UNAUTHORIZED");
  return error;
};

beforeEach(() => {
  jest.spyOn(Admin, "findById").mockResolvedValue(adminFixture());
});

describe("authenticate", () => {
  it("refuses a request with no Authorization header at all", async () => {
    const {next} = await run(undefined);

    expect(unauthorizedError(next).message).toMatch(/Authentication required/);
    expect(Admin.findById).not.toHaveBeenCalled();
  });

  it("refuses a header that is not a Bearer token", async () => {
    const {next} = await run("Basic dXNlcjpwYXNz");

    unauthorizedError(next);
  });

  it("refuses a Bearer prefix with nothing after it", async () => {
    const {next} = await run("Bearer   ");

    unauthorizedError(next);
  });

  it("refuses a token that was not signed with the access secret", async () => {
    const forged = jwt.sign({sub: "64b7f9d2e4b0a1b2c3d4e5f6"}, env.JWT_REFRESH_SECRET, {
      expiresIn: "15m",
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    const {next} = await run(`Bearer ${forged}`);

    expect(unauthorizedError(next).message).toMatch(/Invalid access token/);
  });

  it("refuses a tampered token", async () => {
    const valid = signAccessToken(adminFixture());
    const tampered = `${valid.slice(0, -4)}XXXX`;
    const {next} = await run(`Bearer ${tampered}`);

    expect(unauthorizedError(next).message).toMatch(/Invalid access token/);
  });

  it("tells the client an expired token must be refreshed, not re-logged-in", async () => {
    const expired = jwt.sign(
      {sub: "64b7f9d2e4b0a1b2c3d4e5f6", role: "editor", email: "editor@careerveda.in", tv: 0},
      env.JWT_ACCESS_SECRET,
      {expiresIn: -1, issuer: ISSUER, audience: AUDIENCE},
    );
    const {next} = await run(`Bearer ${expired}`);

    expect(unauthorizedError(next).message).toMatch(/Access token expired/);
    expect(Admin.findById).not.toHaveBeenCalled();
  });

  it("refuses a token whose account no longer exists", async () => {
    Admin.findById.mockResolvedValue(null);
    const {next} = await run(`Bearer ${signAccessToken(adminFixture())}`);

    expect(unauthorizedError(next).message).toMatch(/Invalid access token/);
  });

  it("refuses a suspended account even with a valid token", async () => {
    Admin.findById.mockResolvedValue(adminFixture({status: "suspended"}));
    const {next} = await run(`Bearer ${signAccessToken(adminFixture())}`);

    expect(unauthorizedError(next).message).toMatch(/Account is not active/);
  });

  it("stops honouring tokens for an account that is locked out", async () => {
    Admin.findById.mockResolvedValue(adminFixture({isLocked: () => true}));
    const {next} = await run(`Bearer ${signAccessToken(adminFixture())}`);

    expect(unauthorizedError(next).message).toMatch(/Account is temporarily locked/);
  });

  it("kills a token whose version predates the account's current one", async () => {
    // Token carries tv 0 (the fixture's tokenVersion), account now at 1.
    Admin.findById.mockResolvedValue(adminFixture({tokenVersion: 1}));
    const {next} = await run(`Bearer ${signAccessToken(adminFixture())}`);

    expect(unauthorizedError(next).message).toMatch(/Session ended/);
  });

  it("puts the loaded admin and its permissions on the request and continues", async () => {
    const {request, next} = await run(`Bearer ${signAccessToken(adminFixture())}`);

    expect(next).toHaveBeenCalledWith();
    expect(request.admin).toBeDefined();
    expect(request.permissions).toEqual(expect.arrayContaining([PERMISSIONS.BLOGS_MANAGE]));
  });

  it("resolves permissions from the database role, never from the token", async () => {
    // The token claims viewer; the database says editor. The request must see
    // the editor's grants, or a demotion would not take effect next request.
    const viewerClaimed = jwt.sign(
      {sub: "64b7f9d2e4b0a1b2c3d4e5f6", role: "viewer", email: "editor@careerveda.in", tv: 0},
      env.JWT_ACCESS_SECRET,
      {expiresIn: "15m", issuer: ISSUER, audience: AUDIENCE},
    );
    const {request} = await run(`Bearer ${viewerClaimed}`);

    expect(request.permissions).toContain(PERMISSIONS.PROGRAMS_CREATE);
  });

  it("passes a database failure to next rather than crashing the request", async () => {
    Admin.findById.mockRejectedValue(new Error("connection refused"));
    const {next} = await run(`Bearer ${signAccessToken(adminFixture())}`);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0].message).toBe("connection refused");
  });
});