// The home hero: copy, the neural-brain stage, and the
// stats panel — which must show exactly the numbers handed to it.

import {describe, it, expect, afterEach} from "vitest";
import {render, screen, cleanup} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";

import Hero from "./Hero";

const STATS = [
  ["13,000+", "Successful Learners"],
  ["900+", "Recruitment Partners"],
  ["86%", "Average Salary Growth"],
];

const renderHero = () =>
  render(
    <MemoryRouter>
      <Hero stats={STATS} />
    </MemoryRouter>,
  );

afterEach(cleanup);

describe("Hero", () => {
  it("renders the headline and both calls to action with their routes", () => {
    renderHero();

    expect(screen.getByRole("heading", {level: 1}).textContent).toMatch(
      /Launch Your Career with\s*Industry-Led Programs/,
    );
    expect(screen.getByRole("link", {name: /explore programs/i}).getAttribute("href")).toBe("/programs");
    expect(screen.getByRole("link", {name: /get in touch/i}).getAttribute("href")).toBe("/#consultation");
  });

  it("shows the brain stage, not the student photo or the old robot", () => {
    renderHero();

    expect(document.querySelector(".hh-orbit")).not.toBeNull();
    expect(screen.queryByRole("img", {name: /student/i})).toBeNull();
    expect(document.querySelector(".hero-visual-shell")).toBeNull();
  });

  it("renders every stat it is given, unchanged", () => {
    renderHero();

    const items = screen.getByRole("list", {name: "CareerVeda in numbers"}).querySelectorAll("li");
    expect(items).toHaveLength(STATS.length);
    STATS.forEach(([value, label], index) => {
      expect(items[index].textContent).toContain(value);
      expect(items[index].textContent).toContain(label);
    });
  });
});
