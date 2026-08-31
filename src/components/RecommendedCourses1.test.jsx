// The bento strip's data merge: what the reader sees comes from the curated
// list unless an admin has published a newer copy, and a curated entry that is
// unpublished keeps its static copy rather than leaving a hole.
//
// The component's only side channel is useContentList, which we pin with the
// apiContents fixture so the tests stay deterministic and offline. The static
// string "CMS override" in the fixture is what announces "this came from the
// API"; the "Curated only" title announces "this came from the file".

import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";
import {render, screen, cleanup} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";

let publishedPrograms = [];

vi.mock("../hooks/useContent", () => ({
  useContentList: () => ({items: publishedPrograms}),
}));

const {default: RecommendedCourses1} = await import("./Recommended/RecommendedCourses1");

const CURATED_COUNT = 6;
const FIRST_TITLE = "PG Program in Product Management";

const apiContents = [
  {
    id: "product-management",
    slug: "product-management",
    image: "https://ik.imagekit.io/q7ucn1rfni/careerveda/api-product.png",
    label: "Thematically Irrelevant Badge",
    title: "CMS override: product management",
    subtitle: "CMS subtitle",
    description: "CMS description",
    meta: ["1 Month", "Asynchronous", "None"],
  },
  {
    id: "data-science-ai",
    slug: "data-science-ai",
    image: "https://ik.imagekit.io/q7ucn1rfni/careerveda/api-ds.png",
    label: "",
    title: "CMS override: data science",
    subtitle: "",
    description: "",
    meta: [],
  },
];

const renderBento = () =>
  render(
    <MemoryRouter>
      <RecommendedCourses1 />
    </MemoryRouter>,
  );

beforeEach(() => {
  publishedPrograms = [];
});

afterEach(cleanup);

describe("RecommendedCourses1 data merge", () => {
  it("renders one card per curated course, in order", () => {
    publishedPrograms = [];
    renderBento();

    const cards = document.querySelectorAll(".rc-card");
    expect(cards).toHaveLength(CURATED_COUNT);
    // First slot is the featured hero.
    expect(document.querySelector(".rc-card--hero .rc-title").textContent).toBe(
      FIRST_TITLE,
    );
  });

  it("serves the curated copy when the API has not published a matching program", () => {
    publishedPrograms = [];
    renderBento();

    // The whole curated list is present with its static copy.
    expect(screen.getByText("PG Program in Product Management")).toBeDefined();
    expect(screen.getByText("PG Program in GEN AI")).toBeDefined();
  });

  it("updates title, subtitle, description and artwork from a published program", () => {
    publishedPrograms = apiContents;
    renderBento();

    // The CMS copy wins where the curated copy used to sit.
    expect(screen.getByText("CMS override: product management")).toBeDefined();
    const img = document.querySelector(".rc-card--hero .rc-media img");
    expect(img.getAttribute("src")).toContain("api-product.png");
  });

  it("keeps curated extras (ribbon, stats) that the CMS does not own", () => {
    publishedPrograms = apiContents;
    renderBento();

    // "Most Popular" is this section's editorial claim, not a program fact.
    expect(screen.getByText("Most Popular", {selector: ".rc-badge"})).toBeDefined();
    // Stats come from the curated meta, which the merge leaves alone.
    expect(screen.getByText("Mentor-Led")).toBeDefined();
  });

  it("leaves a curated entry untouched when the API copy is empty for a field", () => {
    // data-science-ai has empty title/subtitle/description in the API.
    publishedPrograms = apiContents;
    renderBento();

    // The curated "Advanced Track" ribbon and the AI copy survive.
    expect(screen.getByText("Advanced Track", {selector: ".rc-badge"})).toBeDefined();
    expect(screen.getByText("Build AI, ML and Agentic AI Skills")).toBeDefined();
  });

  it("links every card with a slug to its program page", () => {
    publishedPrograms = [];
    renderBento();

    const links = document.querySelectorAll(".rc-link");
    expect(links).toHaveLength(CURATED_COUNT);
    expect(links[0].getAttribute("href")).toBe("/programs/product-management");
  });
});
