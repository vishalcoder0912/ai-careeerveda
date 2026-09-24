import {describe, expect, it} from "@jest/globals";

import {sha256Base64Url, sha256Hex} from "../../../src/utils/sha256.js";

// The reference digests below are computed with the standard tooling for the
// empty string and "careerveda", so a regression in the hashing layer (a weak
// algorithm swap, a truncation, a stray byte) is caught against an external
// expected value rather than just against "the code hashed it again".

describe("sha256Hex", () => {
  it("produces the standard SHA-256 digest for a known vector", () => {
    expect(sha256Hex("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(sha256Hex("careerveda")).toBe(
      "15cd3e17930331dc44b73fe7fba763b96b4644036b68bf85d3efd0fe9e8d47d2",
    );
  });

  it("always returns a 64-character lowercase hex digest", () => {
    for (const value of ["", "x", "a".repeat(5000)]) {
      const digest = sha256Hex(value);
      expect(digest).toHaveLength(64);
      expect(digest).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("is deterministic and differs between inputs", () => {
    expect(sha256Hex("same")).toBe(sha256Hex("same"));
    expect(sha256Hex("one")).not.toBe(sha256Hex("two"));
  });

  it("coerces non-string input instead of throwing", () => {
    expect(() => sha256Hex(12345)).not.toThrow();
    expect(sha256Hex(12345)).toHaveLength(64);
  });
});

describe("sha256Base64Url", () => {
  it("returns a URL-safe, unpadded digest", () => {
    const digest = sha256Base64Url("careerveda");
    expect(digest).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(digest).not.toMatch(/[+/=]/);
  });

  it("is deterministic and matches the hex digest's content", () => {
    const hex = sha256Hex("careerveda");
    const base64Url = sha256Base64Url("careerveda");
    const backToHex = Buffer.from(base64Url, "base64url").toString("hex");
    expect(backToHex).toBe(hex);
  });
});