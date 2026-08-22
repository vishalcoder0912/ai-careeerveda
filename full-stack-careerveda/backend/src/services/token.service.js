import {createHash, randomBytes, randomUUID} from "node:crypto";

import jwt from "jsonwebtoken";

import {env} from "../config/env.js";
import {RefreshToken} from "../models/RefreshToken.js";

const ISSUER = "careerveda-api";
const AUDIENCE = "careerveda-admin";

// ── Access tokens ───────────────────────────────────────────────────────────
// Short-lived, stateless, sent as a Bearer header and held in memory by the
// admin SPA. Deliberately NOT in a cookie: an access token in a cookie is sent
// automatically on every request, which is exactly the property CSRF exploits.
//
// The payload carries identity, not authority — role is included for cheap UI
// decisions, but every permission check re-reads the database, so a token
// cannot outlive a demotion by more than the request it is already on.

export const signAccessToken = (admin) =>
  jwt.sign(
    {sub: String(admin._id), role: admin.role, email: admin.email, tv: admin.tokenVersion || 0},
    env.JWT_ACCESS_SECRET,
    {expiresIn: env.ACCESS_TOKEN_TTL, issuer: ISSUER, audience: AUDIENCE},
  );

export const verifyAccessToken = (token) =>
  // algorithms is pinned. Without it, a token with {"alg":"none"} or one signed
  // with a public key as an HMAC secret can be accepted — the classic JWT
  // confusion attacks both depend on the verifier trusting the header.
  jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ["HS256"],
    issuer: ISSUER,
    audience: AUDIENCE,
  });

// ── Refresh tokens ──────────────────────────────────────────────────────────
// Opaque random strings, not JWTs: they are checked against the database on
// every use anyway, so signing buys nothing and a self-describing token only
// leaks structure.

const REFRESH_BYTES = 32;

export const hashRefreshToken = (token) => createHash("sha256").update(token).digest("hex");

// Only the first two octets of an IPv4 address (or the first two groups of an
// IPv6 one) are kept. Enough to show "signed in from a different network" on
// the sessions screen without keeping a per-request location history.
export const ipPrefixOf = (ip) => {
  if (!ip) return "";
  const clean = String(ip).replace(/^::ffff:/, "");
  if (clean.includes(":")) return `${clean.split(":").slice(0, 2).join(":")}::`;
  return `${clean.split(".").slice(0, 2).join(".")}.x.x`;
};

export const issueRefreshToken = async (admin, {family, userAgent, ip} = {}) => {
  const token = randomBytes(REFRESH_BYTES).toString("base64url");

  await RefreshToken.create({
    admin: admin._id,
    tokenHash: hashRefreshToken(token),
    // A new login starts a new family; a rotation continues the caller's.
    family: family || randomUUID(),
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
    userAgent: String(userAgent || "").slice(0, 400),
    ipPrefix: ipPrefixOf(ip),
  });

  return token;
};

export const revokeFamily = async (family, reason) =>
  RefreshToken.updateMany(
    {family, revokedAt: null},
    {$set: {revokedAt: new Date(), revokedReason: reason}},
  );

export const revokeAllForAdmin = async (adminId, reason) =>
  RefreshToken.updateMany(
    {admin: adminId, revokedAt: null},
    {$set: {revokedAt: new Date(), revokedReason: reason}},
  );

export const ROTATION_OUTCOME = Object.freeze({
  OK: "ok",
  UNKNOWN: "unknown",
  REUSE: "reuse",
  EXPIRED: "expired",
  REVOKED: "revoked",
});

// The heart of reuse detection.
//
// A token presented twice means one of two things: an attacker stole it and is
// racing the real user, or the real user's client retried. We cannot tell them
// apart, and guessing wrong in the attacker's favour is unacceptable — so the
// entire family is revoked and everyone re-authenticates. That is the standard
// refresh-token-rotation response, and the reason rotation is worth having.
export const rotateRefreshToken = async (presentedToken, {userAgent, ip} = {}) => {
  const tokenHash = hashRefreshToken(presentedToken);
  const existing = await RefreshToken.findOne({tokenHash});

  // No such token. Either forged, or already deleted by the TTL index long
  // after expiry. Nothing to revoke, because we do not know a family.
  if (!existing) return {outcome: ROTATION_OUTCOME.UNKNOWN};

  if (existing.usedAt) {
    await revokeFamily(existing.family, "reuse-detected");
    return {outcome: ROTATION_OUTCOME.REUSE, family: existing.family, adminId: existing.admin};
  }

  if (existing.revokedAt) {
    // Already revoked — a logout, a password change, or the family being burned
    // by a previous reuse. Treat as a dead end without re-revoking.
    return {outcome: ROTATION_OUTCOME.REVOKED, family: existing.family, adminId: existing.admin};
  }

  if (existing.expiresAt.getTime() <= Date.now()) {
    return {outcome: ROTATION_OUTCOME.EXPIRED, family: existing.family, adminId: existing.admin};
  }

  // Mark used before minting the replacement. If the process dies between the
  // two, the user has to log in again — annoying, and strictly better than a
  // live token whose consumption was never recorded.
  existing.usedAt = new Date();
  existing.revokedAt = new Date();
  existing.revokedReason = "rotated";
  await existing.save();

  return {
    outcome: ROTATION_OUTCOME.OK,
    family: existing.family,
    adminId: existing.admin,
    issue: (admin) => issueRefreshToken(admin, {family: existing.family, userAgent, ip}),
  };
};
