import {describe, expect, it} from "vitest";

import {isFilled, missingForPublish} from "./publishRules";

describe("isFilled", () => {
  it("treats null and undefined as empty", () => {
    expect(isFilled(null)).toBe(false);
    expect(isFilled(undefined)).toBe(false);
  });

  it("treats a blank or whitespace-only string as empty", () => {
    expect(isFilled("")).toBe(false);
    expect(isFilled("   ")).toBe(false);
    expect(isFilled("\n\t")).toBe(false);
  });

  it("treats a string with content as filled", () => {
    expect(isFilled("PG Program")).toBe(true);
    expect(isFilled("  padded  ")).toBe(true);
  });

  it("treats an empty array as empty and a populated one as filled", () => {
    expect(isFilled([])).toBe(false);
    expect(isFilled(["one"])).toBe(true);
  });

  // displayOrder 0 is the first position, not a missing value. If this flips,
  // every record ordered first starts failing its publish checklist.
  it("treats 0 as filled", () => {
    expect(isFilled(0)).toBe(true);
  });

  it("treats booleans as filled, including false", () => {
    expect(isFilled(true)).toBe(true);
    expect(isFilled(false)).toBe(true);
  });

  describe("media references", () => {
    it("is empty when the reference carries no url", () => {
      expect(isFilled({url: ""})).toBe(false);
      expect(isFilled({url: "   "})).toBe(false);
      expect(isFilled({url: null})).toBe(false);
    });

    // A media object arrives from the picker with alt text and an id already
    // set, so checking key count alone would call an image-less reference
    // filled and let a record publish with a blank hero.
    it("is empty when it has other keys but still no url", () => {
      expect(isFilled({url: "", alt: "Hero image", _id: "abc"})).toBe(false);
    });

    it("is filled once the url points somewhere", () => {
      expect(isFilled({url: "https://ik.imagekit.io/x/hero.jpg"})).toBe(true);
    });
  });

  it("treats a plain object as filled only when it has keys", () => {
    expect(isFilled({})).toBe(false);
    expect(isFilled({heading: "Module 1"})).toBe(true);
  });
});

describe("missingForPublish", () => {
  const resource = {
    fields: [
      {name: "title", label: "Title", kind: "text", group: "Basics", publish: true},
      {name: "slug", label: "Slug", kind: "text", group: "Basics"},
      {name: "seo.title", label: "SEO title", kind: "text", group: "SEO", publish: true},
      {name: "hero", label: "Hero image", kind: "media", publish: true},
    ],
  };

  it("reports nothing when every publish field is filled", () => {
    const form = {
      title: "PG Program",
      seo: {title: "Meta"},
      hero: {url: "https://example.test/a.jpg"},
    };

    expect(missingForPublish(resource, form)).toEqual([]);
  });

  it("reports each unfilled publish field with its label and group", () => {
    expect(missingForPublish(resource, {})).toEqual([
      {name: "title", label: "Title", group: "Basics"},
      {name: "seo.title", label: "SEO title", group: "SEO"},
      {name: "hero", label: "Hero image", group: "Other"},
    ]);
  });

  // A field the schema requires but publishing does not is the editor's problem
  // to enforce on save, not the checklist's. Listing it here would tell someone
  // to fill a field that is already blocking the draft from saving at all.
  it("ignores fields that are not marked for publish", () => {
    const missing = missingForPublish(resource, {title: "T", seo: {title: "S"}, hero: {url: "u"}});

    expect(missing.map((field) => field.name)).not.toContain("slug");
  });

  it("reads nested publish fields through their dotted path", () => {
    const missing = missingForPublish(resource, {
      title: "PG Program",
      seo: {title: ""},
      hero: {url: "https://example.test/a.jpg"},
    });

    expect(missing).toEqual([{name: "seo.title", label: "SEO title", group: "SEO"}]);
  });

  // The checklist is a to-do list someone works down while scrolling the form.
  // Sorting or grouping it out of form order makes them hunt.
  it("keeps the fields in form order", () => {
    const missing = missingForPublish(resource, {seo: {title: "Meta"}});

    expect(missing.map((field) => field.name)).toEqual(["title", "hero"]);
  });

  it("falls back to the Other group when a field declares none", () => {
    const [entry] = missingForPublish({fields: [{name: "x", label: "X", publish: true}]}, {});

    expect(entry.group).toBe("Other");
  });
});
