// The framer-motion variant objects shared by the reveal primitives.
//
// The file's own comment documents the performance rule these objects encode:
// every animation animates opacity and transform only. A filter (blur) forces
// the browser to re-rasterise the element each frame and was the single biggest
// item in the profile, so the suite pins that no variant reintroduces one.

import {describe, it, expect} from "@jest/globals";

import {fadeUpVariants, makeItemVariants, itemVariants, containerVariants, hoverLift} from "../../../src/components/motionVariants";

const containsFilter = (value) => {
  if (typeof value === "object" && value !== null) {
    if (Object.prototype.hasOwnProperty.call(value, "filter")) return true;
    return Object.values(value).some(containsFilter);
  }
  return false;
};

describe("fadeUpVariants", () => {
  it("starts hidden below and ends settled at rest", () => {
    expect(fadeUpVariants.hidden).toMatchObject({opacity: 0, y: 28});
    expect(fadeUpVariants.visible).toMatchObject({opacity: 1, y: 0});
  });

  it("gives the reveal a duration and a shared easing", () => {
    expect(fadeUpVariants.visible.transition.duration).toBe(0.7);
    expect(fadeUpVariants.visible.transition.ease).toEqual([0.22, 1, 0.36, 1]);
  });

  it("never animates filter — opacity and transform only", () => {
    expect(containsFilter(fadeUpVariants)).toBe(false);
  });
});

describe("makeItemVariants — the staggered card", () => {
  it("scales the rise with the duration so a quick reveal still reads as a lift", () => {
    const slow = makeItemVariants(1.3);
    expect(slow.hidden.y).toBeCloseTo(80);
    const fast = makeItemVariants(0.325);
    expect(fast.hidden.y).toBeCloseTo(20);
  });

  it("returns the default itemVariants when called with no arguments", () => {
    expect(makeItemVariants()).toEqual(itemVariants);
  });
});

describe("containerVariants", () => {
  it("releases children one after another with the requested stagger", () => {
    const variants = containerVariants(0.15);
    expect(variants.visible.transition.staggerChildren).toBe(0.15);
    expect(variants.visible.transition.delayChildren).toBe(0.05);
    expect(variants.hidden).toEqual({});
  });

  it("defaults to a 100ms stagger", () => {
    expect(containerVariants().visible.transition.staggerChildren).toBe(0.1);
  });
});

describe("hoverLift", () => {
  it("lifts the card on hover and settles it on tap", () => {
    expect(hoverLift.whileHover).toMatchObject({y: -6});
    expect(hoverLift.whileTap).toMatchObject({scale: 0.99});
  });
});