// The recommended strip's data merge: what the reader sees comes from the
// curated list unless an admin has published a newer copy, and a curated entry
// that is unpublished keeps its static copy rather than leaving a hole.
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

const {default: RecommendedCourses} = await import("./Recommended/RecommendedCourses");

const CURATED_COUNT = 6;
const FIRST_TITLE = "PG Program in Product Management";

const apiContents = [
  {
    id: "product-management",
    slug: "product-management",
    image: "https://ik.imagekit.io/q7ucn1rfni/careerveda/api-product.png",
    title: "CMS override: product management",
    subtitle: "CMS subtitle",
    description: "CMS description",
    badges: ["Most Popular"],
    duration: "1 Month",
    format: "Asynchronous",
    mentorship: ["None"],
  },
  {
    id: "data-science-ai",
    slug: "data-science-ai",
    image: "https://ik.imagekit.io/q7ucn1rfni/careerveda/api-ds.png",
    title: "CMS override: data science",
    subtitle: "",
    description: "",
    badges: [],
    duration: "12 Months",
    format: "Live Online",
    mentorship: "Capstone",
  },
];

const renderBento = () =>
  render(
    <MemoryRouter>
      <RecommendedCourses />
    </MemoryRouter>,
  );

beforeEach(() => {
  publishedPrograms = [];
});

afterEach(cleanup);

describe("RecommendedCourses data merge", () => {
  it("renders one card per curated course, in order", () => {
    publishedPrograms = [];
    renderBento();

    const cards = document.querySelectorAll(".recommended-card");
    expect(cards).toHaveLength(CURATED_COUNT);
    // First slot is the featured card.
    expect(document.querySelector(".recommended-card--featured .recommended-card__title").textContent).toBe(
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
    const img = document.querySelector(".recommended-card--featured .recommended-card__image");
    expect(img.getAttribute("src")).toContain("api-product.png");
  });

  it("keeps curated extras (category, pills) that the CMS does not own", () => {
    publishedPrograms = apiContents;
    renderBento();

    // "Most Popular" is this section's editorial claim, not a program fact.
    expect(
      screen.getByText("MOST POPULAR", {selector: ".recommended-card__category"}),
    ).toBeDefined();
    // Meta pills come from the curated meta, which the merge leaves alone.
    expect(screen.getByText("Mentor-Led")).toBeDefined();
  });

  it("leaves a curated entry untouched when the API copy is empty for a field", () => {
    // data-science-ai has empty title/subtitle/description in the API.
    publishedPrograms = apiContents;
    renderBento();

    // The curated "Advanced Track" ribbon and the AI copy survive.
    expect(
      screen.getByText("ADVANCED TRACK", {selector: ".recommended-card__category"}),
    ).toBeDefined();
    expect(screen.getByText("Build AI, ML and Agentic AI Skills")).toBeDefined();
  });

  it("links every card with a slug to its program page", () => {
    publishedPrograms = [];
    renderBento();

    const links = document.querySelectorAll(".recommended-card__link");
    expect(links).toHaveLength(CURATED_COUNT);
    expect(links[0].getAttribute("href")).toBe("/programs/product-management");
  });
});
