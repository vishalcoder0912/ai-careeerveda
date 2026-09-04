// Regression cover for the empty-list case and the featured-story selection.
//
// Like its predecessor OutcomeStories, the component must render nothing when a
// filtered list comes back empty (an admin unticks every "Featured" flag) rather
// than printing a heading over an empty wall. On top of that it is responsible
// for choosing a stable featured story by name — Anant Shiva — instead of by
// array index, so the ordering the API returns cannot rotate who is featured.

import {describe, it, expect} from "vitest";
import {render, screen, within} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";

import LearnerOutcomes from "./LearnerOutcomes";

const renderStories = (props) =>
  render(
    <MemoryRouter>
      <LearnerOutcomes {...props} />
    </MemoryRouter>,
  );

const STATS = [
  ["13,000+", "Successful Learners"],
  ["900+", "Hiring Partners"],
  ["86%", "Average Salary Growth"],
];

const REVIEW = ["Syed Arif", "Product Manager, Razorpay", "Great program.", "Product Management", ""];

// The four learner stories the section is built around, in the same tuple shape
// the alumni API produces.
const FULL_REVIEWS = [
  ["Anant Shiva", "Product Development at HighRadius", "Strong transition story.", "Product Management", ""],
  ["Syed Arif", "Product Manager at Razorpay", "Built strategic product thinking.", "Product Management", ""],
  ["Anjali Singh", "Product Owner at Amazon", "Achieved rapid professional growth.", "Product Management", ""],
  ["Himani Tamta", "Associate Product Manager at Wipro", "Built a strong foundation.", "Product Management", ""],
];

describe("LearnerOutcomes", () => {
  it("renders nothing when no story is featured", () => {
    const {container} = renderStories({reviews: [], stats: STATS});

    expect(container.innerHTML).toBe("");
  });

  it("renders nothing rather than crashing when reviews is missing entirely", () => {
    const {container} = renderStories({stats: STATS});

    expect(container.innerHTML).toBe("");
  });

  it("renders the stories it is given", () => {
    renderStories({reviews: [REVIEW], stats: STATS});

    expect(screen.getByText("Syed Arif")).toBeDefined();
    expect(screen.getByText("Great program.")).toBeDefined();
  });

  // The featured learner is pinned by name, not by index, so it stays stable
  // regardless of the order the API returns the records in.
  it("features Anant Shiva whenever he is present, regardless of order", () => {
    const shuffled = [FULL_REVIEWS[2], FULL_REVIEWS[0], FULL_REVIEWS[1], FULL_REVIEWS[3]];
    const {container} = renderStories({reviews: shuffled, stats: STATS});

    const featured = container.querySelector(".learner-story--featured");
    expect(featured).not.toBeNull();
    expect(featured.textContent).toContain("Anant Shiva");
  });

  it("falls back to the first story when the expected featured learner is absent", () => {
    const {container} = renderStories({reviews: [REVIEW], stats: STATS});

    const featured = container.querySelector(".learner-story--featured");
    expect(featured.textContent).toContain("Syed Arif");
  });

  it("keeps the company separate from the job title on a card", () => {
    const [name, role, quote, , photo] = REVIEW;

    const {container} = renderStories({reviews: [[name, role, quote, "", photo]], stats: STATS});

    // Scoped to this render's container: there is no auto-cleanup in this suite
    // (vitest runs without globals), so earlier renders are still in the body
    // and a bare screen query would match theirs too.
    const scoped = within(container);

    // The chip shows just the job title (company dropped); the footer still
    // credits the employer.
    expect(scoped.getByText("Product Manager", {selector: ".learner-chip"})).toBeDefined();
    expect(scoped.getByText("Razorpay")).toBeDefined();
  });
});
