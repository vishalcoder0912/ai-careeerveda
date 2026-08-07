import {useEffect,useRef} from "react";

// GSAP now owns only the effects Framer Motion isn't driving:
// the section parallax and the projects counter. Reveals, staggers, and card
// hover are handled by Framer Motion (see components/motionPrimitives.jsx).
//
// The scroll-progress bar and the smooth anchor links used to be in here too, and
// they are what made this hook load gsap for everybody. Neither needed it: the bar
// is one scaleX per frame and the anchors were only ever calling the browser's own
// scrollIntoView — gsap.utils.toArray was doing the work of querySelectorAll. They
// are plain DOM below, and gsap is now fetched only when there is something on the
// page that actually requires it. On a phone that is nothing: the parallax is
// already withheld there (see below), so the home page no longer downloads 45 KB
// gzipped — and parses ~115 KB on the slowest CPU we serve — to animate a 3px bar.
const PARALLAX_TARGETS = ".section-block, .partner-band, .consultation-section";

export const useCinematicInteractions = () => {
  const pageRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined" || !pageRef.current) return undefined;

    const page = pageRef.current;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // The parallax scrubs background-position on every section as you scroll — a
    // full repaint per frame, on the same main thread a phone is already using to
    // boot the app. It is a subtle drift nobody has asked for on a 6-inch screen,
    // so phones skip it and keep the frames.
    const isPhone = window.matchMedia("(max-width: 768px)").matches;
    const cleanupFns = [];

    // ── The progress bar: a passive scroll listener and one transform. ────────
    const bar = document.querySelector(".scroll-progress");
    if (bar) {
      let frame = null;
      bar.style.transformOrigin = "left center";
      const paint = () => {
        frame = null;
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
        bar.style.transform = `scaleX(${Math.min(1, Math.max(0, progress))})`;
      };
      const onScroll = () => {
        // Coalesce to one paint per frame: scroll fires far more often than the
        // screen refreshes, and this runs on every one of them.
        if (frame === null) frame = window.requestAnimationFrame(paint);
      };
      paint();
      window.addEventListener("scroll", onScroll, {passive: true});
      window.addEventListener("resize", onScroll, {passive: true});
      cleanupFns.push(() => {
        if (frame !== null) window.cancelAnimationFrame(frame);
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
      });
    }

    // ── Smooth anchor scrolling: the browser's own, no library. ───────────────
    page.querySelectorAll("a[href^='#']").forEach((link) => {
      const handleClick = (event) => {
        const targetId = link.getAttribute("href");
        if (!targetId || targetId === "#") return;

        const target = document.querySelector(targetId);
        if (!target) return;

        event.preventDefault();
        target.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "start",
        });
      };

      link.addEventListener("click", handleClick);
      cleanupFns.push(() => link.removeEventListener("click", handleClick));
    });

    // ── Everything below is gsap's, and only loads if it has work to do. ──────
    const wantsParallax =
      !prefersReducedMotion && !isPhone && document.querySelector(PARALLAX_TARGETS);
    const counterTarget = document.querySelector(".project-number strong");
    if (!wantsParallax && !counterTarget) {
      return () => cleanupFns.forEach((cleanup) => cleanup());
    }

    let context;
    let cancelled = false;

    (async () => {
      const [{default: gsap}, {ScrollTrigger}] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;

      gsap.registerPlugin(ScrollTrigger);

      context = gsap.context(() => {
        if (wantsParallax) {
          /* The per-section background drift that used to live here is gone.
             It scrubbed `background-position` across .section-block,
             .partner-band and .consultation-section — and every one of those
             backgrounds is a radial or linear gradient sized 140%. A gradient
             is rasterised, not composited, so moving its position invalidates
             the whole section and forces a full repaint. With several sections
             in view at once that is several full-section repaints per scroll
             frame, on the main thread, for a drift most visitors never notice.
             It was the single largest source of scroll jank on desktop.

             The parallax below survives because it animates `yPercent` — a
             transform, which the compositor can move without repainting
             anything. Same idea, none of the cost. If the section drift is
             wanted back, it needs to move to a transformed pseudo-element
             layer rather than returning as a background-position scrub. */
          if (document.querySelector(".strategy-layout") && document.querySelector(".strategy-section")) {
            gsap.to(".strategy-layout", {
              yPercent: -3,
              ease: "none",
              scrollTrigger: {
                trigger: ".strategy-section",
                start: "top bottom",
                end: "bottom top",
                scrub: 0.75,
              },
            });
          }
        }

        if (counterTarget) {
          const projectCounter = {value: 0};
          ScrollTrigger.create({
            trigger: ".project-number",
            start: "top 78%",
            once: true,
            onEnter: () => {
              gsap.to(projectCounter, {
                value: 500,
                duration: 1.35,
                ease: "power3.out",
                snap: {value: 1},
                onUpdate: () => {
                  counterTarget.textContent = `${projectCounter.value}+`;
                },
              });
            },
          });
        }

        ScrollTrigger.refresh();
      },pageRef);
    })();

    return () => {
      cancelled = true;
      cleanupFns.forEach((cleanup) => cleanup());
      context?.revert();
    };
  },[]);

  return pageRef;
};
