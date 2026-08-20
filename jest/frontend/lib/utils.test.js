// The className joiner used by every component that composes Tailwind classes.
//
// The behaviour that matters is not the joining — it is the filtering. A class
// that is conditionally absent must not come out as "false" or "0" or
// "undefined" on the element, and a truthy value must join with exactly one
// space.

import {describe, it, expect} from "@jest/globals";

import {cn} from "../../../src/lib/utils";

describe("cn — className composition", () => {
  it("joins truthy class names with a single space", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("drops falsy arguments instead of printing them into the class list", () => {
    expect(cn("a", null, undefined, "", false, 0, "b")).toBe("a b");
  });

  it("returns an empty string when every argument is falsy", () => {
    expect(cn(null, undefined, "", false)).toBe("");
  });

  it("accepts no arguments at all", () => {
    expect(cn()).toBe("");
  });
});