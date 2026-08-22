// The touch gate: who gets to drive the robot, and when.
//
// The Spline embed is cross-origin, so it claims every gesture made over it and
// we cannot reach inside to ask it not to. On a phone that means the frame must
// be inert by default or a swipe meant to scroll the page drags the robot
// instead. These tests pin the way out of that: the visitor taps to take control,
// and scrolling away hands it back.

import {describe, it, expect, beforeEach, afterEach, vi} from "vitest";
import {render, screen, fireEvent, cleanup} from "@testing-library/react";

import SplineHeroScene from "./SplineHeroScene";

// A phone: no hover, narrow, motion allowed, no save-data. The width query is
// what isPhone() reads, the hover query is what the touch gate reads.
const asPhone = () => {
  window.matchMedia = vi.fn((query) => ({
    matches: query.includes("hover: none") || /max-width:\s*(900|980)px/.test(query),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

const asDesktop = () => {
  window.matchMedia = vi.fn((query) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

const frame = () => document.querySelector(".spline-frame");
const hint = () => screen.queryByText("Tap to rotate");
// What a visitor actually taps: the whole robot, not the pill inside it.
const tapLayer = () => document.querySelector(".spline-tap-layer");

// The component defers the scene behind requestIdleCallback so it never competes
// with the first paint. Running the callback inline keeps these tests about the
// gate rather than about the scheduler. IntersectionObserver is left to
// test-setup.js, whose stub reports elements visible immediately.
beforeEach(() => {
  vi.stubGlobal("requestIdleCallback", (cb) => {
    cb();
    return 1;
  });
});

// vitest runs with globals: false (vite.config.js:95), so Testing Library never
// registers its own afterEach — without this the previous test's DOM is still
// mounted and every document-wide query matches twice.
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("SplineHeroScene touch gate", () => {
  it("rests on the poster until the visitor's first gesture", () => {
    asPhone();
    render(<SplineHeroScene sceneUrl="https://example.test/scene" />);

    // Nothing has been asked for yet: no iframe, and so nothing to tap.
    expect(document.querySelector(".spline-poster")).not.toBeNull();
    expect(frame()).toBeNull();
    expect(hint()).toBeNull();
  });

  it("offers the tap hint once the scene is live, with the frame still inert", () => {
    asPhone();
    render(<SplineHeroScene sceneUrl="https://example.test/scene" />);

    fireEvent.scroll(window);

    expect(frame()).not.toBeNull();
    // Inert is the whole point — the page must still scroll off the robot.
    expect(frame().className).not.toContain("is-interactive");
    expect(hint()).not.toBeNull();
  });

  // The regression this guards: when only the pill listened, a tap on the robot
  // — the gesture people actually make — hit a frame at pointer-events: none and
  // did nothing at all, so the scene looked broken unless you spotted the label.
  it("hands the robot the gestures when the robot itself is tapped", () => {
    asPhone();
    render(<SplineHeroScene sceneUrl="https://example.test/scene" />);
    fireEvent.scroll(window);

    // The layer covers the frame, so this is a tap anywhere on the robot.
    expect(tapLayer()).not.toBeNull();
    fireEvent.pointerDown(tapLayer());

    expect(frame().className).toContain("is-interactive");
    // The layer has done its job and would otherwise sit on top of the robot,
    // swallowing the drags it just enabled.
    expect(tapLayer()).toBeNull();
    expect(hint()).toBeNull();
  });

  it("takes the gestures back when the visitor scrolls elsewhere", () => {
    asPhone();
    render(<SplineHeroScene sceneUrl="https://example.test/scene" />);
    fireEvent.scroll(window);
    fireEvent.pointerDown(tapLayer());

    // A scroll can only have started off the robot — while active it eats its own.
    fireEvent.scroll(window);

    expect(frame().className).not.toContain("is-interactive");
    expect(tapLayer()).not.toBeNull();
    expect(hint()).not.toBeNull();
  });

  it("never covers the scene on desktop, where the frame is interactive from the start", () => {
    asDesktop();
    render(<SplineHeroScene sceneUrl="https://example.test/scene" />);

    expect(frame()).not.toBeNull();
    expect(frame().className).toContain("is-interactive");
    // A layer over the scene on desktop would eat the cursor the robot follows.
    expect(tapLayer()).toBeNull();
    expect(hint()).toBeNull();
  });
});
