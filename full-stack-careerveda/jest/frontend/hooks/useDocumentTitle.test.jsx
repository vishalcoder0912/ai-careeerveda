// useDocumentTitle — the browser-tab title and meta description writer.
//
// The behaviour worth protecting is what the visitor's browser tab and a
// crawler's snapshot see. The title is run through composeTitle (so "Contact
// Us" becomes "Contact Us | CareerVeda"), and the description lands on the
// existing <meta name="description"> node — or is left alone when the page has
// none, because creating one mid-render is the router's job, not a hook's.

import {describe, it, expect, beforeEach, afterEach} from "@jest/globals";
import {renderHook} from "@testing-library/react";

import {useDocumentTitle} from "../../../src/hooks/useDocumentTitle";
import {composeTitle, DEFAULT_DESCRIPTION} from "../../../src/config/pageMeta";

const addMetaDescription = (content = "") => {
  const meta = document.createElement("meta");
  meta.name = "description";
  meta.content = content;
  document.head.appendChild(meta);
  return meta;
};

beforeEach(() => {
  document.title = "original title";
  document.head.innerHTML = "";
});

afterEach(() => {
  document.head.innerHTML = "";
});

describe("useDocumentTitle", () => {
  it("sets the tab title to the composed 'title | CareerVeda'", () => {
    renderHook(() => useDocumentTitle("Job Openings"));

    expect(document.title).toBe(composeTitle("Job Openings"));
  });

  it("falls back to the bare brand name for a falsy title", () => {
    renderHook(() => useDocumentTitle(""));

    expect(document.title).toBe("CareerVeda");
  });

  it("writes the given description into the existing description meta tag", () => {
    const meta = addMetaDescription("stale");

    renderHook(() => useDocumentTitle("About Us", "A fresh description"));

    expect(meta.getAttribute("content")).toBe("A fresh description");
  });

  it("writes the site default description when none is supplied", () => {
    const meta = addMetaDescription("stale");

    renderHook(() => useDocumentTitle("About Us"));

    expect(meta.getAttribute("content")).toBe(DEFAULT_DESCRIPTION);
  });

  it("survives a page that has no description meta tag", () => {
    expect(() => {
      renderHook(() => useDocumentTitle("Contact", "desc"));
    }).not.toThrow();
  });

  it("re-titles the tab when the title prop changes on re-render", () => {
    const {rerender} = renderHook(({title}) => useDocumentTitle(title), {
      initialProps: {title: "First"},
    });
    expect(document.title).toBe("First | CareerVeda");

    rerender({title: "Second"});

    expect(document.title).toBe("Second | CareerVeda");
  });
});