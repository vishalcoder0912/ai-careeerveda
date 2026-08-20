// Site-level identity: the canonical origin, the social share image and the
// Organization JSON-LD record.
//
// The canonical contract matters most: every absolute URL on the site is built
// from SITE_URL, so it must be the apex host the deployment actually serves,
// with no scheme ambiguity and no trailing slash that would produce
// double-slash canonicals.

import {describe, it, expect} from "@jest/globals";

import {SITE_URL, SITE_NAME, SITE_TAGLINE, OG_IMAGE, OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT, ORGANISATION, absoluteUrl} from "../../../src/config/siteMeta";

describe("SITE_URL — the canonical origin", () => {
  it("is the apex host, https, with no trailing slash", () => {
    expect(SITE_URL).toBe("https://careerveda.in");
    expect(SITE_URL.endsWith("/")).toBe(false);
  });

  it("joins a route onto the origin with exactly one slash", () => {
    expect(absoluteUrl("/programs")).toBe(`${SITE_URL}/programs`);
    expect(absoluteUrl("programs")).toBe(`${SITE_URL}/programs`);
    expect(absoluteUrl("/")).toBe(SITE_URL);
    expect(absoluteUrl("")).toBe(SITE_URL);
    expect(absoluteUrl(undefined)).toBe(SITE_URL);
  });
});

describe("social share image", () => {
  it("is an absolute https URL, since a relative path renders no preview at all", () => {
    expect(OG_IMAGE).toMatch(/^https:\/\//);
  });

  it("matches the 1200x630 ratio every platform crops to", () => {
    expect(OG_IMAGE_WIDTH).toBe(1200);
    expect(OG_IMAGE_HEIGHT).toBe(630);
  });
});

describe("ORGANISATION — the JSON-LD record", () => {
  it("names every field a knowledge panel needs to be useful", () => {
    expect(ORGANISATION.email).toMatch(/@careerveda\.in/);
    expect(ORGANISATION.telephone).toMatch(/^\+91 /);
    expect(ORGANISATION.logo).toMatch(/^https:\/\//);
    expect(ORGANISATION.alternateNames.length).toBeGreaterThanOrEqual(1);
    expect(ORGANISATION.description.length).toBeGreaterThan(50);
  });

  it("lists only real brand spellings, not keyword padding", () => {
    for (const name of ORGANISATION.alternateNames) {
      expect(name.toLowerCase()).toContain("career");
    }
  });
});

describe("brand identity strings", () => {
  it("keeps the site name consistent with the meta module", () => {
    expect(SITE_NAME).toBe("CareerVeda");
    expect(SITE_TAGLINE).toBeTruthy();
  });
});