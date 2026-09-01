import {describe, it, expect} from "vitest";
import {render, screen} from "@testing-library/react";
import LearningGapSection from "./LearningGapSection";

describe("LearningGapSection", () => {
  it("renders the heading, funnel path, eight gap cards and the conclusion", () => {
    render(<LearningGapSection />);

    expect(screen.getByRole("heading", {name: /Why learning often feels frustrating/i})).toBeTruthy();
    expect(screen.getByText("START")).toBeTruthy();
    expect(screen.getByText("LEARN")).toBeTruthy();
    expect(screen.getByText("GET STUCK")).toBeTruthy();
    expect(screen.getByText("LOSE MOMENTUM")).toBeTruthy();
    expect(screen.getByText("THE LEARNING EXPERIENCE IS THE PROBLEM.")).toBeTruthy();
    expect(screen.getByText("These gaps aren’t caused by a lack of effort.")).toBeTruthy();

    // Eight interactive gap cards, each a button
    const cards = screen
      .getAllByRole("button")
      .filter((b) => b.classList.contains("learning-gap-card"));
    expect(cards.length).toBe(8);

    // All eight specific obstacles are present
    for (const label of [
      "Learning in isolation",
      "Too much theory",
      "No clear direction",
      "Hard to stay consistent",
      "No meaningful feedback",
      "Outdated learning",
      "Hard to apply knowledge",
      "Starting but not finishing",
    ]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });
});
