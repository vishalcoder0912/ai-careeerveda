// The static blog collection the blog pages render while the CMS is unreachable.
//
// The BlogDetailPage renders sections, highlights and the CTA straight from
// these records, so the suite pins the shape every post must have — plus the
// uniqueness that makes /blog/<slug> resolve unambiguously.

import {describe, it, expect} from "@jest/globals";

import blogPosts from "../../../src/data/blogPosts";

describe("blogPosts — the static collection", () => {
  it("ships a populated collection with every record fully shaped", () => {
    expect(blogPosts.length).toBeGreaterThanOrEqual(30);
    for (const post of blogPosts) {
      expect(post.id).toMatch(/^[a-z0-9-]+$/);
      expect(post.category).toBeTruthy();
      expect(post.tag).toBeTruthy();
      expect(post.title).toBeTruthy();
      expect(post.author).toBeTruthy();
      expect(post.date).toMatch(/^(January|February|March|April|May|June|July|August|September|October|November|December) 20\d\d$/);
      expect(post.readTime).toMatch(/^\d+ min read$/);
      expect(post.excerpt).toBeTruthy();
      expect(post.lead).toBeTruthy();
    }
  });

  it("gives every post a unique id, so /blog/<slug> resolves unambiguously", () => {
    const ids = blogPosts.map((post) => post.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("serves every image from the ImageKit CDN over https — never http, never a local path", () => {
    for (const post of blogPosts) {
      expect(post.image).toMatch(/^https:\/\//);
      expect(post.image).not.toContain("http://");
      expect(post.image.startsWith("/")).toBe(false);
    }
  });

  it("gives every post sections a detail reader can render: heading plus body paragraphs", () => {
    for (const post of blogPosts) {
      expect(post.sections.length).toBeGreaterThanOrEqual(3);
      for (const section of post.sections) {
        expect(section.heading).toBeTruthy();
        expect(Array.isArray(section.body)).toBe(true);
        expect(section.body.length).toBeGreaterThan(0);
        for (const paragraph of section.body) {
          expect(paragraph.length).toBeGreaterThan(20);
        }
      }
    }
  });

  it("carries the highlight bullets the reader page lists", () => {
    for (const post of blogPosts) {
      expect(post.highlights.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("points every call-to-action at a real route with a label", () => {
    for (const post of blogPosts) {
      expect(post.cta.label).toBeTruthy();
      expect(post.cta.url).toMatch(/^\//);
    }
  });

  it("keeps the flagship posts that routes and CTAs depend on", () => {
    const ids = blogPosts.map((post) => post.id);
    for (const known of [
      "product-management-genai",
      "data-analytics-roadmap",
      "building-first-rag-application",
      "soc-analyst-day-in-the-life",
      "financial-modeling-three-statement",
    ]) {
      expect(ids).toContain(known);
    }
  });
});