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

const poster = () => document.querySelector(".spline-poster");
const loadHint = () => screen.queryByText("Tap to view in 3D");

// Phone flow: the still robot first, the live scene only on a tap, and the tap
// that loads it also hands it the gestures.
const tapToLoad = () => {
  fireEvent.pointerDown(tapLayer());
  fireEvent.load(document.querySelector("iframe"));
};

describe("SplineHeroScene touch gate", () => {
  it("starts a phone on the still robot and downloads nothing until tapped", () => {
    asPhone();
    render(<SplineHeroScene sceneUrl="https://example.test/scene" />);

    // The live scene pinned a throttled phone's main thread, so it is never
    // fetched on its own here: the still is the robot, with a tap to go live.
    expect(poster()).not.toBeNull();
    expect(frame()).toBeNull();
    expect(document.querySelector("iframe")).toBeNull();
    expect(loadHint()).not.toBeNull();
  });

  // The regression this guards: a tap on the robot — the gesture people
  // actually make — must act, not land on an inert frame and do nothing.
  it("loads the live scene from a tap on the robot and hands it the gestures", () => {
    asPhone();
    render(<SplineHeroScene sceneUrl="https://example.test/scene" />);

    // The layer covers the whole robot, so this is a tap anywhere on it.
    fireEvent.pointerDown(tapLayer());
    expect(frame()).not.toBeNull();
    expect(frame().className).toContain("is-interactive");
    // The still holds the robot's place while the scene boots — no blank frame.
    expect(poster()).not.toBeNull();

    fireEvent.load(document.querySelector("iframe"));
    expect(poster()).toBeNull();
    // Nothing may sit over the robot swallowing the drags just enabled.
    expect(tapLayer()).toBeNull();
    expect(loadHint()).toBeNull();
  });

  it("re-arms with a tap after the visitor scrolls away", () => {
    asPhone();
    render(<SplineHeroScene sceneUrl="https://example.test/scene" />);
    tapToLoad();
    fireEvent.scroll(window);

    // Scrolled off: the frame goes inert again and the rotate hint returns...
    expect(frame().className).not.toContain("is-interactive");
    expect(hint()).not.toBeNull();
    // ...and a tap on the robot takes control again.
    fireEvent.pointerDown(tapLayer());
    expect(frame().className).toContain("is-interactive");
  });

  it("takes the gestures back when the visitor scrolls elsewhere", () => {
    asPhone();
    render(<SplineHeroScene sceneUrl="https://example.test/scene" />);
    tapToLoad();

    // A scroll can only have started off the robot — while active it eats its own.
    fireEvent.scroll(window);

    expect(frame().className).not.toContain("is-interactive");
    expect(tapLayer()).not.toBeNull();
    expect(hint()).not.toBeNull();
  });

  it("starts desktop on the still and loads the scene when the cursor reaches the robot", () => {
    asDesktop();
    render(<SplineHeroScene sceneUrl="https://example.test/scene" />);

    expect(poster()).not.toBeNull();
    expect(document.querySelector("iframe")).toBeNull();

    fireEvent.pointerEnter(document.querySelector(".hero-visual-shell"));
    // The still holds the robot's place until the scene has booted.
    expect(poster()).not.toBeNull();
    fireEvent.load(document.querySelector("iframe"));
    expect(poster()).toBeNull();
  });

  it("never covers the scene on desktop, where the frame is interactive from the start", () => {
    asDesktop();
    render(<SplineHeroScene sceneUrl="https://example.test/scene" />);
    fireEvent.pointerEnter(document.querySelector(".hero-visual-shell"));

    expect(frame()).not.toBeNull();
    expect(frame().className).toContain("is-interactive");
    // A layer over the scene on desktop would eat the cursor the robot follows.
    expect(tapLayer()).toBeNull();
    expect(hint()).toBeNull();
  });
});
