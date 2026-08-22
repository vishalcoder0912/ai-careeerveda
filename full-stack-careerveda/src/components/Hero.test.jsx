// Where the robot renders, and that there is only ever one of it.
//
// The Spline scene is a ~1 MB iframe, so rendering it in a second slot would boot
// two of them — the failure that is invisible on a fast desktop and doubles the
// payload on the phone. Hence the count assertions, not just the placement ones.
//
// The robot is one element in .hero-layout at every width; which end of the hero
// it appears at is CSS, not JSX. Below 980px SplineLanding.css:1249-1256 puts
// .hero-visual-shell on grid-row 1 and .hero-copy on grid-row 2, so the phone
// reads robot, then copy, then stats. jsdom does not resolve grid, so that
// ordering is not assertable here — what is assertable, and what these tests
// guard, is that the JSX keeps handing CSS a single shell inside .hero-layout to
// order. An earlier design moved the robot into a .hero-visual-band below the
// stat strip; it was reverted in cd3e47d, and nothing should reintroduce it.

import {describe, it, expect, beforeEach, vi} from "vitest";
import {render} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";

import Hero from "./Hero";

const STATS = [
  ["13,000+", "Successful Learners"],
  ["900+", "Recruitment Partners"],
  ["86%", "Average Salary Growth"],
];

// jsdom has matchMedia only if we give it one. Width queries answer against the
// viewport under test; reduced-motion answers true, which is deliberate on both
// counts it affects. It makes Hero's effect bail before its dynamic import("gsap")
// — that promise otherwise resolves after the environment is torn down and fails
// the run — and it makes SplineHeroScene render its still poster instead of
// booting a 1 MB Spline iframe. Neither matters to placement: .hero-visual-shell
// is the outer element either way, and it is the thing that moves.
const setViewport = (maxWidth) => {
  window.matchMedia = vi.fn((query) => {
    const match = /max-width:\s*(\d+)px/.exec(query);
    return {
      matches: match
        ? maxWidth <= Number(match[1])
        : query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  });
};

const renderHero = () => {
  const {container} = render(
    <MemoryRouter>
      <Hero stats={STATS} />
    </MemoryRouter>,
  );
  return container;
};

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", class {
    observe() {}
    disconnect() {}
  });
});

describe("Hero robot placement", () => {
  it.each([
    ["desktop", 1440],
    ["the 980px boundary, where the hero stacks", 980],
    ["a phone", 430],
  ])("keeps one robot inside the hero grid on %s", (_label, width) => {
    setViewport(width);
    const container = renderHero();

    expect(container.querySelectorAll(".hero-visual-shell")).toHaveLength(1);
    expect(container.querySelector(".hero-layout .hero-visual-shell")).not.toBeNull();
    expect(container.querySelector(".hero-visual-band")).toBeNull();
  });

  it("leaves the copy and the robot as siblings for CSS to order", () => {
    setViewport(430);
    const layout = renderHero().querySelector(".hero-layout");

    // Both are direct children of the grid, which is what lets grid-row swap them
    // on a phone without the DOM changing.
    expect(layout.querySelector(":scope > .hero-copy")).not.toBeNull();
    expect(layout.querySelector(":scope > .hero-visual-shell")).not.toBeNull();
  });
});
