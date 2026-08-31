import {createHash} from "node:crypto";

// Centralised secure hashing. Every digest in this codebase is computed here,
// with the algorithm pinned to SHA-256 — a collision-resistant hash approved
// for integrity and identifier generation (FIPS 180-4, NIST SP 800-107).
//
// Keeping the choice in one audited place is what makes it verifiable: no
// caller scatters an inline createHash call where a weak algorithm (MD5,
// SHA-1) could slip in, and a future upgrade to SHA-3 has exactly one spot to
// change.

// Hex digest (64 chars). Used for file deduplication, refresh-token lookup and
// content fingerprints — values stored in the database.
export const sha256Hex = (value) =>
  createHash("sha256").update(String(value)).digest("hex");

// Base64url digest. Used where the output must be URL-safe (e.g. ETags).
export const sha256Base64Url = (value) =>
  createHash("sha256").update(String(value)).digest("base64url");
