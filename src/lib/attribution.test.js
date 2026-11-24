import {beforeEach, describe, expect, it} from "vitest";

import {getAttribution} from "./attribution";

const setSearch = (search = "") => window.history.replaceState({}, "", `/${search}`);

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  setSearch();
  Object.defineProperty(document, "cookie", {value: "", configurable: true});
});

describe("getAttribution", () => {
  it("captures UTMs and Google click IDs from the landing URL", () => {
    setSearch("?utm_source=google&utm_medium=cpc&utm_campaign=pm_2026&gclid=abc123");

    const result = getAttribution();

    expect(result.utm).toMatchObject({
      source: "google",
      medium: "cpc",
      campaign: "pm_2026",
    });
    expect(result.clickIds.gclid).toBe("abc123");
    expect(result.landingPage).toContain("gclid=abc123");
  });

  it("keeps the first touch after an SPA navigation loses the query string", () => {
    setSearch("?gclid=first&utm_source=google");
    getAttribution();

    window.history.replaceState({}, "", "/programs/product-management");
    const later = getAttribution();

    expect(later.clickIds.gclid).toBe("first");
    // No new source was supplied on the inner route, so the first label stays.
    expect(later.utm.source).toBe("google");
    expect(later.landingPage).toContain("gclid=first");
  });

  it("lets a later campaign refine UTMs without replacing a stored click ID", () => {
    setSearch("?gclid=first&utm_source=google");
    getAttribution();

    setSearch("?utm_source=newsletter&utm_campaign=oct");
    const result = getAttribution();

    expect(result.utm).toMatchObject({source: "newsletter", campaign: "oct"});
    expect(result.clickIds.gclid).toBe("first");
  });

  it("uses the GA4 _ga client ID so backend events join the browser session", () => {
    Object.defineProperty(document, "cookie", {
      value: "_ga=GA1.1.1234567890.1700000000; other=1",
      configurable: true,
    });

    expect(getAttribution().clientId).toBe("1234567890.1700000000");
  });

  it("falls back to a stable local ID when analytics cookies are denied", () => {
    const first = getAttribution().clientId;
    const second = getAttribution().clientId;

    expect(first).toBe(second);
    expect(window.localStorage.getItem("cv-client-id")).toBe(first);
  });
});
