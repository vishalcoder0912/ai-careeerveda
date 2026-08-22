import {beforeEach, describe, expect, it, jest} from "@jest/globals";
import jwt from "jsonwebtoken";

import {env} from "../../../src/config/env.js";
import {RefreshToken} from "../../../src/models/RefreshToken.js";
import {
  ROTATION_OUTCOME,
  hashRefreshToken,
  ipPrefixOf,
  issueRefreshToken,
  revokeAllForAdmin,
  revokeFamily,
  rotateRefreshToken,
  signAccessToken,
  verifyAccessToken,
} from "../../../src/services/token.service.js";

// Only the database seams are stubbed (RefreshToken.create/findOne/updateMany).
// Signing and verifying run against the real secret from env.js, so the round
// trip and every rejection below are the production code's own behaviour.

const ISSUER = "careerveda-api";
const AUDIENCE = "careerveda-admin";

const adminFixture = (overrides = {}) => ({
  _id: "64b7f9d2e4b0a1b2c3d4e5f6",
  role: "super-admin",
  email: "boss@careerveda.in",
  tokenVersion: 2,
  ...overrides,
});

const refreshDoc = (overrides = {}) => ({
  family: "family-1",
  admin: "64b7f9d2e4b0a1b2c3d4e5f6",
  expiresAt: new Date(Date.now() + 60 * 1000),
  usedAt: null,
  revokedAt: null,
  revokedReason: null,
  save: jest.fn().mockResolvedValue(),
  ...overrides,
});

beforeEach(() => {
  jest.spyOn(RefreshToken, "create").mockResolvedValue({});
  jest.spyOn(RefreshToken, "updateMany").mockResolvedValue({});
  jest.spyOn(RefreshToken, "findOne").mockResolvedValue(null);
});

describe("signAccessToken / verifyAccessToken", () => {
  it("round-trips identity claims unchanged", () => {
    const claims = verifyAccessToken(signAccessToken(adminFixture()));

    expect(claims).toMatchObject({
      sub: "64b7f9d2e4b0a1b2c3d4e5f6",
      role: "super-admin",
      email: "boss@careerveda.in",
      tv: 2,
    });
  });

  it("stamps the token with the fixed issuer and audience", () => {
    const claims = verifyAccessToken(signAccessToken(adminFixture()));

    expect(claims.iss).toBe(ISSUER);
    expect(claims.aud).toBe(AUDIENCE);
  });

  it("expires the token after the configured TTL", () => {
    const decoded = jwt.decode(signAccessToken(adminFixture()));

    expect(decoded.exp - decoded.iat).toBe(15 * 60);
  });

  it("rejects a token signed with the refresh secret", () => {
    const wrong = jwt.sign({sub: "x"}, env.JWT_REFRESH_SECRET, {
      expiresIn: "15m",
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    expect(() => verifyAccessToken(wrong)).toThrow();
  });

  it("rejects an already-expired token", () => {
    const expired = jwt.sign({sub: "x"}, env.JWT_ACCESS_SECRET, {
      expiresIn: -1,
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    expect(() => verifyAccessToken(expired)).toThrow(/expired/i);
  });

  it("rejects an algorithm-none token, the classic confusion attack", () => {
    const none = jwt.sign({sub: "x", role: "super-admin"}, "", {algorithm: "none"});

    expect(() => verifyAccessToken(none)).toThrow();
  });

  it("rejects a token minted for a different audience or issuer", () => {
    const wrongAudience = jwt.sign({sub: "x"}, env.JWT_ACCESS_SECRET, {
      expiresIn: "15m",
      issuer: ISSUER,
      audience: "someone-else",
    });
    const wrongIssuer = jwt.sign({sub: "x"}, env.JWT_ACCESS_SECRET, {
      expiresIn: "15m",
      issuer: "another-api",
      audience: AUDIENCE,
    });

    expect(() => verifyAccessToken(wrongAudience)).toThrow();
    expect(() => verifyAccessToken(wrongIssuer)).toThrow();
  });

  it("rejects a token whose signature no longer matches its payload", () => {
    const tampered = `${signAccessToken(adminFixture()).slice(0, -4)}XXXX`;

    expect(() => verifyAccessToken(tampered)).toThrow();
  });
});

describe("hashRefreshToken", () => {
  it("produces a fixed-length sha256 hex digest", () => {
    expect(hashRefreshToken("token-1")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic and sensitive to the input", () => {
    expect(hashRefreshToken("token-1")).toBe(hashRefreshToken("token-1"));
    expect(hashRefreshToken("token-1")).not.toBe(hashRefreshToken("token-2"));
  });
});

describe("ipPrefixOf", () => {
  it("keeps only the first two octets of an IPv4 address", () => {
    expect(ipPrefixOf("203.0.113.7")).toBe("203.0.x.x");
  });

  it("keeps only the first two groups of an IPv6 address", () => {
    expect(ipPrefixOf("2001:db8::1")).toBe("2001:db8::");
  });

  it("treats a mapped IPv4 (::ffff:) as the IPv4 it is", () => {
    expect(ipPrefixOf("::ffff:203.0.113.7")).toBe("203.0.x.x");
  });

  it("returns an empty string when there is no ip at all", () => {
    expect(ipPrefixOf(undefined)).toBe("");
    expect(ipPrefixOf(null)).toBe("");
    expect(ipPrefixOf("")).toBe("");
  });
});

describe("issueRefreshToken", () => {
  it("returns an opaque random token and stores only its hash", async () => {
    const token = await issueRefreshToken(adminFixture());

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(RefreshToken.create).toHaveBeenCalledWith(
      expect.objectContaining({tokenHash: hashRefreshToken(token)}),
    );
    // The plain token must never reach the database.
    expect(RefreshToken.create.mock.calls[0][0].tokenHash).not.toContain(token);
  });

  it("starts a fresh family for each new login unless one is passed", async () => {
    await issueRefreshToken(adminFixture());
    await issueRefreshToken(adminFixture());

    const families = RefreshToken.create.mock.calls.map((call) => call[0].family);
    expect(families[0]).not.toBe(families[1]);
    expect(families[0]).toMatch(/^[0-9a-f-]{36}$/);

    await issueRefreshToken(adminFixture(), {family: "family-9"});
    expect(RefreshToken.create.mock.calls[2][0].family).toBe("family-9");
  });

  it("expires the stored row after the configured TTL", async () => {
    await issueRefreshToken(adminFixture());

    const {expiresAt} = RefreshToken.create.mock.calls[0][0];
    const expected = Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
    expect(Math.abs(expiresAt.getTime() - expected)).toBeLessThan(5000);
  });

  it("bounds the user agent and keeps only the ip prefix", async () => {
    await issueRefreshToken(adminFixture(), {
      userAgent: "Mozilla/5.0 ".repeat(60),
      ip: "203.0.113.7",
    });

    expect(RefreshToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userAgent: expect.stringMatching(/^.{400}$/),
        ipPrefix: "203.0.x.x",
      }),
    );
  });
});

describe("revokeFamily / revokeAllForAdmin", () => {
  it("revokes the family with the reason attached", async () => {
    await revokeFamily("family-1", "password-changed");

    expect(RefreshToken.updateMany).toHaveBeenCalledWith(
      {family: "family-1", revokedAt: null},
      {$set: {revokedAt: expect.any(Date), revokedReason: "password-changed"}},
    );
  });

  it("revokes every live session of an admin", async () => {
    await revokeAllForAdmin("64b7f9d2e4b0a1b2c3d4e5f6", "revoked-by-admin");

    expect(RefreshToken.updateMany).toHaveBeenCalledWith(
      {admin: "64b7f9d2e4b0a1b2c3d4e5f6", revokedAt: null},
      {$set: {revokedAt: expect.any(Date), revokedReason: "revoked-by-admin"}},
    );
  });
});

describe("rotateRefreshToken", () => {
  it("reports unknown for a token the database has never seen", async () => {
    RefreshToken.findOne.mockResolvedValue(null);

    await expect(rotateRefreshToken("forged-token")).resolves.toEqual({outcome: ROTATION_OUTCOME.UNKNOWN});
  });

  it("burns the whole family when a used token is presented again", async () => {
    RefreshToken.findOne.mockResolvedValue(
      refreshDoc({usedAt: new Date(), save: jest.fn().mockResolvedValue()}),
    );

    const result = await rotateRefreshToken("stolen-token");

    expect(result).toEqual({
      outcome: ROTATION_OUTCOME.REUSE,
      family: "family-1",
      adminId: "64b7f9d2e4b0a1b2c3d4e5f6",
    });
    expect(RefreshToken.updateMany).toHaveBeenCalledWith(
      {family: "family-1", revokedAt: null},
      expect.objectContaining({$set: expect.objectContaining({revokedReason: "reuse-detected"})}),
    );
  });

  it("treats an already-revoked token as a dead end without re-revoking", async () => {
    RefreshToken.findOne.mockResolvedValue(refreshDoc({revokedAt: new Date(), revokedReason: "logout"}));

    const result = await rotateRefreshToken("revoked-token");

    expect(result).toEqual({
      outcome: ROTATION_OUTCOME.REVOKED,
      family: "family-1",
      adminId: "64b7f9d2e4b0a1b2c3d4e5f6",
    });
    expect(RefreshToken.updateMany).not.toHaveBeenCalled();
  });

  it("refuses a token whose expiry has passed", async () => {
    RefreshToken.findOne.mockResolvedValue(refreshDoc({expiresAt: new Date(Date.now() - 60 * 1000)}));

    const result = await rotateRefreshToken("expired-token");

    expect(result).toEqual({
      outcome: ROTATION_OUTCOME.EXPIRED,
      family: "family-1",
      adminId: "64b7f9d2e4b0a1b2c3d4e5f6",
    });
    expect(RefreshToken.updateMany).not.toHaveBeenCalled();
  });

  it("marks the presented token spent before issuing the replacement", async () => {
    const doc = refreshDoc();
    RefreshToken.findOne.mockResolvedValue(doc);

    const result = await rotateRefreshToken("live-token");

    expect(result.outcome).toBe(ROTATION_OUTCOME.OK);
    expect(result.family).toBe("family-1");
    expect(doc.usedAt).toBeInstanceOf(Date);
    expect(doc.revokedAt).toBeInstanceOf(Date);
    expect(doc.revokedReason).toBe("rotated");
    expect(doc.save).toHaveBeenCalled();
  });

  it("issues the replacement inside the same family", async () => {
    RefreshToken.findOne.mockResolvedValue(refreshDoc());

    const {issue} = await rotateRefreshToken("live-token");
    const replacement = await issue(adminFixture());

    expect(replacement).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(RefreshToken.create).toHaveBeenCalledWith(
      expect.objectContaining({family: "family-1", admin: "64b7f9d2e4b0a1b2c3d4e5f6"}),
    );
  });

  it("freezes the outcome vocabulary so callers cannot typo a string", () => {
    expect(Object.isFrozen(ROTATION_OUTCOME)).toBe(true);
    expect(Object.values(ROTATION_OUTCOME)).toEqual(["ok", "unknown", "reuse", "expired", "revoked"]);
  });
});