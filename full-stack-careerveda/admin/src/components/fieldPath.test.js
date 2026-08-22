import {describe, expect, it} from "vitest";

import {fieldDomId, readPath, writePath} from "./fieldPath";

describe("readPath", () => {
  it("reads a top-level key", () => {
    expect(readPath({title: "PG Program"}, "title")).toBe("PG Program");
  });

  it("reads a dotted path", () => {
    expect(readPath({seo: {title: "Meta"}}, "seo.title")).toBe("Meta");
  });

  it("returns undefined rather than throwing when a branch is missing", () => {
    expect(readPath({}, "seo.title")).toBeUndefined();
  });

  // The reducer guards with `value == null`, which covers an explicit null the
  // same as an absent key. Without that guard this case throws, and a form with
  // `seo: null` would take the whole editor down on first render.
  it("survives a null branch", () => {
    expect(readPath({seo: null}, "seo.title")).toBeUndefined();
  });

  it("keeps falsy leaf values rather than reporting them missing", () => {
    expect(readPath({displayOrder: 0}, "displayOrder")).toBe(0);
    expect(readPath({featured: false}, "featured")).toBe(false);
    expect(readPath({slug: ""}, "slug")).toBe("");
  });
});

describe("writePath", () => {
  it("sets a top-level key", () => {
    expect(writePath({}, "title", "New")).toEqual({title: "New"});
  });

  it("creates the intermediate objects a dotted path needs", () => {
    expect(writePath({}, "seo.title", "Meta")).toEqual({seo: {title: "Meta"}});
  });

  it("keeps the siblings of the key it writes", () => {
    const before = {seo: {title: "Old", description: "Keep me"}, slug: "pg-program"};

    expect(writePath(before, "seo.title", "New")).toEqual({
      seo: {title: "New", description: "Keep me"},
      slug: "pg-program",
    });
  });

  // The editor holds form state in React, which compares by reference. A mutating
  // write would update the object but not re-render the field the user is typing
  // into, so both the input and the nested branch must be fresh objects.
  it("does not mutate the object it was given", () => {
    const before = {seo: {title: "Old"}};
    const after = writePath(before, "seo.title", "New");

    expect(before.seo.title).toBe("Old");
    expect(after).not.toBe(before);
    expect(after.seo).not.toBe(before.seo);
  });

  it("writes falsy values instead of skipping them", () => {
    expect(writePath({displayOrder: 3}, "displayOrder", 0)).toEqual({displayOrder: 0});
    expect(writePath({featured: true}, "featured", false)).toEqual({featured: false});
    expect(writePath({slug: "x"}, "slug", "")).toEqual({slug: ""});
  });
});

describe("fieldDomId", () => {
  it("prefixes the name", () => {
    expect(fieldDomId("title")).toBe("field-title");
  });

  // Dots are legal in a DOM id but have to be escaped in a CSS selector, and the
  // editor scrolls to these by selector when the publish checklist is clicked.
  it("replaces every dot so the id is selector-safe", () => {
    expect(fieldDomId("seo.title")).toBe("field-seo-title");
    expect(fieldDomId("a.b.c")).toBe("field-a-b-c");
  });
});
