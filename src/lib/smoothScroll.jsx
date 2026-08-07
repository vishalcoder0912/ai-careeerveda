import {createContext, useContext, useEffect, useState} from "react";
import Lenis from "lenis";

// One Lenis for the whole app.
//
// Mounted at the root rather than per page, so a route change does not tear the
// instance down and build a new one — and, more importantly, so there is only
// ever one thing driving window scroll. ScrollStack used to construct its own;
// it now asks for this one (see useLenis there). Two instances both hijacking
// the wheel is not a degraded experience, it is a broken one: they fight for the
// scroll position every frame.
const LenisContext = createContext(null);

// The instance, or null when smooth scrolling is off (reduced motion, or a route
// that did not ask for it). Every consumer must handle null — that is the
// no-smooth-scroll path, not an error.
export const useLenis = () => useContext(LenisContext);

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const SmoothScrollProvider = ({enabled = true, children}) => {
  const [lenis, setLenis] = useState(null);

  useEffect(() => {
    // Reduced motion gets native scrolling, not a slowed-down version of the
    // effect. `duration: 0` still routes every wheel tick through Lenis's rAF
    // loop; skipping construction entirely is both the honest reading of the
    // preference and the cheaper one.
    // No setState here: on the first run the state is already null, and on a
    // true→false flip the previous run's cleanup has already nulled it. Setting
    // it again would only schedule a render that changes nothing.
    if (!enabled || prefersReducedMotion()) return undefined;

    const instance = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      // The OS already applies momentum to a touch drag. Multiplying much above
      // 1 on top of that reads as the page sliding away from your finger.
      touchMultiplier: 1.5,
      infinite: false,
    });

    // Publishing an external system to the tree is what this state is for:
    // Lenis binds to window, so it can only be constructed after mount and must
    // be torn down on unmount. There is no render-time value to derive it from.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLenis(instance);

    let disposed = false;
    let rafId = null;
    let gsapTicker = null;
    let detachScrollTrigger = null;

    // GSAP is in this project and ScrollTrigger is used by
    // hooks/useCinematicInteractions.js. Where both are present they must share
    // one clock: a separate rAF loop means Lenis writes a scroll position in one
    // frame and ScrollTrigger reads the old one in another, and pinned elements
    // jitter by exactly one frame. Driving Lenis from gsap.ticker removes the
    // second loop entirely.
    //
    // Imported dynamically so a route that never touches GSAP does not pull it
    // in just to set up scrolling.
    const wireToGsap = async () => {
      try {
        const [{default: gsap}, {ScrollTrigger}] = await Promise.all([
          import("gsap"),
          import("gsap/ScrollTrigger"),
        ]);
        if (disposed) return;

        gsap.registerPlugin(ScrollTrigger);

        const update = () => ScrollTrigger.update();
        instance.on("scroll", update);
        detachScrollTrigger = () => instance.off("scroll", update);

        gsapTicker = (time) => instance.raf(time * 1000); // gsap.ticker is seconds
        gsap.ticker.add(gsapTicker);
        gsap.ticker.lagSmoothing(0);
      } catch {
        // No GSAP resolvable — fall back to our own loop.
        if (disposed) return;
        const raf = (time) => {
          instance.raf(time);
          rafId = requestAnimationFrame(raf);
        };
        rafId = requestAnimationFrame(raf);
      }
    };

    wireToGsap();

    return () => {
      disposed = true;
      if (rafId) cancelAnimationFrame(rafId);
      detachScrollTrigger?.();
      if (gsapTicker) {
        import("gsap")
          .then(({default: gsap}) => gsap.ticker.remove(gsapTicker))
          .catch(() => {});
      }
      instance.destroy();
      setLenis(null);
    };
  }, [enabled]);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
};

/**
 * Smooth-scrolls in-page anchors, clearing a sticky header.
 *
 * Without this an `href="#faq"` is a native jump: instant, and landing with the
 * target's first line underneath the fixed header. Delegated from one listener
 * on the container rather than bound per link, so links rendered later are
 * covered without re-binding.
 *
 * Falls back to `scrollIntoView` when Lenis is off, so reduced-motion users
 * still get the header offset — the offset is a layout fix, not a flourish.
 */
export const useAnchorScroll = (containerRef, {headerHeight = 76} = {}) => {
  const lenis = useLenis();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const onClick = (event) => {
      // Let the browser handle modified clicks — a ctrl/cmd-click on an anchor
      // is a request for a new tab, not a request to scroll this one.
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) return;

      const link = event.target.closest?.('a[href^="#"]');
      if (!link || !container.contains(link)) return;

      const id = link.getAttribute("href").slice(1);
      if (!id) return;

      const target = document.getElementById(id);
      if (!target) return;

      event.preventDefault();

      if (lenis) {
        lenis.scrollTo(target, {offset: -headerHeight});
      } else {
        const top = target.getBoundingClientRect().top + window.scrollY - headerHeight;
        window.scrollTo({top, behavior: "auto"});
      }

      // Scrolling to a section must also move focus there, or a keyboard user
      // activates the link and their focus stays behind in the nav. tabIndex -1
      // makes a non-interactive section focusable without adding it to the tab
      // order; preventScroll stops the browser undoing the smooth scroll.
      target.setAttribute("tabindex", "-1");
      target.focus({preventScroll: true});
    };

    container.addEventListener("click", onClick);
    return () => container.removeEventListener("click", onClick);
    // Re-binds when Lenis appears or goes away, which is once per route rather
    // than per render — cheaper than reading it out of a ref during render.
  }, [containerRef, headerHeight, lenis]);
};

/**
 * Pauses Lenis while an overlay owns the screen.
 *
 * A modal with its own scrollable body is the classic Lenis failure: Lenis
 * keeps consuming wheel events for the page underneath, so the page scrolls
 * behind the dialog and the dialog's own content does not. Call with `true`
 * while open.
 */
export const useLockSmoothScroll = (locked) => {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis || !locked) return undefined;

    lenis.stop();
    return () => lenis.start();
  }, [lenis, locked]);
};

/**
 * Scroll progress 0→1 for the whole document, sampled from Lenis when it is
 * running and from the native scroll otherwise.
 *
 * Used for the nav's blur/opacity so it eases continuously instead of snapping
 * at one pixel threshold.
 */
export const useScrollProgress = () => {
  const lenis = useLenis();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const read = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };

    read();

    if (lenis) {
      lenis.on("scroll", read);
      return () => lenis.off("scroll", read);
    }

    window.addEventListener("scroll", read, {passive: true});
    window.addEventListener("resize", read);
    return () => {
      window.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
    };
  }, [lenis]);

  return progress;
};

/**
 * Current scroll offset in px, read from Lenis when it is running.
 *
 * Lenis's value is the interpolated position it is actually painting, which is
 * what a parallax has to track — `window.scrollY` during a smooth scroll is the
 * target, not the current frame, so tying a parallax to it makes the layer race
 * ahead of the content it is supposed to lag behind.
 */
export const useSmoothScrollY = () => {
  const lenis = useLenis();
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (lenis) {
      const read = ({scroll}) => setOffset(scroll);
      lenis.on("scroll", read);
      return () => lenis.off("scroll", read);
    }

    const read = () => setOffset(window.scrollY);
    read();
    window.addEventListener("scroll", read, {passive: true});
    return () => window.removeEventListener("scroll", read);
  }, [lenis]);

  return offset;
};
