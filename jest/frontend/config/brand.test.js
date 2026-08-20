// The CareerVeda brand lockup constants, shared by the navbar and both footers.
//
// What matters here is which host each mark is served from: the navbar lockup
// is a local /public asset (the header must not wait on a third-party host for
// the first thing a visitor sees), while the icon and favicon are ImageKit URLs
// with cache-busting params so a replaced logo cannot sit stale in the CDN.

import {describe, it, expect} from "@jest/globals";

import {BRAND_LOGO_URL, BRAND_ICON_URL, BRAND_FAVICON_URL} from "../../../src/config/brand";

describe("brand asset URLs", () => {
  it("serves the navbar/footer wordmark from /public, not a third-party host", () => {
    expect(BRAND_LOGO_URL.startsWith("/")).toBe(true);
    expect(BRAND_LOGO_URL.startsWith("http")).toBe(false);
    expect(BRAND_LOGO_URL).toContain("careerveda-logo");
  });

  it("serves the icon from ImageKit over https", () => {
    expect(BRAND_ICON_URL).toMatch(/^https:\/\/ik\.imagekit\.io\//);
    expect(BRAND_ICON_URL).not.toContain("http://");
  });

  it("serves the favicon from ImageKit with a cache-buster so a replaced logo cannot go stale", () => {
    expect(BRAND_FAVICON_URL).toMatch(/^https:\/\/ik\.imagekit\.io\//);
    expect(BRAND_FAVICON_URL).toContain("updatedAt=");
  });
});