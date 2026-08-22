import {describe, expect, it} from "@jest/globals";

import {BRAND_LOGO} from "../../../admin/src/config/brand.js";

// One constant because two screens show the mark — the sidebar and the sign-in
// card. A logo swap that updates only one of them is the failure mode the
// constant exists to prevent, so these tests assert the contract the screens
// depend on, not the bytes of the URL.

describe("brand config", () => {
  it("exports a single shared mark for both the sidebar and the sign-in screen", () => {
    expect(typeof BRAND_LOGO).toBe("string");
    expect(BRAND_LOGO.length).toBeGreaterThan(0);
  });

  it("points at the CareerVeda brand file in the ImageKit library", () => {
    expect(BRAND_LOGO).toMatch(/^https:\/\/ik\.imagekit\.io\//);
    expect(BRAND_LOGO).toContain("careerveda/brand/logo.png");
  });

  // The cache-busting query on the mark is what forces a fresh copy after a
  // logo swap — without it, a replaced logo could keep serving the old bytes.
  it("ships a cache-busting query so a logo swap is picked up immediately", () => {
    expect(BRAND_LOGO).toMatch(/brand\/logo\.png\?updatedAt=\d+$/);
  });
});
