// Cell arithmetic for ShapeGrid.
//
// Kept out of ShapeGrid.jsx so that file exports only its component: a module
// that mixes components with plain functions is not a Fast Refresh boundary, so
// editing it full-reloads the page instead of swapping the component in place.
//
// Upstream (React Bits) writes this arithmetic out once per shape in the draw
// loop and again in the hover handler — eight copies that do not agree. For
// circles it draws centres at col*size + size/2 but resolves a hover with
// Math.round, so the trail lands on the neighbouring circle. One pair of
// functions here, so the highlight is on the shape the pointer is actually over.

// Is this colour going to paint nothing at all?
//
// The vignette is a full-canvas radial fill, and every caller in this project
// passes a zero-alpha colour to turn it off — each of them says so in a comment.
// Painting it anyway costs a gradient allocation and a whole-viewport composite
// per frame, per canvas, to produce no pixels.
//
// Deliberately conservative: only the forms that are unambiguously invisible
// count. Anything unrecognised is treated as visible, so a colour this does not
// understand still gets drawn rather than silently vanishing.
export const isInvisible = (color) =>
  /^\s*(transparent|rgba?\([^)]*,\s*0*\.?0+\s*\))\s*$/i.test(String(color));

// Column and row pitch for each shape. Hexagons pack at 1.5r horizontally and
// √3·r vertically; triangles share edges, so a column is half a tile wide.
export const gridSteps = (shape, size) => {
  if (shape === "hexagon") return {stepX: size * 1.5, stepY: size * Math.sqrt(3)};
  if (shape === "triangle") return {stepX: size / 2, stepY: size};
  return {stepX: size, stepY: size};
};

// Centre of cell (col, row), given the wrapped scroll offset. `shift` is how
// many whole columns/rows the grid has travelled — the hexagon stagger and the
// triangle flip are keyed to it so the pattern stays put while the grid moves,
// instead of inverting every time the offset wraps.
export const cellCenter = (shape, size, col, row, offset, shift) => {
  const {stepX, stepY} = gridSteps(shape, size);

  if (shape === "hexagon") {
    const staggered = (col + shift.col) % 2 !== 0;
    return {
      cx: col * stepX + offset.x,
      cy: row * stepY + (staggered ? stepY / 2 : 0) + offset.y,
      flip: false,
    };
  }

  if (shape === "triangle") {
    return {
      cx: col * stepX + offset.x,
      cy: row * stepY + stepY / 2 + offset.y,
      flip: (((col + shift.col + row + shift.row) % 2) + 2) % 2 !== 0,
    };
  }

  return {
    cx: col * stepX + stepX / 2 + offset.x,
    cy: row * stepY + stepY / 2 + offset.y,
    flip: false,
  };
};

// The inverse: which cell contains point (x, y). Squares and circles are
// addressed by the cell the point falls inside (floor); hexagons and triangles
// by the nearest column centre (round), because their centres sit on the
// column line rather than half a step past it.
export const cellFromPoint = (shape, size, x, y, offset, shift) => {
  const {stepX, stepY} = gridSteps(shape, size);
  const localX = x - offset.x;
  const localY = y - offset.y;

  if (shape === "hexagon") {
    const col = Math.round(localX / stepX);
    const staggered = (col + shift.col) % 2 !== 0;
    return {x: col, y: Math.round((localY - (staggered ? stepY / 2 : 0)) / stepY)};
  }

  if (shape === "triangle") {
    return {x: Math.round(localX / stepX), y: Math.floor(localY / stepY)};
  }

  return {x: Math.floor(localX / stepX), y: Math.floor(localY / stepY)};
};
