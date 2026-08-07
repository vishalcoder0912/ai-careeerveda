import {describe, expect, it} from "@jest/globals";
import {
  hashPassword,
  isPasswordReused,
  pushPasswordHistory,
  validatePasswordStrength,
  verifyPassword,
} from "../../src/services/password.service.js";
import {PASSWORD_HISTORY_LIMIT} from "../../src/models/Admin.js";

// Argon2 is deliberately slow (19 MiB, 2 passes). The hashing tests below each
// cost a real hash, so there are few of them and they carry a raised timeout;
// everything cheap is tested against validatePasswordStrength instead.
const SLOW = 30_000;
const GOOD = "correct-horse-battery-staple";

describe("hashPassword / verifyPassword", () => {
  it(
    "produces an argon2id hash that verifies against its own input",
    async () => {
      const hash = await hashPassword(GOOD);

      expect(hash).toMatch(/^\$argon2id\$/);
      await expect(verifyPassword(hash, GOOD)).resolves.toBe(true);
    },
    SLOW,
  );

  it(
    "rejects the wrong password",
    async () => {
      const hash = await hashPassword(GOOD);

      await expect(verifyPassword(hash, "wrong-password-entirely")).resolves.toBe(false);
      await expect(verifyPassword(hash, GOOD.toUpperCase())).resolves.toBe(false);
      await expect(verifyPassword(hash, `${GOOD} `)).resolves.toBe(false);
    },
    SLOW,
  );

  it(
    "salts: the same password hashes differently every time",
    async () => {
      const [a, b] = await Promise.all([hashPassword(GOOD), hashPassword(GOOD)]);

      expect(a).not.toBe(b);
      await expect(verifyPassword(a, GOOD)).resolves.toBe(true);
      await expect(verifyPassword(b, GOOD)).resolves.toBe(true);
    },
    SLOW,
  );

  it("returns false for a corrupted hash rather than throwing a 500", async () => {
    // A corrupted row must be indistinguishable from a wrong password.
    for (const broken of [
      "not-a-hash",
      "",
      "$argon2id$truncated",
      "$argon2id$v=19$m=19456,t=2,p=1$aaa",
      null,
      undefined,
    ]) {
      await expect(verifyPassword(broken, GOOD)).resolves.toBe(false);
    }
  });
});

describe("validatePasswordStrength", () => {
  it("accepts a long, varied password", () => {
    expect(validatePasswordStrength(GOOD)).toBeNull();
    expect(validatePasswordStrength("a-perfectly-fine-passphrase")).toBeNull();
  });

  it("requires a string", () => {
    expect(validatePasswordStrength(undefined)).toMatch(/required/i);
    expect(validatePasswordStrength(null)).toMatch(/required/i);
    expect(validatePasswordStrength(12345678901234)).toMatch(/required/i);
    expect(validatePasswordStrength({})).toMatch(/required/i);
  });

  it("enforces a 12-character minimum", () => {
    expect(validatePasswordStrength("abcdefghijk")).toMatch(/at least 12/);
    expect(validatePasswordStrength("abcdefghijkl")).toBeNull();
    expect(validatePasswordStrength("")).toMatch(/at least 12/);
  });

  it("caps length, because argon2 on unbounded input is a DoS", () => {
    expect(validatePasswordStrength("a1b2c3d4e5f6".repeat(16))).toBeNull(); // 192
    expect(validatePasswordStrength("a1b2c3d4e5".repeat(21))).toMatch(/under 200/); // 210
  });

  it("refuses a deny-listed password that is long enough to reach the check", () => {
    expect(validatePasswordStrength("careerveda123")).toMatch(/too common/i);
  });

  it("matches the deny-list case-insensitively", () => {
    expect(validatePasswordStrength("CareerVeda123")).toMatch(/too common/i);
    expect(validatePasswordStrength("CAREERVEDA123")).toMatch(/too common/i);
  });

  // Documents a real quirk rather than asserting the ideal: the 12-character
  // minimum runs first, so every deny-list entry shorter than 12 is unreachable —
  // "password", "123456", "qwerty", "admin", "letmein" and the rest are rejected
  // for length and never consulted against the list. Only "careerveda123" (13)
  // is long enough to reach it. Harmless (they are still refused) but the list is
  // almost entirely dead weight; if it is meant to bite, the entries need to be
  // the 12+ character variants attackers actually submit.
  it("rejects short deny-listed passwords for length, before the list is consulted", () => {
    for (const short of ["password", "123456", "qwerty", "admin", "letmein", "changeme"]) {
      expect(short.length).toBeLessThan(12);
      expect(validatePasswordStrength(short)).toMatch(/at least 12/);
    }
  });

  it("rejects a long password built from too few distinct characters", () => {
    // Clears the length rule, trivially guessed.
    expect(validatePasswordStrength("aaaaaaaaaaaaaaaa")).toMatch(/wider variety/i);
    expect(validatePasswordStrength("abababababababab")).toMatch(/wider variety/i);
    expect(validatePasswordStrength("abcdabcdabcdabcd")).toMatch(/wider variety/i);
    // Five distinct characters is the floor, and clears it.
    expect(validatePasswordStrength("abcdeabcdeabcde")).toBeNull();
  });

  it("refuses a password containing the user's own email local part", () => {
    expect(validatePasswordStrength("vishalcoder-secret", {email: "vishalcoder@gmail.com"})).toMatch(
      /email address/i,
    );
    expect(validatePasswordStrength("XXvishalcoderXXyz", {email: "vishalcoder@gmail.com"})).toMatch(
      /email address/i,
    );
  });

  it("matches the email local part case-insensitively", () => {
    expect(validatePasswordStrength("VishalCoder-secret", {email: "vishalcoder@gmail.com"})).toMatch(
      /email address/i,
    );
  });

  it("ignores a local part under 4 characters, which would ban too much", () => {
    // "abc" would match half the dictionary.
    expect(validatePasswordStrength("abc-is-in-here-somewhere", {email: "abc@gmail.com"})).toBeNull();
  });

  it("checks only the local part, not the domain", () => {
    expect(validatePasswordStrength("gmail-is-fine-here", {email: "vishal@gmail.com"})).toBeNull();
  });

  it("applies no email rule when no email is given", () => {
    expect(validatePasswordStrength("vishalcoder-secret")).toBeNull();
    expect(validatePasswordStrength("vishalcoder-secret", {})).toBeNull();
  });

  it("checks length before content, so an empty string is not a 'variety' error", () => {
    expect(validatePasswordStrength("aaa")).toMatch(/at least 12/);
  });
});

describe("isPasswordReused", () => {
  it("returns false against an empty or missing history", async () => {
    await expect(isPasswordReused(GOOD, [])).resolves.toBe(false);
    await expect(isPasswordReused(GOOD)).resolves.toBe(false);
  });

  it(
    "detects a password already in the history",
    async () => {
      const previous = await hashPassword(GOOD);

      await expect(isPasswordReused(GOOD, [previous])).resolves.toBe(true);
      await expect(isPasswordReused("something-entirely-different", [previous])).resolves.toBe(
        false,
      );
    },
    SLOW,
  );

  it(
    "ignores entries beyond the history limit",
    async () => {
      const old = await hashPassword(GOOD);
      // Push it past the cap with cheap junk entries that verify false.
      const history = [...Array(PASSWORD_HISTORY_LIMIT).fill("$argon2id$junk"), old];

      await expect(isPasswordReused(GOOD, history)).resolves.toBe(false);
    },
    SLOW,
  );

  it("survives a history full of corrupted hashes", async () => {
    await expect(isPasswordReused(GOOD, ["", "broken", null])).resolves.toBe(false);
  });
});

describe("pushPasswordHistory", () => {
  it("puts the newest hash first", () => {
    expect(pushPasswordHistory(["b", "c"], "a")).toEqual(["a", "b", "c"]);
  });

  it("caps the history at the limit", () => {
    const full = Array.from({length: PASSWORD_HISTORY_LIMIT}, (_, i) => `h${i}`);
    const next = pushPasswordHistory(full, "new");

    expect(next).toHaveLength(PASSWORD_HISTORY_LIMIT);
    expect(next[0]).toBe("new");
    // The oldest fell off the end.
    expect(next).not.toContain(`h${PASSWORD_HISTORY_LIMIT - 1}`);
  });

  it("starts a history when there is none", () => {
    expect(pushPasswordHistory(undefined, "a")).toEqual(["a"]);
    expect(pushPasswordHistory([], "a")).toEqual(["a"]);
  });

  it("does not mutate the history it was given", () => {
    const history = ["b"];
    pushPasswordHistory(history, "a");

    expect(history).toEqual(["b"]);
  });
});
