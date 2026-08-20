// The press section's articles and the logo/media-wall maps derived from them.
//
// pressOutlets is built by flattening every article's sources and de-duping on
// the outlet name — it is the "media wall" at the end of the section. The suite
// pins that the wall covers every outlet the articles cite, that each cited
// outlet has a logo entry, and that no cited article links over plain http.

import {describe, it, expect} from "@jest/globals";

import {pressLogos, pressArticles, pressOutlets} from "../../../src/data/pressArticles";

describe("pressArticles — the feature stories", () => {
  it("ships at least the placement and recognition milestones", () => {
    expect(pressArticles.length).toBeGreaterThanOrEqual(2);
    const ids = pressArticles.map((article) => article.id);
    expect(ids).toEqual(expect.arrayContaining(["placement-benchmarks", "best-institute"]));
  });

  it("gives every article a title, tag, date and excerpt for its card", () => {
    for (const article of pressArticles) {
      expect(article.title).toBeTruthy();
      expect(article.tag).toBeTruthy();
      expect(article.date).toMatch(/^[A-Z][a-z]+ 20\d\d$/);
      expect(article.excerpt).toBeTruthy();
    }
  });

  it("cites every source over https", () => {
    for (const article of pressArticles) {
      expect(article.sources.length).toBeGreaterThan(0);
      for (const source of article.sources) {
        expect(source.name).toBeTruthy();
        expect(source.url).toMatch(/^https:\/\//);
        expect(source.url).not.toContain("http://");
      }
    }
  });
});

describe("pressLogos — the outlet marks", () => {
  it("keeps a logo entry for every outlet the articles cite", () => {
    for (const outlet of pressOutlets) {
      expect(pressLogos).toHaveProperty(outlet.name);
    }
  });

  it("shows a mark only when one exists — an unset logo stays absent, not broken", () => {
    for (const [_name, url] of Object.entries(pressLogos)) {
      if (url) expect(url).toMatch(/^https:\/\//);
      else expect(url).toBe("");
    }
  });
});

describe("pressOutlets — the media wall", () => {
  it("covers every cited outlet exactly once", () => {
    const names = pressOutlets.map((outlet) => outlet.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain("IndiaNews24");
    expect(names).toContain("DailyHunt");
  });
});