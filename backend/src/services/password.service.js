import argon2 from "argon2";

import {PASSWORD_HISTORY_LIMIT} from "../models/Admin.js";

// Argon2id, with OWASP's minimum recommended parameters. id (not i or d)
// because it resists both GPU cracking and side-channel attacks; the others
// each give up one of those.
const OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

export const hashPassword = (plain) => argon2.hash(plain, OPTIONS);

export const verifyPassword = async (hash, plain) => {
  // A malformed or truncated hash makes argon2 throw. That is a failed
  // verification, not a 500 — returning false keeps a corrupted row from
  // turning into an error that distinguishes it from a wrong password.
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
};

// Length is the only rule that reliably correlates with strength, so it does
// the heavy lifting. Composition rules ("one symbol, one digit") mostly produce
// Password1! and are deliberately absent.
const MIN_LENGTH = 12;
const MAX_LENGTH = 200; // Argon2 is slow by design; unbounded input is a DoS.

// A short deny-list of the passwords that actually get tried first. Not a
// substitute for rate limiting — just a way to refuse the obvious at signup.
const OBVIOUS = new Set([
  "password", "password1", "password123", "123456", "12345678", "123456789",
  "qwerty", "qwerty123", "letmein", "welcome", "admin", "admin123", "root",
  "changeme", "careerveda", "careerveda123",
]);

export const validatePasswordStrength = (password, {email} = {}) => {
  if (typeof password !== "string") return "Password is required.";
  if (password.length < MIN_LENGTH) return `Password must be at least ${MIN_LENGTH} characters.`;
  if (password.length > MAX_LENGTH) return `Password must be under ${MAX_LENGTH} characters.`;

  const normalised = password.toLowerCase();

  if (OBVIOUS.has(normalised)) return "That password is too common. Please choose another.";

  // A single repeated character clears the length rule but is trivially guessed.
  if (new Set(password).size < 5) return "Password must use a wider variety of characters.";

  // The local part of the user's own email is the first thing an attacker tries.
  if (email) {
    const local = String(email).split("@")[0].toLowerCase();
    if (local.length >= 4 && normalised.includes(local)) {
      return "Password must not contain your email address.";
    }
  }

  return null;
};

// Reuse check runs against the stored history. Each comparison is a full Argon2
// verify, which is why the history is capped rather than unbounded.
export const isPasswordReused = async (password, history = []) => {
  for (const previous of history.slice(0, PASSWORD_HISTORY_LIMIT)) {
    if (await verifyPassword(previous, password)) return true;
  }
  return false;
};

export const pushPasswordHistory = (history = [], hash) =>
  [hash, ...history].slice(0, PASSWORD_HISTORY_LIMIT);
