import {useEffect, useRef, useState, useCallback} from "react";
import {gsap} from "gsap";
import {reducedMotionNow} from "./registry";

/* ── useParallax ─────────────────────────────────────────────────────────────
   Drifts an element slower than the page (or faster) while it is on screen.
   `speed` is a small signed factor; negative moves up faster than scroll. */
export const useParallax = (speed = 0.06) => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotionNow() || !window.matchMedia("(min-width: 900px)").matches) {
      return undefined;
    }
    const t = gsap.fromTo(
      el,
      {yPercent: -speed * 60},
      {
        yPercent: speed * 60,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.6,
        },
      },
    );
    return () => {
      t.scrollTrigger?.kill();
      t.kill();
    };
  }, [speed]);

  return ref;
};

/* ── useInView ───────────────────────────────────────────────────────────────
   Fires once when the element enters the viewport. The cheap, non-GSAP path
   for anything that does not need scrubbing. */
export const useInView = ({threshold = 0.2, once = true} = {}) => {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) io.disconnect();
          } else if (!once) {
            setInView(false);
          }
        });
      },
      {threshold, rootMargin: "0px 0px -8% 0px"},
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, once]);

  return [ref, inView];
};

/* ── useCountUp ──────────────────────────────────────────────────────────────
   Eases a number from 0 → target once the element scrolls into view. */
export const useCountUp = (target, {duration = 1800, decimals = 0} = {}) => {
  const ref = useRef(null);
  const [value, setValue] = useState(0);
  const [started, setStarted] = useState(false);
  const rafRef = useRef(null);

  const reset = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setStarted(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setStarted(true);
          io.disconnect();
        }
      },
      {threshold: 0.4},
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return undefined;
    if (reducedMotionNow()) {
      const id = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(id);
    }
    const t0 = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(2, -10 * t); // expo.out
      const current = t >= 1 ? target : target * (t === 0 ? 0 : eased);
      setValue(current);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return reset;
  }, [started, target, duration, reset]);

  const formatted = value.toFixed(decimals);
  return [ref, formatted];
};

/* ── useMagneticHover ───────────────────────────────────────────────────────
   Swings an element toward the cursor with a lerp, then relaxes on leave.
   Desktop only (pointer: fine). */
export const useMagneticHover = (intensity = 0.3) => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = reducedMotionNow();
    if (!fine || reduced) return undefined;

    let raf = null;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let active = false;
    const restored = el.style.transform || "";

    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      cx = e.clientX - (r.left + r.width / 2);
      cy = e.clientY - (r.top + r.height / 2);
      active = true;
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const onLeave = () => {
      active = false;
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const loop = () => {
      raf = null;
      tx += (cx - tx) * 0.18;
      ty += (cy - ty) * 0.18;
      const targetX = active ? tx * intensity : 0;
      const targetY = active ? ty * intensity : 0;
      el.style.transform =
        `${restored ? `${restored} ` : ""}translate3d(${targetX.toFixed(1)}px, ${targetY.toFixed(1)}px, 0)`;
      if (Math.abs(tx) > 0.1 || Math.abs(ty) > 0.1 || active) {
        raf = requestAnimationFrame(loop);
      }
    };

    el.addEventListener("pointermove", onMove, {passive: true});
    el.addEventListener("pointerleave", onLeave, {passive: true});
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.style.transform = restored;
    };
  }, [intensity]);

  return ref;
};

/* ── useTilt ─────────────────────────────────────────────────────────────────
   Perspective tilt toward the cursor for floating cards. Respects reduced
   motion and touch. */
export const useTilt = (max = 7) => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const fine = window.matchMedia("(pointer: fine)").matches;
    if (!fine || reducedMotionNow()) return undefined;
    const restored = el.style.transform || "";

    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform =
        `${restored ? `${restored} ` : ""}perspective(900px) rotateX(${(-py * max).toFixed(2)}deg) ` +
        `rotateY(${(px * max).toFixed(2)}deg) translateY(-4px)`;
    };
    const onLeave = () => {
      el.style.transform = restored;
    };

    el.addEventListener("pointermove", onMove, {passive: true});
    el.addEventListener("pointerleave", onLeave, {passive: true});
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.style.transform = restored;
    };
  }, [max]);

  return ref;
};