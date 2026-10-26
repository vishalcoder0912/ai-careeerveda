import {createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes, timingSafeEqual} from "node:crypto";

import {env} from "../config/env.js";

// Time-based one-time passwords (RFC 6238) — the six-digit codes from Google
// Authenticator, 1Password, Authy. Built on node:crypto rather than a library:
// the algorithm is one HMAC and a truncation, and a dependency here would be
// one more package with the power to let every admin in.

const STEP_SECONDS = 30;
const DIGITS = 6;
// One step either side absorbs phone clock drift and a code typed as it rolls
// over, without widening the guessing window meaningfully (3 codes in 10^6).
const DRIFT_STEPS = 1;

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

const base32Encode = (buffer) => {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32[(value << (5 - bits)) & 31];
  return output;
};

const base32Decode = (text) => {
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const char of text.replace(/=+$/, "").toUpperCase()) {
    const index = BASE32.indexOf(char);
    if (index === -1) throw new Error("Invalid base32");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
};

export const generateSecret = () => base32Encode(randomBytes(20));

export const codeAt = (secret, step) => {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const digest = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = digest[digest.length - 1] & 15;
  const binary = digest.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 10 ** DIGITS).padStart(DIGITS, "0");
};

export const currentStep = (now = Date.now()) => Math.floor(now / 1000 / STEP_SECONDS);

// Returns the matched time step, or null. Steps at or below `lastUsedStep` are
// refused, so a code seen over a shoulder or replayed from a log is dead the
// moment it has been used once.
export const verifyCode = (secret, code, {lastUsedStep = 0, now = Date.now()} = {}) => {
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) return null;
  const step = currentStep(now);
  for (let delta = -DRIFT_STEPS; delta <= DRIFT_STEPS; delta += 1) {
    const candidate = step + delta;
    if (candidate <= lastUsedStep) continue;
    if (timingSafeEqual(Buffer.from(codeAt(secret, candidate)), Buffer.from(code))) return candidate;
  }
  return null;
};

export const otpauthUrl = (secret, email) => {
  const label = encodeURIComponent(`CareerVeda Admin:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=CareerVeda%20Admin&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
};

// ── Secret at rest ──────────────────────────────────────────────────────────
// The shared secret is encrypted with AES-256-GCM before it touches the
// database, so a leaked backup or a read-only injection does not hand over
// working second factors. The key is derived from JWT_REFRESH_SECRET with HKDF
// under its own label, so it is a different key from anything else derived
// from that secret. Rotating JWT_REFRESH_SECRET therefore disables MFA for
// every admin (they re-enrol) — the safe direction to fail.

const key = () =>
  Buffer.from(hkdfSync("sha256", env.JWT_REFRESH_SECRET, "careerveda-totp-salt", "totp-secret-v1", 32));

export const encryptSecret = (secret) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
};

export const decryptSecret = (stored) => {
  const [version, iv, tag, body] = String(stored || "").split(".");
  if (version !== "v1" || !iv || !tag || !body) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
};
