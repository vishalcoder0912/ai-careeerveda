// The home hero: copy, the student photo with the career-path card, and the
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

  it("shows the student photo, not the old robot", () => {
    renderHero();

    const photo = screen.getByRole("img", {name: /student/i});
    expect(photo.getAttribute("src")).toBe("/images/hero-student.webp");
    expect(document.querySelector(".hero-visual-shell")).toBeNull();
  });

  it("lists the four career-path steps in order", () => {
    renderHero();

    const steps = screen
      .getByRole("complementary", {name: "Your Career Path"})
      .querySelectorAll("li strong");
    expect([...steps].map((step) => step.textContent)).toEqual([
      "Learn",
      "Build",
      "Get Mentored",
      "Get Placed",
    ]);
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
