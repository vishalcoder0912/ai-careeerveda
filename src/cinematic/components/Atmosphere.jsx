import {useEffect, useRef, useState} from "react";
import {reducedMotionNow} from "../fx/registry";

/* ────────────────────────────────────────────────────────────────────────────
   ParticleField — one fixed canvas behind the whole cinematic page.
   Low density, warm amber particles, thin connections, gentle cursor repulsion.
──────────────────────────────────────────────────────────────────────────── */
export const ParticleField = ({className = ""}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d", {alpha: true});
    if (!ctx) return undefined;

    if (reducedMotionNow()) {
      canvas.remove();
      return undefined;
    }
    const fine = window.matchMedia("(pointer: fine)").matches;
    const DPR = Math.min(window.devicePixelRatio || 1, 1.75);

    let width = 0;
    let height = 0;
    let particles = [];
    let raf = null;
    const mouse = {x: -9999, y: -9999};
    let running = true;

    const palette = ["rgba(90,130,237,", "rgba(59,130,246,", "rgba(89,111,180,", "rgba(130,177,246,"];

    const makeParticle = () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.5 + Math.random() * 1.3,
      vx: (Math.random() - 0.5) * 0.12,
      vy: -0.04 - Math.random() * 0.14,
      hue: palette[(Math.random() * palette.length) | 0],
    });

    const resize = () => {
      const area = window.innerWidth * window.innerHeight;
      const target = Math.min(110, Math.round(area / 24000)); // low density
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * DPR);
      canvas.height = Math.round(height * DPR);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const now = particles.length;
      if (target > now) {
        for (let i = now; i < target; i += 1) particles.push(makeParticle());
      } else {
        particles = particles.slice(0, target);
      }
    };
    resize();

    const onMouse = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const onMouseLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    const draw = () => {
      if (!running) return;
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -6) {
          p.y = height + 6;
          p.x = Math.random() * width;
        }
        if (p.x < -6) p.x = width + 6;
        if (p.x > width + 6) p.x = -6;

        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (fine && d2 < 130 * 130) {
          const d = Math.sqrt(d2) || 1;
          const force = (130 - d) / 130;
          p.x += (dx / d) * force * 0.5;
          p.y += (dy / d) * force * 0.5;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `${p.hue}${0.24 + Math.random() * 0.14})`;
        ctx.fill();
      }

      const maxLink = 130;
      for (let i = 0; i < particles.length; i += 1) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j += 1) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = dx * dx + dy * dy;
          if (d < maxLink * maxLink) {
            const alpha = (1 - Math.sqrt(d) / maxLink) * 0.07;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(242,200,120,${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    const onVisibility = () => {
      running = document.visibilityState === "visible";
      if (running) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(draw);
      }
    };

    const onResize = () => {
      resize();
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onMouse, {passive: true});
    document.addEventListener("pointerleave", onMouseLeave);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMouse);
      document.removeEventListener("pointerleave", onMouseLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      particles = [];
    };
  }, []);

  return <canvas ref={canvasRef} className={`ga-particles ${className}`} aria-hidden="true" />;
};

/* ────────────────────────────────────────────────────────────────────────────
   FilmGrain — barely-visible animated film grain over everything.
──────────────────────────────────────────────────────────────────────────── */
export const FilmGrain = () => {
  const [grain, setGrain] = useState(false);
  useEffect(() => {
    const id = requestIdleCallback
      ? requestAnimationFrame(() => setGrain(true))
      : setTimeout(() => setGrain(true), 0);
    return () => (id.cancel ? id.cancel() : clearTimeout(id));
  }, []);
  if (!grain) return null;
  return <div className="ga-grain" aria-hidden="true" />;
};

/* ────────────────────────────────────────────────────────────────────────────
   CustomCursor — centered dot + lagging ring. Desktop only.
──────────────────────────────────────────────────────────────────────────── */
export const CustomCursor = () => {
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches || reducedMotionNow()) {
      return undefined;
    }
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return undefined;

    let raf = null;
    let mx = 0;
    let my = 0;
    let rx = 0;
    let ry = 0;
    let shown = false;
    let active = false;

    document.documentElement.classList.add("ga-cursor-active");

    const onMove = (e) => {
      mx = e.clientX;
      my = e.clientY;
      if (!shown) {
        rx = mx;
        ry = my;
        dot.style.opacity = 1;
        ring.style.opacity = 1;
        shown = true;
      }
      const t = e.target;
      active = Boolean(t && t.closest && t.closest("a, button, [data-cursor]"));
      const cta = Boolean(t && t.closest && t.closest("[data-cursor='cta']"));
      ring.classList.toggle("ga-ring-hover", active);
      ring.classList.toggle("ga-ring-cta", cta);
      if (!raf) raf = requestAnimationFrame(loop);
    };

    const loop = () => {
      raf = null;
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      dot.style.transform = `translate3d(${mx - 2}px, ${my - 2}px, 0)`;
      ring.style.transform = `translate3d(${rx - 18}px, ${ry - 18}px, 0)`;
      if (Math.abs(mx - rx) > 0.05 || Math.abs(my - ry) > 0.05) {
        raf = requestAnimationFrame(loop);
      }
    };

    const onDown = () => ring.classList.add("ga-ring-down");
    const onUp = () => ring.classList.remove("ga-ring-down");
    const onLeaveDoc = () => {
      dot.style.opacity = 0;
      ring.style.opacity = 0;
      shown = false;
    };

    window.addEventListener("pointermove", onMove, {passive: true});
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    document.documentElement.addEventListener("pointerleave", onLeaveDoc);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeaveDoc);
      document.documentElement.classList.remove("ga-cursor-active");
    };
  }, []);

  if (reducedMotionNow()) return null;
  return (
    <>
      <div className="ga-cursor-dot" ref={dotRef} aria-hidden="true" />
      <div className="ga-cursor-ring" ref={ringRef} aria-hidden="true" />
    </>
  );
};

/* ────────────────────────────────────────────────────────────────────────────
   SectionLabel — tiny uppercase editorial label used at the top of sections.
──────────────────────────────────────────────────────────────────────────── */
export const SectionLabel = ({children, index}) => (
  <div className="ga-section-label">
    {index !== undefined && <span className="ga-label-index">{index}</span>}
    <span className="ga-label-text">{children}</span>
  </div>
);