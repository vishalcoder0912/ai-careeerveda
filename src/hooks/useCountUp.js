import {useEffect, useRef, useState} from "react";

// Counts 0 → target once the element is on screen.
//
// IntersectionObserver, not a scroll listener and not a timer on mount: a timer
// fires whether or not anyone is looking, so a stat below the fold has finished
// counting before the reader arrives and they see a static number. The observer
// is disconnected after the first hit — a counter that replays every time you
// scroll past is a distraction, not a flourish.
//
// The animation is driven by rAF against elapsed time rather than by a fixed
// increment per frame, so it takes the same wall-clock duration on a 60Hz and a
// 120Hz display.
//
// What is held in state is the progress of that animation, not the number on
// screen. Progress is the part that genuinely cannot be worked out while
// rendering — it depends on the clock and on when the element came into view.
// The number itself is just `target` scaled by progress, so it is computed
// during render: one render per frame instead of two, and the displayed figure
// can never be left showing a number belonging to a previous `target`.
const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  Boolean(window.matchMedia) &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const useCountUp = (target, {duration = 1600, decimals = 0} = {}) => {
  const ref = useRef(null);
  // Reduced motion starts finished. The information is the number; the counting
  // is decoration. A lazy initialiser rather than a setState inside the effect,
  // so the first paint already shows the final figure instead of painting 0 and
  // then correcting it a frame later.
  const [progress, setProgress] = useState(() => (prefersReducedMotion() ? 1 : 0));

  useEffect(() => {
    const element = ref.current;
    if (!element || prefersReducedMotion()) return undefined;

    let frame = null;
    let start = null;

    const step = (time) => {
      if (start === null) start = time;
      const elapsed = Math.min(1, (time - start) / duration);

      setProgress(elapsed);

      if (elapsed < 1) frame = requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        observer.disconnect();
        frame = requestAnimationFrame(step);
      },
      {threshold: 0.4},
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [duration]);

  // Ease-out cubic: fast at first, settling at the end, which reads as the
  // number arriving rather than as a linear tick.
  const eased = 1 - Math.pow(1 - progress, 3);
  const next = target * eased;
  const value = decimals > 0 ? Number(next.toFixed(decimals)) : Math.round(next);

  return {ref, value};
};

export default useCountUp;
