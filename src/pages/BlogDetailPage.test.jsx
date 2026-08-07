// Clicking a card on /blog must render the article on the very next frame.
//
// The route reads src/data/blogPosts.js directly, so these assertions are
// synchronous on purpose: no waitFor, no flushing of promises. If a network
// request ever creeps back into this path, the fetch stub below records it and
// the last test fails.

import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";
// cleanup is explicit: this project runs vitest with globals:false, so Testing
// Library never registers its own afterEach and a previous test's DOM would
// otherwise still be mounted for the next one's queries.
import {cleanup, render, screen} from "@testing-library/react";
import {MemoryRouter, Route, Routes} from "react-router-dom";

import BlogDetailPage from "./BlogDetailPage";
import blogPosts from "../data/blogPosts";

const FIRST = blogPosts[0];

let fetchSpy;

const renderAt = (pathname) =>
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <Routes>
        <Route path="/blog/:slug" element={<BlogDetailPage />} />
        <Route path="/blog" element={<h1>Blog index</h1>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  fetchSpy = vi.fn(() => Promise.reject(new TypeError("no network in this test")));
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("BlogDetailPage", () => {
  it("renders the article synchronously from the bundled file", () => {
    renderAt(`/blog/${FIRST.id}`);

    expect(screen.getByRole("heading", {level: 1, name: FIRST.title})).toBeTruthy();
    // The body, not just the header — proves the whole article is on hand.
    expect(screen.getByText(FIRST.sections[0].heading)).toBeTruthy();
  });

  it("redirects an unknown slug to the index", () => {
    renderAt("/blog/no-such-article");

    expect(screen.getByRole("heading", {level: 1, name: "Blog index"})).toBeTruthy();
  });

  it("makes no network request to render an article", () => {
    renderAt(`/blog/${FIRST.id}`);

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
