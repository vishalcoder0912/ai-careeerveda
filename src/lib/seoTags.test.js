// seoTags writes straight into document.head, which means nothing about it is
// visible from a component test and a broken social preview ships silently.
//
// The two failure modes worth protecting against are both invisible in a
// browser: writing og:* as `name` instead of `property` (the tag renders,
// validators ignore it), and appending rather than upserting (navigate five
// times, ship five og:title tags, crawlers pick an arbitrary one).

import {describe, it, expect, beforeEach, vi} from "vitest";

import {applySeo, setCanonical, setMetaName, setMetaProperty} from "./seoTags";

const meta = (attr, key) => document.head.querySelector(`meta[${attr}="${key}"]`);
const contentOf = (attr, key) => meta(attr, key)?.getAttribute("content");
const countOf = (selector) => document.head.querySelectorAll(selector).length;

const FULL = {
  title: "PG in Product Management | CareerVeda",
  description: "A six-month mentor-led program.",
  url: "https://careerveda.in/programs/product-management",
  image: "https://ik.imagekit.io/cv/programs/pm.jpg",
};

beforeEach(() => {
  document.head.innerHTML = "";
});

describe("setMetaProperty", () => {
  it("creates the tag with a property attribute, which is what og:* requires", () => {
    setMetaProperty("og:title", "Hello");

    expect(contentOf("property", "og:title")).toBe("Hello");
    // The classic silent bug: written as `name`, the tag renders and every
    // validator ignores it.
    expect(meta("name", "og:title")).toBeNull();
  });

  it("updates an existing tag in place rather than appending a second one", () => {
    setMetaProperty("og:title", "First");
    setMetaProperty("og:title", "Second");

    expect(countOf('meta[property="og:title"]')).toBe(1);
    expect(contentOf("property", "og:title")).toBe("Second");
  });

  it("edits the tag index.html already shipped, which is the one crawlers read", () => {
    document.head.innerHTML = '<meta property="og:title" content="CareerVeda">';

    setMetaProperty("og:title", "A specific page");

    expect(countOf("meta")).toBe(1);
    expect(contentOf("property", "og:title")).toBe("A specific page");
  });

  it("skips an empty value rather than writing an empty tag", () => {
    setMetaProperty("og:image", "");
    setMetaProperty("og:description", undefined);
    setMetaProperty("og:url", null);

    expect(countOf("meta")).toBe(0);
  });

  it("leaves an existing value alone when the new one is empty", () => {
    setMetaProperty("og:image", "https://cdn/default.jpg");
    setMetaProperty("og:image", "");

    expect(contentOf("property", "og:image")).toBe("https://cdn/default.jpg");
  });
});

describe("setMetaName", () => {
  it("creates the tag with a name attribute, which is what description and twitter:* require", () => {
    setMetaName("twitter:title", "Hello");

    expect(contentOf("name", "twitter:title")).toBe("Hello");
    expect(meta("property", "twitter:title")).toBeNull();
  });

  it("keeps name and property tags of the same key apart", () => {
    setMetaName("og:title", "As a name");
    setMetaProperty("og:title", "As a property");

    expect(contentOf("name", "og:title")).toBe("As a name");
    expect(contentOf("property", "og:title")).toBe("As a property");
    expect(countOf('meta[content="As a property"]')).toBe(1);
  });
});

describe("setCanonical", () => {
  it("creates the canonical link when there is none", () => {
    setCanonical("https://careerveda.in/programs");

    expect(document.head.querySelector('link[rel="canonical"]').getAttribute("href"))
      .toBe("https://careerveda.in/programs");
  });

  it("rewrites the existing link rather than adding a second", () => {
    setCanonical("https://careerveda.in/a");
    setCanonical("https://careerveda.in/b");

    expect(countOf('link[rel="canonical"]')).toBe(1);
    expect(document.head.querySelector('link[rel="canonical"]').getAttribute("href"))
      .toBe("https://careerveda.in/b");
  });

  it("does nothing without an href, rather than writing a canonical to nowhere", () => {
    setCanonical("");
    setCanonical(undefined);

    expect(countOf("link")).toBe(0);
  });

  it("does not touch a different link tag", () => {
    document.head.innerHTML = '<link rel="icon" href="/favicon.ico">';

    setCanonical("https://careerveda.in/");

    expect(document.head.querySelector('link[rel="icon"]').getAttribute("href")).toBe("/favicon.ico");
    expect(countOf("link")).toBe(2);
  });
});

describe("applySeo", () => {
  it("writes the whole surface a share needs", () => {
    applySeo(FULL);

    expect(contentOf("name", "description")).toBe(FULL.description);
    expect(document.head.querySelector('link[rel="canonical"]').getAttribute("href")).toBe(FULL.url);

    expect(contentOf("property", "og:title")).toBe(FULL.title);
    expect(contentOf("property", "og:description")).toBe(FULL.description);
    expect(contentOf("property", "og:url")).toBe(FULL.url);
    expect(contentOf("property", "og:image")).toBe(FULL.image);

    expect(contentOf("name", "twitter:title")).toBe(FULL.title);
    expect(contentOf("name", "twitter:description")).toBe(FULL.description);
    expect(contentOf("name", "twitter:image")).toBe(FULL.image);
  });

  it("puts og:* on property and twitter:* on name — the split that decides whether a preview renders", () => {
    applySeo(FULL);

    for (const key of ["og:title", "og:description", "og:url", "og:type", "og:image"]) {
      expect(meta("property", key)).toBeTruthy();
      expect(meta("name", key)).toBeNull();
    }

    for (const key of ["twitter:title", "twitter:description", "twitter:image", "description"]) {
      expect(meta("name", key)).toBeTruthy();
      expect(meta("property", key)).toBeNull();
    }
  });

  it("defaults og:type to website", () => {
    applySeo(FULL);

    expect(contentOf("property", "og:type")).toBe("website");
  });

  it("takes an explicit type, which is what an article needs", () => {
    applySeo({...FULL, type: "article"});

    expect(contentOf("property", "og:type")).toBe("article");
  });

  it("accumulates nothing across navigations — this is the whole reason it upserts", () => {
    applySeo(FULL);
    applySeo({...FULL, title: "Second page", url: "https://careerveda.in/blog"});
    applySeo({...FULL, title: "Third page", url: "https://careerveda.in/about"});

    expect(countOf('meta[property="og:title"]')).toBe(1);
    expect(countOf('meta[name="twitter:title"]')).toBe(1);
    expect(countOf('link[rel="canonical"]')).toBe(1);
    expect(contentOf("property", "og:title")).toBe("Third page");
  });

  it("leaves the previous page's image standing when a route supplies none", () => {
    // Not ideal, but honest: a stale image beats a share card with no image at
    // all, and every route that has one supplies it.
    applySeo(FULL);
    applySeo({title: "No image here", description: "d", url: "https://careerveda.in/x"});

    expect(contentOf("property", "og:image")).toBe(FULL.image);
    expect(contentOf("property", "og:title")).toBe("No image here");
  });

  it("survives being called with nothing at all", () => {
    expect(() => applySeo({})).not.toThrow();
    // og:type still has a default, so exactly one tag is written.
    expect(countOf("meta")).toBe(1);
  });

  it("does not write into the body", () => {
    applySeo(FULL);

    expect(document.body.querySelectorAll("meta, link")).toHaveLength(0);
  });
});

// The GA4 tag ships with send_page_view: false, so if this stops firing the
// property goes silent and nothing else in the app notices.
describe("page_view reporting", () => {
  const go = (path) => window.history.pushState({}, "", path);

  beforeEach(() => {
    window.gtag = vi.fn();
  });

  const lastEvent = () => window.gtag.mock.calls.at(-1);

  it("reports one page_view per route, with the title it was given", () => {
    go("/programs/product-management");
    applySeo(FULL);

    expect(window.gtag).toHaveBeenCalledTimes(1);
    const [event, name, params] = lastEvent();
    expect([event, name]).toEqual(["event", "page_view"]);
    // The whole reason this lives here and not on the route change: a program
    // page reports its own title, not the "CareerVeda" placeholder that is on
    // the document until the record loads.
    expect(params.page_title).toBe(FULL.title);
    expect(params.page_path).toBe("/programs/product-management");
  });

  it("does not double-count when applySeo re-runs on the same route", () => {
    go("/about");
    applySeo(FULL);
    applySeo({...FULL, description: "the description settled a tick later"});

    expect(window.gtag).toHaveBeenCalledTimes(1);
  });

  it("keeps the query string, or campaign traffic is unattributable", () => {
    go("/enroll?utm_source=linkedin");
    applySeo(FULL);

    expect(lastEvent()[2].page_path).toBe("/enroll?utm_source=linkedin");
  });

  it("stays silent when the tag was blocked or never loaded", () => {
    delete window.gtag;
    go("/faculty");

    expect(() => applySeo(FULL)).not.toThrow();
  });
});
