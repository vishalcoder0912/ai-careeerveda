// Admin-to-frontend synchronisation, asserted at the seam where it happens.
//
// Each test below is one row of the integration story the CMS promises:
// a draft stays private, a publish appears, an edit propagates, an unpublish
// disappears, a delete disappears — and none of it collapses when the backend
// is unreachable. The backend suite proves the API answers correctly; this
// proves the site acts correctly on the answer.

import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";
import {renderHook, waitFor} from "@testing-library/react";

import {useContentList, useContentItem, useContentMap} from "./useContent";
import {adaptBlogPost} from "../lib/contentAdapters";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {status, headers: {"Content-Type": "application/json"}});

const list = (items) => json({success: true, data: items, meta: {total: items.length}});
const one = (record) => json({success: true, data: record, meta: {}});
const notFound = () => json({success: false, error: {code: "NOT_FOUND"}}, 404);
const outage = () => Promise.reject(new TypeError("Failed to fetch"));

const STATIC_PROGRAMS = [
  {id: "product-management", title: "PG Program in Product Management"},
  {id: "data-analytics", title: "PG Program in Data Analytics"},
];

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useContentList — what the site shows", () => {
  it("renders the static fallback immediately, before any response", () => {
    fetch.mockReturnValue(new Promise(() => {}));

    const {result} = renderHook(() => useContentList("programs", {fallback: STATIC_PROGRAMS}));

    // First paint is never a spinner and never blank.
    expect(result.current.items).toEqual(STATIC_PROGRAMS);
    expect(result.current.isLive).toBe(false);
  });

  it("replaces the fallback with what the admin published", async () => {
    fetch.mockResolvedValue(list([{slug: "new-course", title: "Brand New Course"}]));

    const {result} = renderHook(() =>
      useContentList("programs", {
        fallback: STATIC_PROGRAMS,
        adapt: (record) => ({...record, id: record.slug}),
      }),
    );

    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(result.current.items).toEqual([
      {slug: "new-course", title: "Brand New Course", id: "new-course"},
    ]);
  });

  it("empties the section when the admin has unpublished everything", async () => {
    // The delete case. Falling back to the static list here is what used to make
    // "delete" a button with no visible effect.
    fetch.mockResolvedValue(list([]));

    const {result} = renderHook(() => useContentList("programs", {fallback: STATIC_PROGRAMS}));

    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(result.current.items).toEqual([]);
  });

  it("keeps the static fallback when the backend is unreachable", async () => {
    fetch.mockImplementation(outage);

    const {result} = renderHook(() => useContentList("programs", {fallback: STATIC_PROGRAMS}));

    // Nothing to wait for — the assertion is that it never changes.
    await new Promise((resolve) => {setTimeout(resolve, 20);});
    expect(result.current.items).toEqual(STATIC_PROGRAMS);
    expect(result.current.isLive).toBe(false);
  });

  it("does not refetch when re-rendered with an equivalent inline params object", async () => {
    fetch.mockResolvedValue(list([{slug: "a"}]));

    const {result, rerender} = renderHook(() =>
      // A fresh object literal every render — the identity trap that would
      // otherwise refetch on every keystroke of a parent's state.
      useContentList("programs", {fallback: [], params: {category: "Product"}}),
    );

    await waitFor(() => expect(result.current.isLive).toBe(true));
    rerender();
    rerender();

    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe("useContentItem — a detail page", () => {
  it("waits rather than 404ing while a database-only record loads", () => {
    fetch.mockReturnValue(new Promise(() => {}));

    // No static fallback: this is a program that exists only in the admin panel.
    // Redirecting on the initial null is what bounced every such program back to
    // /programs before its fetch could resolve.
    const {result} = renderHook(() => useContentItem("programs", "admin-made", {fallback: null}));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.notFound).toBe(false);
  });

  it("resolves a record that exists only in the database", async () => {
    fetch.mockResolvedValue(one({slug: "admin-made", title: "Made In The Panel"}));

    const {result} = renderHook(() =>
      useContentItem("programs", "admin-made", {
        fallback: null,
        adapt: (record) => ({...record, id: record.slug}),
      }),
    );

    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(result.current.item.title).toBe("Made In The Panel");
    expect(result.current.notFound).toBe(false);
  });

  it("resolves a database-only blog with the fields its public reader renders", async () => {
    fetch.mockResolvedValue(
      one({
        slug: "admin-made-blog",
        title: "Made in the panel",
        sections: [{heading: "Stored", body: ["This came from the API."]}],
        highlights: ["Visible on the final reader page"],
        cta: {label: "Explore programs", url: "/programs"},
      }),
    );

    const {result} = renderHook(() =>
      useContentItem("blogs", "admin-made-blog", {fallback: null, adapt: adaptBlogPost}),
    );

    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(result.current.item).toMatchObject({
      id: "admin-made-blog",
      highlights: ["Visible on the final reader page"],
      cta: {label: "Explore programs", url: "/programs"},
    });
  });

  it("404s a record the admin unpublished, even though src/data still has it", async () => {
    fetch.mockResolvedValue(notFound());

    const {result} = renderHook(() =>
      useContentItem("programs", "product-management", {fallback: STATIC_PROGRAMS[0]}),
    );

    await waitFor(() => expect(result.current.notFound).toBe(true));
    // The static copy must be dropped, not merely ignored.
    expect(result.current.item).toBeNull();
  });

  it("keeps showing the static copy when the backend is unreachable", async () => {
    fetch.mockImplementation(outage);

    const {result} = renderHook(() =>
      useContentItem("programs", "product-management", {fallback: STATIC_PROGRAMS[0]}),
    );

    await new Promise((resolve) => {setTimeout(resolve, 20);});
    expect(result.current.item).toEqual(STATIC_PROGRAMS[0]);
    expect(result.current.notFound).toBe(false);
  });

  // Every admin-created post is exactly this shape: a permalink with no static
  // copy. If the request never lands, the page has nothing to render and no
  // reason to keep waiting — leaving it "loading" is a blank screen forever.
  it("settles a database-only record when the server is unreachable, so the page stops waiting", async () => {
    fetch.mockImplementation(outage);

    const {result} = renderHook(() => useContentItem("blogs", "admin-made-blog", {fallback: null}));

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.item).toBeNull();
  });

  it("swaps content when the route changes, without showing the previous record", async () => {
    fetch.mockResolvedValue(one({slug: "data-analytics", title: "Data Analytics"}));

    const {result, rerender} = renderHook(({slug}) => useContentItem("programs", slug, {fallback: null}), {
      initialProps: {slug: "product-management"},
    });

    await waitFor(() => expect(result.current.isLive).toBe(true));

    fetch.mockResolvedValue(one({slug: "data-analytics", title: "Data Analytics"}));
    rerender({slug: "data-analytics"});

    await waitFor(() => expect(result.current.item?.slug).toBe("data-analytics"));
  });
});

describe("useContentMap — policies", () => {
  it("serves a policy created in the admin panel, absent from the static file", async () => {
    fetch.mockResolvedValue(list([{slug: "cookie-policy", title: "Cookie Policy"}]));

    const {result} = renderHook(() =>
      useContentMap("policies", {
        fallback: {"privacy-policy": {title: "Privacy Policy"}},
        toMap: (records) => Object.fromEntries(records.map((r) => [r.slug, r])),
      }),
    );

    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(result.current.map["cookie-policy"].title).toBe("Cookie Policy");
  });

  it("reports loading until answered, so a new slug is not redirected away early", async () => {
    fetch.mockReturnValue(new Promise(() => {}));

    const {result} = renderHook(() => useContentMap("policies", {fallback: {}}));

    expect(result.current.isLoading).toBe(true);
  });

  it("settles even when the server is unreachable, so the page stops waiting", async () => {
    fetch.mockImplementation(outage);

    const {result} = renderHook(() => useContentMap("policies", {fallback: {}}));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });
});
