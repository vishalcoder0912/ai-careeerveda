// roleTitle — the chip above a testimonial quote.
//
// The footer shows the full "role at company", so the chip must show only the
// role: it splits on the two separators that appear in the data (" at " and
// ", ") and keeps the first fragment. The behaviour worth pinning is that an
// employer name never leaks into the chip, and that a role without either
// separator is returned intact.

import {describe, it, expect} from "@jest/globals";

import {roleTitle} from "../../../src/components/roleTitle";

describe("roleTitle", () => {
  it("cuts the employer off after ' at '", () => {
    expect(roleTitle("Associate Product Manager at Wipro")).toBe("Associate Product Manager");
    expect(roleTitle("Product Manager at Deloitte")).toBe("Product Manager");
  });

  it("cuts the employer off after ', '", () => {
    expect(roleTitle("Product Development, HighRadius")).toBe("Product Development");
  });

  it("returns a role with no employer untouched", () => {
    expect(roleTitle("Senior Product Manager")).toBe("Senior Product Manager");
  });

  it("returns a non-string input unchanged instead of crashing", () => {
    expect(roleTitle(null)).toBeNull();
    expect(roleTitle(undefined)).toBeUndefined();
  });

  it("trims stray whitespace around the kept fragment", () => {
    expect(roleTitle("  Product Owner  ,  Amazon  ")).toBe("Product Owner");
  });
});