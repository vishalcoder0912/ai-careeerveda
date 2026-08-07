// Regression cover for the empty-list case.
//
// The home page asks for featured alumni only. An admin who unticks every
// "Featured" box gets an empty list back — a real answer, not a failure — and
// the section used to render its heading and an empty rail underneath. That is
// the visible edge of the rule that makes deletion work, so it needs to stay
// tested rather than reasoned about.

import {describe, it, expect} from "vitest";
import {render, screen, within} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";

import OutcomeStories from "./OutcomeStories";
import {roleTitle} from "./roleTitle";

// The cards link to /alumni, so the component needs a router in scope. Only the
// populated case reaches a <Link> — which is itself part of the point: the empty
// case returns before rendering anything at all.
const renderStories = (props) =>
  render(
    <MemoryRouter>
      <OutcomeStories {...props} />
    </MemoryRouter>,
  );

const STATS = [
  ["13,000+", "Successful Learners"],
  ["900+", "Hiring Partners"],
  ["4.8", "Average Rating"],
];

const REVIEW = ["Syed Arif", "Product Manager, Razorpay", "Great program.", "Product Management", ""];

describe("OutcomeStories", () => {
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

  // Live records mostly have no programTitle, which used to render as an empty
  // pill above the quote. The role stands in for it instead — the job title
  // only, because the employer is already in the footer of the same card.
  it("labels a card with the job title, without the employer, when it has no program", () => {
    const [name, role, quote, , photo] = REVIEW;
    const {container} = renderStories({reviews: [[name, role, quote, "", photo]], stats: STATS});

    // Scoped to this render's container: there is no auto-cleanup in this suite
    // (vitest runs without globals), so earlier renders are still in the body
    // and a bare screen query would match theirs too.
    const scoped = within(container);

    expect(scoped.getByText("Product Manager", {selector: ".outcome-story-program"})).toBeDefined();
    // The chip is the only thing that loses the company. The footer still
    // credits the employer.
    expect(scoped.getByText("Product Manager, Razorpay")).toBeDefined();
  });
});

describe("roleTitle", () => {
  it.each([
    ["Product Development, HighRadius", "Product Development"],
    ["Associate Product Manager at Wipro", "Associate Product Manager"],
    ["Product Manager at Razorpay", "Product Manager"],
    ["Product Owner at Amazon", "Product Owner"],
    // No separator: nothing to cut.
    ["Data Analyst", "Data Analyst"],
  ])("reduces %s to %s", (role, expected) => {
    expect(roleTitle(role)).toBe(expected);
  });

  it("passes through a missing role rather than throwing", () => {
    expect(roleTitle(undefined)).toBe(undefined);
    expect(roleTitle("")).toBe("");
  });
});
