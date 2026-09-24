// The single grid spacing shared by the CursorGrid canvas and the CSS
// --grid-size variable. It is a contract, not a setting: the canvas and the
// style sheet must agree or the lattice and the backdrop stop lining up.

import {describe, it, expect} from "@jest/globals";

import {GRID_SIZE} from "../../../src/config/grid";

describe("GRID_SIZE", () => {
  it("is the documented 90px grid the CSS variable and canvas both read", () => {
    expect(GRID_SIZE).toBe(90);
  });
});