// The article page renders two vintages of post shape and must not depend on
// fields that older records never had.

import {describe, it, expect, afterEach} from "vitest";
// cleanup is explicit: this project runs vitest with globals:false, so Testing
// Library never registers its own afterEach and a previous test's DOM would
// otherwise still be mounted for the next one's queries.
import {cleanup, render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";

import BlogArticle from "./BlogArticle";

afterEach(cleanup);

const show = (post) =>
  render(
    <MemoryRouter>
      <BlogArticle post={post} />
    </MemoryRouter>,
  );

describe("BlogArticle", () => {
  it("renders a modern post's lead and every section heading as a real heading", () => {
    show({
      id: "genai-pm",
      title: "PM + GenAI",
      category: "Product Management",
      tag: "Career Guide",
      author: "CareerVeda Team",
      date: "July 2026",
      readTime: "6 min read",
      lead: "The lead paragraph.",
      sections: [
        {heading: "What changed", body: ["First body.", "Second body."]},
        {heading: "Where the roles are", body: ["Third body."]},
      ],
      highlights: ["Live mentor-led sessions"],
      cta: {label: "Explore Product Management", url: "/programs"},
    });

    expect(screen.getByRole("heading", {level: 1, name: "PM + GenAI"})).toBeTruthy();
    expect(screen.getByRole("heading", {level: 2, name: "What changed"})).toBeTruthy();
    expect(screen.getByRole("heading", {level: 2, name: "Where the roles are"})).toBeTruthy();
    expect(screen.getByText("The lead paragraph.")).toBeTruthy();
    expect(screen.getByText("Second body.")).toBeTruthy();
    expect(screen.getByText("Live mentor-led sessions")).toBeTruthy();
    expect(screen.getByText("Last Updated: July 2026")).toBeTruthy();

    // An internal CTA stays a router link, not a full page load.
    expect(screen.getByRole("link", {name: /Explore Product Management/}).getAttribute("href")).toBe(
      "/programs",
    );
  });

  it("renders a legacy post that has only a flat content array and no cta", () => {
    show({
      id: "legacy",
      title: "Legacy Post",
      content: ["Paragraph one.", "Paragraph two."],
    });

    expect(screen.getByText("Paragraph one.")).toBeTruthy();
    expect(screen.getByText("Paragraph two.")).toBeTruthy();

    // Falls back to the default CTA rather than rendering a dead button.
    expect(screen.getByRole("link", {name: /Explore CareerVeda programs/}).getAttribute("href")).toBe(
      "/programs",
    );
  });

  it("opens an external cta in a new tab with a safe rel", () => {
    show({
      id: "external",
      title: "External CTA",
      sections: [{heading: "H", body: ["B"]}],
      cta: {label: "Register", url: "https://example.com/register"},
    });

    const link = screen.getByRole("link", {name: /Register/});
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noreferrer");
  });
});
