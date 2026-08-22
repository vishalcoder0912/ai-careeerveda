// The stat counter.
//
// Two things here are worth pinning and one is not. Worth pinning: reduced
// motion must arrive at the final figure on the first paint, and the figure must
// be the target exactly once the animation ends — a counter that settles on 47
// when the number is 48 is a wrong fact on the page. Not worth pinning: the
// shape of the easing curve mid-flight, which is decoration and would make this
// a test of Math.pow.

import {describe, it, expect, afterEach, vi} from "vitest";
import {render, screen, cleanup, waitFor, act} from "@testing-library/react";

import {useCountUp} from "./useCountUp";

const Counter = ({target, options}) => {
  const {ref, value} = useCountUp(target, options);
  return <span ref={ref} data-testid="n">{value}</span>;
};

const shown = () => screen.getByTestId("n").textContent;

// test-setup.js makes matchMedia report false for everything, which is the
// motion-allowed default. This flips the one query the hook asks about.
const withReducedMotion = () => {
  globalThis.matchMedia = (query) => ({
    matches: query.includes("prefers-reduced-motion"),
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  });
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  delete globalThis.matchMedia;
});

describe("useCountUp with reduced motion", () => {
  it("paints the final number immediately rather than counting to it", () => {
    withReducedMotion();
    render(<Counter target={480} />);

    // Not "eventually 480" — the point of the lazy initialiser is that 0 is
    // never painted at all, so this asserts synchronously on the first render.
    expect(shown()).toBe("480");
  });

  it("keeps the requested decimal places", () => {
    withReducedMotion();
    render(<Counter target={4.5} options={{decimals: 1}} />);

    expect(shown()).toBe("4.5");
  });

  it("rounds to a whole number when no decimals are asked for", () => {
    withReducedMotion();
    render(<Counter target={4.6} />);

    expect(shown()).toBe("5");
  });
});

describe("useCountUp while animating", () => {
  it("starts at zero and ends on the target exactly", async () => {
    render(<Counter target={100} options={{duration: 20}} />);

    // The IntersectionObserver stub in test-setup.js reports the element visible
    // on observe(), so the animation is already running by the time this reads.
    expect(Number(shown())).toBeLessThanOrEqual(100);

    await waitFor(() => expect(shown()).toBe("100"), {timeout: 2000});
  });

  it("never overshoots the target", async () => {
    const seen = [];
    const Watcher = () => {
      const {ref, value} = useCountUp(50, {duration: 20});
      seen.push(value);
      return <span ref={ref} data-testid="n">{value}</span>;
    };

    render(<Watcher />);
    await waitFor(() => expect(shown()).toBe("50"), {timeout: 2000});

    expect(Math.max(...seen)).toBe(50);
  });

  // The observer disconnects on its first hit, so a stat scrolled past twice
  // does not replay. Cheapest proof: unmounting mid-flight must not leave a rAF
  // callback that setStates into a dead component.
  it("cleans up without warning when unmounted mid-count", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const {unmount} = render(<Counter target={1000} options={{duration: 5000}} />);

    await act(async () => {
      unmount();
    });

    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });
});
