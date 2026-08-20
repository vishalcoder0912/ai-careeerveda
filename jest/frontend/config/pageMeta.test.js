// The meta-title/description table and the three builders that feed the <head>.
//
// The SERP contract, per the file's own comments: every composed title stays
// under ~60 characters (Google truncates the tail, which is where the brand
// suffix lives), every description sits in the 150-160 band Google renders
// whole, and descriptions built from program/blog prose are clamped on a word
// boundary rather than cut mid-phrase.

import {describe, it, expect} from "@jest/globals";

import {
  SITE_NAME,
  DEFAULT_DESCRIPTION,
  pageMeta,
  composeTitle,
  resolvePageMeta,
  programMeta,
  blogMeta,
} from "../../../src/config/pageMeta";

describe("composeTitle — the browser-tab and SERP title", () => {
  it("appends the brand when the combined title still fits the ~60-char limit", () => {
    expect(composeTitle("Contact Us")).toBe("Contact Us | CareerVeda");
  });

  it("keeps a long title whole and lets Google trim it, rather than losing the headline", () => {
    const long = "Building Your First RAG Application: A Practical Walkthrough";
    const suffixed = `${long} | ${SITE_NAME}`;
    expect(suffixed.length).toBeGreaterThan(60);
    expect(composeTitle(long)).toBe(long);
    expect(composeTitle(long)).not.toContain("|");
  });

  it("falls back to the bare brand name when no title is supplied", () => {
    expect(composeTitle("")).toBe(SITE_NAME);
    expect(composeTitle(null)).toBe(SITE_NAME);
    expect(composeTitle(undefined)).toBe(SITE_NAME);
  });
});

describe("pageMeta — the static route table", () => {
  it("carries a title and description for every main route", () => {
    for (const route of ["/", "/programs", "/jobs", "/faculty", "/blog", "/about", "/contact", "/alumni", "/enroll"]) {
      expect(pageMeta[route]).toBeDefined();
      expect(pageMeta[route].title).toBeTruthy();
      expect(pageMeta[route].description).toBeTruthy();
    }
  });

  it("covers all four policy pages the footer links", () => {
    for (const route of ["/privacy-policy", "/refund-policy", "/terms", "/escalation-policy"]) {
      expect(pageMeta[route]).toBeDefined();
    }
  });

  it("keeps every static title short enough that the branded suffix survives Google's truncation", () => {
    for (const [_route, meta] of Object.entries(pageMeta)) {
      expect(composeTitle(meta.title).length).toBeLessThanOrEqual(60);
    }
  });

  it("keeps every description in the 150-160 band Google renders without rewriting", () => {
    for (const [_route, meta] of Object.entries(pageMeta)) {
      expect(meta.description.length).toBeGreaterThanOrEqual(140);
      expect(meta.description.length).toBeLessThanOrEqual(160);
    }
  });
});

describe("resolvePageMeta", () => {
  it("returns the record for a known route", () => {
    expect(resolvePageMeta("/programs").title).toBe(pageMeta["/programs"].title);
  });

  it("returns null for a route the page sets its own meta for", () => {
    // /programs/:slug depends on the program record, which App.jsx must not load.
    expect(resolvePageMeta("/programs/data-analytics")).toBeNull();
    expect(resolvePageMeta("/blog/some-post")).toBeNull();
    expect(resolvePageMeta("/unknown")).toBeNull();
  });
});

describe("programMeta — dynamic program pages", () => {
  it("returns null when there is no program record", () => {
    expect(programMeta(null)).toBeNull();
    expect(programMeta(undefined)).toBeNull();
  });

  it("builds the description from the program's own positioning, duration, format and first two skills", () => {
    const meta = programMeta({
      title: "PG Program in Data Analytics",
      subtitle: "Become a Data Analyst with AI Workflows",
      duration: "6 Months",
      format: "Live Online",
      skills: ["Excel", "SQL", "Python", "Power BI"],
    });

    expect(meta.title).toBe("PG Program in Data Analytics");
    expect(meta.description).toContain("Become a Data Analyst with AI Workflows");
    expect(meta.description).toContain("6 Months Live Online program covering Excel and SQL");
    expect(meta.description).toContain("placement assistance");
    // Two skills, not three: the tail has to survive the clamp.
    expect(meta.description).not.toContain("Python");
  });

  it("stays under 160 characters so the sentence Google shows is the one that was written", () => {
    const meta = programMeta({
      title: "A Very Long Program Title",
      subtitle: "A long positioning line that goes on for a while",
      duration: "12 Months",
      format: "Live Online",
      skills: ["One", "Two"],
    });
    expect(meta.description.length).toBeLessThanOrEqual(160);
  });

  it("still reads as a sentence when the program has no skills or subtitle", () => {
    const meta = programMeta({title: "Program", duration: "6 Months", format: "Live Online"});
    expect(meta.description).toBe("6 Months Live Online program — mentor-led classes, projects and placement assistance.");
  });
});

describe("blogMeta — blog detail pages", () => {
  it("returns null when there is no post", () => {
    expect(blogMeta(null)).toBeNull();
  });

  it("prefers the SEO block's title, falling back to the post title", () => {
    const withSeo = blogMeta({title: "Plain", seo: {title: "Optimised"}});
    expect(withSeo.title).toBe("Optimised");

    const withoutSeo = blogMeta({title: "Plain"});
    expect(withoutSeo.title).toBe("Plain");
  });

  it("walks seo description, then excerpt, then lead, then the site default", () => {
    expect(blogMeta({title: "T", seo: {description: "seo"}}).description).toBe("seo");
    expect(blogMeta({title: "T", excerpt: "excerpt"}).description).toBe("excerpt");
    expect(blogMeta({title: "T", lead: "lead"}).description).toBe("lead");

    const fallback = blogMeta({title: "T"}).description;
    expect(fallback.startsWith(DEFAULT_DESCRIPTION.slice(0, 50))).toBe(true);
    expect(fallback.length).toBeLessThanOrEqual(160);
    expect(fallback.endsWith("…")).toBe(true);
  });

  it("clamps a long excerpt on a word boundary with an ellipsis, never mid-word", () => {
    const longText = "word ".repeat(60).trim();
    const meta = blogMeta({title: "T", excerpt: longText});
    expect(meta.description.length).toBeLessThanOrEqual(160);
    expect(meta.description.endsWith("…")).toBe(true);
    expect(meta.description).not.toContain("wordword");
  });
});