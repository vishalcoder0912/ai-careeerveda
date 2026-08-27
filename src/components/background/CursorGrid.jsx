import {useEffect, useRef} from "react";

import "./CursorGrid.css";

/* CursorGrid — React Bits, ported to JSX for this project.
 *
 * Two changes from the upstream source, both forced by how it is used here
 * (as the ONE fixed, full-viewport background behind every landing-page
 * section — see CareerVedaBackground.jsx):
 *
 * 1. It tracks the pointer on `window`, not on its container. The canvas sits
 *    at z-index 0 underneath the navbar, the hero and every section, so it
 *    never receives a pointermove of its own — bound to the container, the
 *    illumination would only fire in whatever gaps no element covers. Window
 *    coordinates are mapped into canvas space through getBoundingClientRect,
 *    which for a fixed full-viewport layer is a pure translation.
 *
 * 2. Reduced motion and touch get a static lattice: the grid is painted once
 *    (and on resize) with gridOpacity, and neither the pointer listeners nor
 *    the frame loop ever start. A finger dragging the page would smear cells
 *    under it for frames nobody asked for, and prefers-reduced-motion is a
 *    stated preference — the same still-mode rule ShapeGrid applied before
 *    this component replaced it as the site's one grid.
 *
 * Everything else is upstream: the falloff curves, hold-then-fade cell
 * lifetimes, click pulses handing energy to cells as their ring passes, the
 * ResizeObserver rebuild, and the requestAnimationFrame loop that puts itself
 * back to sleep once nothing is lit.
 */

const FALLOFF_CURVES = {
  linear: t => t,
  smooth: t => t * t * (3 - 2 * t),
  sharp: t => t * t * t,
};

const hexToRgb = hex => {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const num = parseInt(v.slice(0, 6), 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
};

const CursorGrid = ({
  cellSize = 70,
  color = "#D946EF",
  radius = 140,
  falloff = "smooth",
  holdTime = 400,
  fadeDuration = 800,
  lineWidth = 1.2,
  maxOpacity = 1,
  fillOpacity = 0,
  gridOpacity = 0,
  cellRadius = 0,
  clickPulse = true,
  pulseSpeed = 600,
  className = "",
}) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const propsRef = useRef({});
  const wakeRef = useRef(null);

  // Snapshot after every commit rather than during render: the frame loop and
  // the pointer handlers read the latest props from here without the main
  // effect having to re-subscribe when only visual knobs change.
  useEffect(() => {
    propsRef.current = {
      cellSize,
      color,
      radius,
      falloff,
      holdTime,
      fadeDuration,
      lineWidth,
      maxOpacity,
      fillOpacity,
      gridOpacity,
      cellRadius,
      clickPulse,
      pulseSpeed,
    };
  });

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return undefined;

    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Grid state: one alpha + timestamp pair per cell, indexed row-major.
    let cols = 0;
    let rows = 0;
    let offX = 0;
    let offY = 0;
    let alphas = new Float32Array(0);
    let touched = new Float64Array(0);
    let w = 0;
    let h = 0;
    const pulses = [];
    let raf = 0;
    let running = false;
    let lastFrame = 0;

    const rebuild = () => {
      const p = propsRef.current;
      w = container.offsetWidth;
      h = container.offsetHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / p.cellSize) + 1;
      rows = Math.ceil(h / p.cellSize) + 1;
      // Center the lattice so edge cells crop evenly on both sides
      offX = (w - cols * p.cellSize) / 2;
      offY = (h - rows * p.cellSize) / 2;
      alphas = new Float32Array(cols * rows);
      touched = new Float64Array(cols * rows);
    };

    const cellCenter = i => {
      const p = propsRef.current;
      const cx = offX + (i % cols) * p.cellSize + p.cellSize / 2;
      const cy = offY + Math.floor(i / cols) * p.cellSize + p.cellSize / 2;
      return [cx, cy];
    };

    // Light up every cell whose center falls inside the radius, with the
    // configured falloff curve mapping distance to brightness.
    const energize = (x, y) => {
      const p = propsRef.current;
      const r = Math.max(p.radius, 1);
      const ease = FALLOFF_CURVES[p.falloff] || FALLOFF_CURVES.linear;
      const now = performance.now();
      const minCol = Math.max(0, Math.floor((x - r - offX) / p.cellSize));
      const maxCol = Math.min(cols - 1, Math.floor((x + r - offX) / p.cellSize));
      const minRow = Math.max(0, Math.floor((y - r - offY) / p.cellSize));
      const maxRow = Math.min(rows - 1, Math.floor((y + r - offY) / p.cellSize));
      for (let cRow = minRow; cRow <= maxRow; cRow += 1) {
        for (let cCol = minCol; cCol <= maxCol; cCol += 1) {
          const i = cRow * cols + cCol;
          const [cx, cy] = cellCenter(i);
          const dist = Math.hypot(cx - x, cy - y);
          if (dist > r) continue;
          const level = ease(1 - dist / r) * p.maxOpacity;
          if (level > alphas[i]) {
            alphas[i] = level;
            touched[i] = now;
          } else if (level > 0) {
            touched[i] = now;
          }
        }
      }
    };

    const draw = now => {
      const p = propsRef.current;
      const dt = Math.min(now - lastFrame, 50);
      lastFrame = now;
      ctx.clearRect(0, 0, w, h);
      const [cr, cg, cb] = hexToRgb(p.color);

      // Optional faint static lattice
      if (p.gridOpacity > 0) {
        ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, ${p.gridOpacity})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let cCol = 0; cCol <= cols; cCol += 1) {
          const x = Math.round(offX + cCol * p.cellSize) + 0.5;
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
        }
        for (let cRow = 0; cRow <= rows; cRow += 1) {
          const y = Math.round(offY + cRow * p.cellSize) + 0.5;
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
        }
        ctx.stroke();
      }

      // Expanding click pulses hand their energy to cells as they pass
      for (let pi = pulses.length - 1; pi >= 0; pi -= 1) {
        const pulse = pulses[pi];
        const age = (now - pulse.t0) / 1000;
        const ringR = age * p.pulseSpeed;
        if (ringR > Math.hypot(w, h)) {
          pulses.splice(pi, 1);
          continue;
        }
        const band = p.cellSize;
        const minCol = Math.max(0, Math.floor((pulse.x - ringR - band - offX) / p.cellSize));
        const maxCol = Math.min(cols - 1, Math.floor((pulse.x + ringR + band - offX) / p.cellSize));
        const minRow = Math.max(0, Math.floor((pulse.y - ringR - band - offY) / p.cellSize));
        const maxRow = Math.min(rows - 1, Math.floor((pulse.y + ringR + band - offY) / p.cellSize));
        for (let cRow = minRow; cRow <= maxRow; cRow += 1) {
          for (let cCol = minCol; cCol <= maxCol; cCol += 1) {
            const i = cRow * cols + cCol;
            const [cx, cy] = cellCenter(i);
            const dist = Math.hypot(cx - pulse.x, cy - pulse.y);
            if (Math.abs(dist - ringR) < band / 2 && p.maxOpacity > alphas[i]) {
              alphas[i] = p.maxOpacity;
              touched[i] = now;
            }
          }
        }
      }

      let anyVisible = pulses.length > 0;
      const fadeStep = dt / Math.max(p.fadeDuration, 16);
      const half = p.cellSize / 2;

      for (let i = 0; i < alphas.length; i += 1) {
        let a = alphas[i];
        if (a <= 0) continue;
        if (now - touched[i] > p.holdTime) {
          a = Math.max(0, a - fadeStep);
          alphas[i] = a;
          if (a <= 0) continue;
        }
        anyVisible = true;

        const [cx, cy] = cellCenter(i);
        const gradient = ctx.createRadialGradient(cx, cy, half * 0.1, cx, cy, p.cellSize);
        gradient.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, ${a})`);
        gradient.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`);

        const x = cx - half + 0.5;
        const y = cy - half + 0.5;
        const s = p.cellSize - 1;

        ctx.beginPath();
        if (p.cellRadius > 0) {
          ctx.roundRect(x, y, s, s, p.cellRadius);
        } else {
          ctx.rect(x, y, s, s);
        }
        if (p.fillOpacity > 0) {
          ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${a * p.fillOpacity})`;
          ctx.fill();
        }
        ctx.strokeStyle = gradient;
        ctx.lineWidth = p.lineWidth;
        ctx.stroke();
      }

      if (anyVisible) {
        raf = window.requestAnimationFrame(draw);
      } else {
        running = false;
        if (propsRef.current.gridOpacity <= 0) ctx.clearRect(0, 0, w, h);
      }
    };

    const wake = () => {
      if (running) return;
      running = true;
      lastFrame = performance.now();
      raf = window.requestAnimationFrame(draw);
    };
    wakeRef.current = wake;

    const toLocal = e => {
      const rect = canvas.getBoundingClientRect();
      return [e.clientX - rect.left, e.clientY - rect.top];
    };

    const onPointerMove = e => {
      const [x, y] = toLocal(e);
      energize(x, y);
      wake();
    };

    const onPointerDown = e => {
      if (!propsRef.current.clickPulse) return;
      const [x, y] = toLocal(e);
      pulses.push({x, y, t0: performance.now()});
      wake();
    };

    const ro = new ResizeObserver(() => {
      rebuild();
      wake();
    });
    ro.observe(container);
    rebuild();
    // The one guaranteed paint: even with no pointer anywhere, the static
    // lattice must be on screen. With pointer tracking active this first
    // frame is also where the loop starts; in still mode it is the ONLY
    // frame — nothing re-wakes it afterwards except a resize.
    wake();

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarsePointer =
      window.matchMedia("(hover: none)").matches ||
      window.matchMedia("(pointer: coarse)").matches;

    if (!reducedMotion && !coarsePointer) {
      window.addEventListener("pointermove", onPointerMove, {passive: true});
      window.addEventListener("pointerdown", onPointerDown, {passive: true});
    }

    return () => {
      window.cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [cellSize]);

  // Repaint static layers when visual props change while idle
  useEffect(() => {
    if (wakeRef.current) wakeRef.current();
  }, [gridOpacity, color, lineWidth, maxOpacity, fillOpacity, cellRadius]);

  return (
    <div ref={containerRef} className={`cursor-grid${className ? ` ${className}` : ""}`}>
      <canvas ref={canvasRef} className="cursor-grid__canvas" />
    </div>
  );
};

export default CursorGrid;
