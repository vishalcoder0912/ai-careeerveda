// articleSchema is what turns a blog result into a rich article card rather than
// a blue link, and Google discards the whole block if one field is malformed.
// The date is the only field here derived rather than copied, so it is the only
// one that can be wrong while still looking right.

import {describe, it, expect} from "vitest";

import {articleSchema, breadcrumbSchema, organisationSchema} from "./structuredData";

const post = {
  id: "product-management-genai",
  title: "Why Product Management + GenAI Is the Career Superpower of 2026",
  excerpt: "Generative AI has rewritten what 'right' means.",
  author: "CareerVeda Team",
  category: "Product Management",
  date: "July 2026",
  image: "https://ik.imagekit.io/x/cover.jpg",
};

describe("articleSchema", () => {
  it("describes the post as a BlogPosting at its own permalink", () => {
    const schema = articleSchema(post);

    expect(schema["@type"]).toBe("BlogPosting");
    expect(schema.headline).toBe(post.title);
    expect(schema.description).toBe(post.excerpt);
    expect(schema.url).toMatch(/\/blog\/product-management-genai$/);
    expect(schema.mainEntityOfPage["@id"]).toBe(schema.url);
    expect(schema.articleSection).toBe("Product Management");
  });

  // The bug this pins: parsing "July 2026" gives local midnight, and
  // toISOString() in IST rolls that back to 2026-06-30.
  it("keeps a month-only date on the first of that month", () => {
    expect(articleSchema(post).datePublished).toBe("2026-07-01");
  });

  it("passes an ISO date through without shifting it", () => {
    expect(articleSchema({...post, date: "2024-01-15"}).datePublished).toBe("2024-01-15");
  });

  it("omits datePublished rather than emitting a wrong one", () => {
    expect(articleSchema({...post, date: "coming soon"}).datePublished).toBeUndefined();
    expect(articleSchema({...post, date: ""}).datePublished).toBeUndefined();
  });

  it("prefers the SEO description when the post carries one", () => {
    const schema = articleSchema({...post, seo: {description: "Custom meta."}});
    expect(schema.description).toBe("Custom meta.");
  });

  it("leaves out optional fields the post does not have", () => {
    const schema = articleSchema({id: "bare", title: "Bare post"});
    expect(schema.image).toBeUndefined();
    expect(schema.keywords).toBeUndefined();
    expect(schema.articleSection).toBeUndefined();
  });
});

// The two blocks a brand search reads. Both failed silently before: sameAs did
// not exist at all, and breadcrumbSchema reads crumb.path — a caller passing
// `url` produced three crumbs all pointing at the origin, which still renders
// as valid JSON and still earns nothing.
describe("organisationSchema", () => {
  it("claims the social profiles as the same entity", () => {
    const schema = organisationSchema();
    expect(schema.sameAs).toEqual(expect.arrayContaining([expect.stringContaining("linkedin.com")]));
    // A blank entry in externalLinks means "no account", not "a link to nowhere".
    expect(schema.sameAs.every(Boolean)).toBe(true);
  });

  it("lists the brand spellings a person actually types", () => {
    expect(organisationSchema().alternateName).toContain("Career Veda");
  });
});

describe("breadcrumbSchema", () => {
  it("gives each crumb its own absolute URL", () => {
    const trail = breadcrumbSchema([
      {name: "Home", path: "/"},
      {name: "Programs", path: "/programs"},
      {name: "Product Management", path: "/programs/product-management"},
    ]);

    const urls = trail.itemListElement.map((crumb) => crumb.item);
    expect(new Set(urls).size).toBe(3);
    expect(urls[2]).toMatch(/\/programs\/product-management$/);
    expect(trail.itemListElement.map((crumb) => crumb.position)).toEqual([1, 2, 3]);
  });
});
