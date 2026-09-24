// The submit-phone marker: a convenience that answers repeat-fill instantly on
// the client while the server remains the real gate. The contracts worth
// pinning down are the normalisation rules, the dedupe, and the resilience to
// a corrupt or unavailable localStorage entry.

import {beforeEach, describe, expect, it} from "vitest";

import {
  hasSubmittedPhone,
  rememberSubmittedPhone,
} from "./submittedPhones.js";

beforeEach(() => {
  window.localStorage.clear();
});

describe("rememberSubmittedPhone / hasSubmittedPhone", () => {
  it("remembers a phone and answers true afterwards", () => {
    rememberSubmittedPhone("9876543210");
    expect(hasSubmittedPhone("9876543210")).toBe(true);
  });

  it("recognises a repeated fill no matter how the digits are formatted", () => {
    rememberSubmittedPhone("+91 98765 43210");

    expect(hasSubmittedPhone("9876543210")).toBe(true);
    expect(hasSubmittedPhone("+91-98765-43210")).toBe(true);
    expect(hasSubmittedPhone("(987) 654-3210")).toBe(true);
  });

  it("ignores leading zeros and country-code prefixes, keeping the last ten digits", () => {
    rememberSubmittedPhone("0091 9876543210");

    expect(hasSubmittedPhone("9876543210")).toBe(true);
  });

  it("does not store a phone when nothing but digits is left, and reports unknown", () => {
    rememberSubmittedPhone("");
    rememberSubmittedPhone("ab-cd");
    expect(hasSubmittedPhone("anything")).toBe(false);
    expect(window.localStorage.getItem("careerveda.submittedPhones")).toBeNull();
  });

  it("stores each phone exactly once", () => {
    rememberSubmittedPhone("9876543210");
    rememberSubmittedPhone("+919876543210");

    expect(JSON.parse(window.localStorage.getItem("careerveda.submittedPhones"))).toEqual([
      "9876543210",
    ]);
  });

  it("remembers several distinct phones and answers each independently", () => {
    rememberSubmittedPhone("9876543210");
    rememberSubmittedPhone("8111222333");

    expect(hasSubmittedPhone("9876543210")).toBe(true);
    expect(hasSubmittedPhone("8111222333")).toBe(true);
    expect(hasSubmittedPhone("9000000000")).toBe(false);
  });
});

describe("localStorage resilience", () => {
  it("treats a corrupt stored value as an empty list instead of crashing", () => {
    window.localStorage.setItem("careerveda.submittedPhones", "{not json");

    expect(hasSubmittedPhone("9876543210")).toBe(false);
    rememberSubmittedPhone("9876543210");
    expect(hasSubmittedPhone("9876543210")).toBe(true);
  });

  it("survives writes being refused (private mode / full quota)", () => {
    // Patch the Storage prototype, not the instance: jsdom serves
    // window.localStorage through a fresh wrapper on every access, so setting
    // an own property on one access never reaches the write the module makes.
    const proto = Object.getPrototypeOf(window.localStorage);
    const originalSetItem = proto.setItem;
    proto.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    try {
      expect(() => rememberSubmittedPhone("9876543210")).not.toThrow();
      expect(hasSubmittedPhone("9876543210")).toBe(false);
    } finally {
      proto.setItem = originalSetItem;
    }
  });
});