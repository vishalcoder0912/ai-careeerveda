import {cleanup, render} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it} from "vitest";

import MetricValue from "./MetricValue";

// Reduced motion makes useCountUp start finished, so the final figure is what
// renders and the formatting can be asserted without driving animation frames.
let original;
beforeEach(() => {
  original = window.matchMedia;
  window.matchMedia = (query) => ({
    matches: query.includes("prefers-reduced-motion"),
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  });
});
afterEach(() => {
  cleanup();
  window.matchMedia = original;
});

describe("MetricValue", () => {
  it.each([
    ["13,000+", "13,000+"],
    ["86%", "86%"],
    ["10000 learners", "10,000learners"],
  ])("renders %s as %s", (value, expected) => {
    const {container} = render(<MetricValue value={value} />);
    expect(container.textContent).toBe(expected);
  });

  it("passes non-numeric values through untouched", () => {
    expect(render(<MetricValue value="Live" />).container.textContent).toBe("Live");
    expect(render(<MetricValue value={null} />).container.textContent).toBe("");
  });

  it("appends a custom class to the base one", () => {
    const {container} = render(<MetricValue value="5" className="big" />);
    expect(container.firstChild.className).toBe("metric-value big");
  });
});
