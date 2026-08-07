import {describe, it, expect} from "vitest";
import {gridSteps, cellCenter, cellFromPoint, isInvisible} from "./shapeGridGeometry";

/* The one invariant that matters: the point a shape is drawn at must resolve
 * back to the cell it was drawn for. Break it and the grid still renders
 * perfectly — the hover trail just lights up the shape next door, which is the
 * bug the upstream component ships for circles.
 *
 * Run at a scroll offset rather than at rest, because the offset is where the
 * two halves of the arithmetic have the chance to disagree.
 */
const SIZE = 73;
const SHAPES = ["square", "circle", "hexagon", "triangle"];

describe("ShapeGrid cell arithmetic", () => {
  it.each(SHAPES)("resolves a %s's own centre back to its cell", (shape) => {
    const {stepX, stepY} = gridSteps(shape, SIZE);
    const offset = {x: stepX * 0.37, y: stepY * 0.61};
    const shift = {col: 3, row: -2};

    for (const col of [0, 1, 2, 7]) {
      for (const row of [0, 1, 2, 5]) {
        const {cx, cy} = cellCenter(shape, SIZE, col, row, offset, shift);
        expect(cellFromPoint(shape, SIZE, cx, cy, offset, shift)).toEqual({x: col, y: row});
      }
    }
  });

  it("staggers odd hexagon columns by half a row", () => {
    const {stepY} = gridSteps("hexagon", SIZE);
    const at = (col) => cellCenter("hexagon", SIZE, col, 1, {x: 0, y: 0}, {col: 0, row: 0}).cy;

    expect(at(1) - at(0)).toBeCloseTo(stepY / 2);
  });

  it("alternates the triangle flip across both axes", () => {
    const flip = (col, row) =>
      cellCenter("triangle", SIZE, col, row, {x: 0, y: 0}, {col: 0, row: 0}).flip;

    expect(flip(0, 0)).toBe(false);
    expect(flip(1, 0)).toBe(true);
    expect(flip(1, 1)).toBe(false);
  });

  it("keeps the flip pattern still while the grid scrolls", () => {
    // shift is how many whole columns have gone by. A cell that has moved one
    // column along must carry the flip its neighbour had, or the whole field
    // inverts each time the offset wraps.
    const flipAt = (col, shiftCol) =>
      cellCenter("triangle", SIZE, col, 0, {x: 0, y: 0}, {col: shiftCol, row: 0}).flip;

    expect(flipAt(1, 1)).toBe(flipAt(0, 0));
  });

  it("packs hexagons at 1.5r by root-three-r and triangles at half width", () => {
    expect(gridSteps("hexagon", 40)).toEqual({stepX: 60, stepY: 40 * Math.sqrt(3)});
    expect(gridSteps("triangle", 40)).toEqual({stepX: 20, stepY: 40});
    expect(gridSteps("square", 40)).toEqual({stepX: 40, stepY: 40});
  });
});

/* The vignette is skipped when this says the colour paints nothing, so a false
 * positive here silently deletes a visual the caller asked for. The three real
 * call sites (home backdrop, hero, navbar) all pass a zero-alpha rgba, and the
 * failure that matters is any *opaque* colour being mistaken for one of them. */
describe("isInvisible", () => {
  it.each([
    "rgba(15, 23, 42, 0)",
    "rgba(2, 6, 23, 0)",
    "rgba(255, 255, 255, 0)",
    "rgba(0,0,0,0.0)",
    "rgba(0,0,0,.0)",
    "  transparent  ",
  ])("treats %s as painting nothing", (color) => {
    expect(isInvisible(color)).toBe(true);
  });

  it.each([
    "rgba(15, 23, 42, 0.4)",
    "rgba(0,0,0,0.01)",
    "rgba(0,0,0,1)",
    "#120F17",
    "rgb(18, 15, 23)",
    "hsl(220 40% 10%)",
    "",
    undefined,
  ])("keeps drawing for %s", (color) => {
    expect(isInvisible(color)).toBe(false);
  });
});
