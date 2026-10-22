import {describe, it, expect} from "vitest";
import {buildBrain} from "./brainGeometry";

describe("buildBrain", () => {
  const brain = buildBrain(3000);

  it("fills exactly the requested particle count, all finite and brain-sized", () => {
    expect(brain.positions).toHaveLength(9000);
    expect(brain.positions.every((value) => Number.isFinite(value) && Math.abs(value) < 2)).toBe(true);
  });

  it("is deterministic", () => {
    expect(buildBrain(3000).positions).toEqual(brain.positions);
  });

  it("builds filaments whose pulse coordinate runs 0 to 1", () => {
    expect(brain.nodeCount).toBeGreaterThan(100);
    expect(brain.lineT.length).toBeGreaterThan(0);
    expect(Math.min(...brain.lineT)).toBe(0);
    expect(Math.max(...brain.lineT)).toBe(1);
    expect(brain.linePositions).toHaveLength(brain.lineT.length * 3);
  });
});
