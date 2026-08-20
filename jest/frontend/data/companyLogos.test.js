// The company marquee's data and the random row-deal it builds at module load.
//
// The row build shuffles the list and deals logos out round-robin, so the
// invariant that matters is distributional: every one of the 31 companies
// appears in exactly one row, no row is empty, and no logo repeats — a repeat
// would make the seamless -50% marquee loop visibly stutter.

import {describe, it, expect} from "@jest/globals";

import {companyLogos, LOGO_EXTENSIONS, ROW_COUNT, logoRows} from "../../../src/data/companyLogos";

describe("companyLogos — the master list", () => {
  it("holds one record per company with a unique numeric id and a display name", () => {
    expect(companyLogos).toHaveLength(31);
    const ids = companyLogos.map((company) => company.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort((a, b) => a - b)).toEqual(ids);
    for (const company of companyLogos) {
      expect(company.name).toBeTruthy();
    }
  });

  it("gives every company a unique, lowercase slug that doubles as the image filename", () => {
    const slugs = companyLogos.map((company) => company.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9]+$/);
    }
  });

  it("derives the image alt text from the company name", () => {
    for (const company of companyLogos) {
      expect(company.alt).toBe(`${company.name} logo`);
    }
  });
});

describe("logo fallback chain", () => {
  it("tries png, svg, webp then jpg, in that order", () => {
    expect(LOGO_EXTENSIONS).toEqual(["png", "svg", "webp", "jpg"]);
  });
});

describe("logoRows — the marquee deal", () => {
  it("deals every company into exactly one of the four rows", () => {
    expect(logoRows).toHaveLength(ROW_COUNT);
    const all = logoRows.flat().map((item) => item.id);
    expect(all).toHaveLength(companyLogos.length);
    expect(new Set(all).size).toBe(companyLogos.length);
  });

  it("keeps every row populated, so the marquee never shows an empty track", () => {
    for (const row of logoRows) {
      expect(row.length).toBeGreaterThan(0);
    }
  });
});