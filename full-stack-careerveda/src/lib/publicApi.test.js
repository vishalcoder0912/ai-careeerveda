// The contract that decides whether an admin action reaches a visitor.
//
// Every one of these asserts the distinction the whole integration rests on:
// "the server said no" and "the server did not answer" are different facts, and
// collapsing them is what previously left a deleted record rendering forever
// from its static copy.

import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";

import {fetchList, fetchOne, submitLead, API_BASE, isApiConfigured} from "./publicApi";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {"Content-Type": "application/json"},
  });

const envelope = (data, meta = {}) => ({success: true, data, meta});

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("configuration", () => {
  it("is configured in test/dev, so the suite exercises the real request path", () => {
    expect(isApiConfigured).toBe(true);
    expect(API_BASE).toMatch(/\/api\/v1$/);
  });
});

describe("fetchList", () => {
  it("returns the records a reachable server sent", async () => {
    fetch.mockResolvedValue(json(envelope([{slug: "a"}, {slug: "b"}], {total: 2})));

    const result = await fetchList("programs");

    expect(result).toEqual({reachable: true, items: [{slug: "a"}, {slug: "b"}]});
  });

  it("reports an empty list as a real answer, not as a failure", async () => {
    // This is what unpublishing the last program looks like from out here. If it
    // were reported as unreachable, the static catalogue would render instead
    // and the admin's change would be invisible.
    fetch.mockResolvedValue(json(envelope([], {total: 0})));

    expect(await fetchList("programs")).toEqual({reachable: true, items: []});
  });

  it("reports a network failure as unreachable, so callers keep their fallback", async () => {
    fetch.mockRejectedValue(new TypeError("Failed to fetch"));

    expect(await fetchList("programs")).toEqual({reachable: false, items: null});
  });

  it("treats a 500 as unreachable rather than as an empty site", async () => {
    fetch.mockResolvedValue(json({success: false, error: {code: "INTERNAL"}}, 500));

    expect(await fetchList("programs")).toEqual({reachable: false, items: null});
  });

  it("treats a success:false envelope as unreachable", async () => {
    fetch.mockResolvedValue(json({success: false, error: {code: "OOPS"}}, 200));

    expect(await fetchList("programs")).toEqual({reachable: false, items: null});
  });

  it("requests a page large enough for every current collection", async () => {
    fetch.mockResolvedValue(json(envelope([])));

    await fetchList("blogs");

    // 38 blog posts today; the API caps limit at 100.
    expect(new URL(fetch.mock.calls[0][0]).searchParams.get("limit")).toBe("100");
  });

  it("passes filters through as query parameters", async () => {
    fetch.mockResolvedValue(json(envelope([])));

    await fetchList("programs", {params: {category: "Product", featured: "true"}});

    const url = new URL(fetch.mock.calls[0][0]);
    expect(url.pathname).toBe("/api/v1/public/programs");
    expect(url.searchParams.get("category")).toBe("Product");
    expect(url.searchParams.get("featured")).toBe("true");
  });
});

describe("fetchOne", () => {
  it("returns the record when the server has it", async () => {
    fetch.mockResolvedValue(json(envelope({slug: "product-management", title: "PM"})));

    const {reachable, record} = await fetchOne("programs", "product-management");

    expect(reachable).toBe(true);
    expect(record.title).toBe("PM");
  });

  it("reports a 404 as an answer — the record is unpublished or deleted", async () => {
    fetch.mockResolvedValue(json({success: false, error: {code: "NOT_FOUND"}}, 404));

    // reachable:true is the whole point. It is what lets a detail page 404 for a
    // program the admin unpublished, instead of falling back to src/data and
    // serving it forever.
    expect(await fetchOne("programs", "gone")).toEqual({reachable: true, record: null});
  });

  it("reports an outage as unreachable, so a live page keeps rendering", async () => {
    fetch.mockRejectedValue(new TypeError("Failed to fetch"));

    expect(await fetchOne("programs", "product-management")).toEqual({
      reachable: false,
      record: null,
    });
  });

  it("percent-encodes the slug rather than pasting it into the path", async () => {
    fetch.mockResolvedValue(json(envelope(null), 404));

    await fetchOne("programs", "a/../../admin");

    expect(new URL(fetch.mock.calls[0][0]).pathname).toBe("/api/v1/public/programs/a%2F..%2F..%2Fadmin");
  });

  it("does not call the API at all for an empty slug", async () => {
    expect(await fetchOne("programs", "")).toEqual({reachable: true, record: null});
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("submitLead", () => {
  it("posts to the backend lead endpoint and reports success", async () => {
    fetch.mockResolvedValue(json(envelope({_id: "1"}), 201));

    const result = await submitLead({name: "A", email: "a@b.co", mobile: "9876543210"});

    expect(result.ok).toBe(true);
    expect(fetch.mock.calls[0][0]).toBe(`${API_BASE}/public/leads`);
    expect(fetch.mock.calls[0][1].method).toBe("POST");
  });

  it("surfaces per-field validation errors under the key the forms read", async () => {
    fetch.mockResolvedValue(
      json(
        {
          success: false,
          error: {code: "VALIDATION_ERROR", message: "Check the form.", fields: {email: "Bad email."}},
        },
        400,
      ),
    );

    const result = await submitLead({email: "nope"});

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual({email: "Bad email."});
    expect(result.message).toBe("Check the form.");
  });

  it("never reports success for a rejected submission", async () => {
    // A lead that silently goes nowhere is worse than a visible error, so this
    // is the assertion that matters most in this file.
    fetch.mockResolvedValue(json({success: false, error: {message: "Service down"}}, 503));

    expect((await submitLead({})).ok).toBe(false);
  });
});
