import {useEffect, useRef} from "react";

import {cellCenter, cellFromPoint, gridSteps, isInvisible} from "./shapeGridGeometry";

/* ShapeGrid — React Bits, ported to JSX for this project.
 *
 * Three changes from the upstream source, each one forced by how it is used
 * here (as a fixed background layer behind the whole home page):
 *
 * 1. It tracks the pointer on `window`, not on the canvas. The canvas sits
 *    behind the page with pointer-events: none, so it never receives a
 *    mousemove of its own — bound to the canvas, the hover trail would simply
 *    never fire. Window coordinates map straight onto a fixed, full-viewport
 *    canvas, so nothing else changes.
 *
 * 2. The cell arithmetic lives in a handful of functions in ./shapeGridGeometry
 *    rather than being written out once per shape in the draw loop and again in
 *    the hover handler — see the note there.
 *
 * 3. The vignette colour is a prop. Upstream hardcodes #120F17, which is a dark
 *    smudge in the middle of a white page.
 *
 * Reduced motion and small screens get the grid painted once and left alone —
 * see the note in the effect.
 */

const TAU = Math.PI * 2;

const ShapeGrid = ({
  direction = "right",
  speed = 1,
  borderColor = "#999",
  squareSize = 20,
  hoverFillColor = "#222",
  shape = "square",
  hoverTrailAmount = 0,
  vignetteColor = "#120F17",
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas && canvas.getContext("2d");
    if (!ctx) return undefined;

    // Freeze on both counts, and for the same reason each time: this is
    // decoration, and the frame loop is the whole cost of it. Reduced motion is
    // a stated preference. A phone is the device where a full-screen canvas
    // repainting every frame competes with the page load — the same line the
    // hero parallax and the RecommendedCourses1 particle field already draw.
    const still =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.matchMedia("(max-width: 900px)").matches;

    const {stepX, stepY} = gridSteps(shape, squareSize);
    // How far the grid travels before it is back where it started. Hexagons
    // need two columns (the stagger alternates); triangles two rows (the flip
    // alternates); everything else one cell.
    const wrapX = shape === "hexagon" ? stepX * 2 : stepX;
    const wrapY = shape === "triangle" ? stepY * 2 : stepY;

    const scroll = {x: 0, y: 0};
    const hovered = {current: null};
    const trail = [];
    const opacities = new Map();
    let width = 0;
    let height = 0;
    let frame = null;
    // Assume visible until the observer below says otherwise: it reports
    // asynchronously, and a grid that is genuinely on screen must not miss its
    // first frames waiting to be told so.
    let onScreen = true;
    // Built once per size rather than once per frame, and not at all when it
    // would paint nothing. It only depends on the canvas dimensions and a prop.
    let vignette = null;

    const resize = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      // Backing store at device resolution, drawing in CSS pixels, so hairlines
      // stay hairlines on a retina screen instead of blurring across two.
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (isInvisible(vignetteColor)) {
        vignette = null;
        return;
      }

      vignette = ctx.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        Math.hypot(width, height) / 2,
      );
      vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
      vignette.addColorStop(1, vignetteColor);
    };

    const tracePath = (cx, cy, flip) => {
      ctx.beginPath();
      if (shape === "hexagon") {
        for (let i = 0; i < 6; i += 1) {
          const angle = (Math.PI / 3) * i;
          const vx = cx + squareSize * Math.cos(angle);
          const vy = cy + squareSize * Math.sin(angle);
          if (i === 0) ctx.moveTo(vx, vy);
          else ctx.lineTo(vx, vy);
        }
      } else if (shape === "circle") {
        ctx.arc(cx, cy, squareSize / 2, 0, TAU);
      } else if (shape === "triangle") {
        const half = squareSize / 2;
        ctx.moveTo(cx, cy + (flip ? half : -half));
        ctx.lineTo(cx + half, cy + (flip ? -half : half));
        ctx.lineTo(cx - half, cy + (flip ? -half : half));
      } else {
        ctx.rect(cx - squareSize / 2, cy - squareSize / 2, squareSize, squareSize);
      }
      ctx.closePath();
    };

    // The wrapped offset the drawing uses, plus how many whole cells have gone
    // by. Both the draw loop and the pointer handler read this, so they always
    // agree on which cell is which.
    const frameOffset = () => ({
      offset: {
        x: ((scroll.x % stepX) + stepX) % stepX,
        y: ((scroll.y % stepY) + stepY) % stepY,
      },
      shift: {col: Math.floor(scroll.x / stepX), row: Math.floor(scroll.y / stepY)},
    });

    const draw = () => {
      const {offset, shift} = frameOffset();
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = borderColor;

      // Two cells of overdraw on every edge, so a shape entering the viewport is
      // already drawn rather than popping in at the boundary.
      const cols = Math.ceil(width / stepX) + 3;
      const rows = Math.ceil(height / stepY) + 3;

      for (let col = -2; col < cols; col += 1) {
        for (let row = -2; row < rows; row += 1) {
          const {cx, cy, flip} = cellCenter(shape, squareSize, col, row, offset, shift);
          const alpha = opacities.get(`${col},${row}`);

          if (alpha) {
            ctx.globalAlpha = alpha;
            ctx.fillStyle = hoverFillColor;
            tracePath(cx, cy, flip);
            ctx.fill();
            ctx.globalAlpha = 1;
          }

          tracePath(cx, cy, flip);
          ctx.stroke();
        }
      }

      // Skipped entirely when the colour is transparent, which is every caller
      // in this project — see isInvisible. A full-viewport composite that
      // produces no pixels is the most expensive nothing on the page.
      if (vignette) {
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, width, height);
      }
    };

    // Each cell eases toward its target opacity — 1 for the cell under the
    // pointer, a fraction of that for each step back along the trail, 0 for
    // everything else. Cells that have faded out are dropped, so the map holds
    // the handful currently lit rather than every cell ever hovered.
    const stepOpacities = () => {
      const targets = new Map();

      if (hovered.current) targets.set(`${hovered.current.x},${hovered.current.y}`, 1);

      for (let i = 0; i < trail.length; i += 1) {
        const key = `${trail[i].x},${trail[i].y}`;
        if (!targets.has(key)) targets.set(key, (trail.length - i) / (trail.length + 1));
      }

      for (const [key] of targets) {
        if (!opacities.has(key)) opacities.set(key, 0);
      }

      for (const [key, current] of opacities) {
        const next = current + ((targets.get(key) || 0) - current) * 0.15;
        if (next < 0.005) opacities.delete(key);
        else opacities.set(key, next);
      }
    };

    // Two things throttle this loop, and both exist because the home page runs
    // three of these canvases at once — the page-wide backdrop, the hero's, and
    // the navbar's — each repainting a full element every frame, forever.
    //
    // 1. It paints at 30fps, not 60. The grid travels 0.1px per frame at the
    //    speed every caller uses; repainting a whole viewport sixty times a
    //    second to move it a tenth of a pixel is work nobody can see. The step
    //    is taken against elapsed time instead of per frame, so the grid moves
    //    at the same rate it always did — and now at the same rate on a 144Hz
    //    display as on a 60Hz one, which was not previously true.
    //
    // 2. It skips entirely while off screen. The page-wide layer is fixed and
    //    the navbar's is sticky, so both stay visible and this changes nothing
    //    for them; the hero's scrolls away and stops.
    const FRAME_MS = 1000 / 30;
    let lastPaint = 0;

    const tick = (time) => {
      frame = requestAnimationFrame(tick);

      if (!onScreen) return;

      const elapsed = time - lastPaint;
      if (elapsed < FRAME_MS) return;
      lastPaint = time;

      // Capped, so returning to a backgrounded tab advances the grid by one
      // sensible step rather than leaping several cells in a single frame.
      const step = Math.max(speed, 0.1) * Math.min(elapsed / (1000 / 60), 3);

      // Scrolling the offset the other way from the name: "right" means the
      // shapes travel right, which is the grid origin moving left.
      if (direction === "right" || direction === "diagonal") scroll.x -= step;
      if (direction === "left") scroll.x += step;
      if (direction === "up") scroll.y += step;
      if (direction === "down" || direction === "diagonal") scroll.y -= step;

      // Kept inside one wrap so the numbers stay small over a long session
      // instead of drifting into the range where a float loses sub-pixel
      // precision and the motion visibly steps.
      scroll.x = ((scroll.x % wrapX) + wrapX) % wrapX;
      scroll.y = ((scroll.y % wrapY) + wrapY) % wrapY;

      stepOpacities();
      draw();
    };

    // Fading the trail is itself an animation, so a still grid does not track
    // the pointer at all — there is nothing to run the fade.
    const onPointerMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      const {offset, shift} = frameOffset();
      const cell = cellFromPoint(
        shape,
        squareSize,
        event.clientX - rect.left,
        event.clientY - rect.top,
        offset,
        shift,
      );

      if (hovered.current && hovered.current.x === cell.x && hovered.current.y === cell.y) return;

      if (hovered.current && hoverTrailAmount > 0) {
        trail.unshift(hovered.current);
        if (trail.length > hoverTrailAmount) trail.length = hoverTrailAmount;
      }
      hovered.current = cell;
    };

    const onPointerLeave = () => {
      if (hovered.current && hoverTrailAmount > 0) {
        trail.unshift(hovered.current);
        if (trail.length > hoverTrailAmount) trail.length = hoverTrailAmount;
      }
      hovered.current = null;
    };

    // The element resizes on its own — the page grows as deferred sections
    // mount, and a phone's address bar collapsing changes the height without a
    // window resize event ever firing.
    const observer = new ResizeObserver(() => {
      resize();
      draw();
    });
    observer.observe(canvas);

    // Whether there is any point painting at all.
    //
    // No rootMargin. A generous one sounds harmless, but the hero's grid ends
    // barely 100px above the first section below it — with a 150px margin it
    // was considered on screen for the entire time the reader was looking at
    // that section, which is exactly the case this gate exists for. Resuming
    // costs one frame, and on a slowly drifting background grid that is not a
    // thing anyone can see.
    const visibility = new IntersectionObserver((entries) => {
      onScreen = entries.some((entry) => entry.isIntersecting);
    });
    visibility.observe(canvas);

    resize();
    draw();

    if (!still) {
      window.addEventListener("pointermove", onPointerMove, {passive: true});
      document.addEventListener("pointerleave", onPointerLeave);
      frame = requestAnimationFrame(tick);
    }

    return () => {
      observer.disconnect();
      visibility.disconnect();
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [
    direction,
    speed,
    borderColor,
    squareSize,
    hoverFillColor,
    shape,
    hoverTrailAmount,
    vignetteColor,
  ]);

  return <canvas ref={canvasRef} className="w-full h-full border-none block" />;
};

export default ShapeGrid;
