import {Suspense, lazy, useEffect, useRef, useState} from "react";
import {useViewportTier} from "../hooks/useViewportTier";

// Antigravity pulls in three.js (~733 KB), so it is code-split and only mounted
// when this backdrop is actually going to run — desktop, motion allowed, and
// near the viewport. See RecommendedCourses1 for the same pattern.
const Antigravity = lazy(() => import("./ui/Antigravity"));

// A contained particle field that sits *behind* the consultation heading text
// only. It fills its parent (.consultation-copy) via CSS (position:absolute;
// inset:0; z-index:-1), so the effect never spills past the text block and never
// covers the form beside it.
//
// `eventSource` is the .consultation-copy element itself: the wrapper here is
// pointer-events:none so it can't block the copy, and R3F reads the cursor from
// the copy's box instead — which is exactly the box the canvas fills, so the
// magnet focal point lines up with the pointer.
const ConsultationAtmosphere = ({eventSource}) => {
  const hostRef = useRef(null);
  const [inView, setInView] = useState(false);
  // Same two gates the three.js field always had, read directly instead of
  // through framer-motion: reduced motion is a media query, and "near the
  // viewport" is an IntersectionObserver.
  const [reduceMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const tier = useViewportTier();

  // Start ~250px early so the field is already running by the time the section
  // scrolls in, and keep it mounted only while it's roughly on screen.
  useEffect(() => {
    const el = hostRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      {threshold: 0.05, rootMargin: "250px 0px"},
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // A dense, fast particle field on a phone reads as noise, and a visitor who
  // asked for less motion should not be handed a simulation. Either way, no
  // three.js is fetched for them.
  const showParticles = tier === "desktop" && !reduceMotion && inView;

  return (
    <div className="consultation-atmosphere" ref={hostRef} aria-hidden="true">
      {showParticles && (
        <Suspense fallback={null}>
          <Antigravity
            eventSource={eventSource}
            frameloop="always"
            /* dpr 1, same as the Recommended field: a laptop's 1.5x ratio
               shades 2.25x the pixels per frame for decoration sitting behind
               a translucent wrapper. */
            dpr={1}
            count={170}
            magnetRadius={13}
            ringRadius={9}
            waveSpeed={0.35}
            waveAmplitude={0.6}
            particleSize={1.9}
            lerpSpeed={0.045}
            color="#7c6cff"
            autoAnimate
            particleVariance={0.8}
            rotationSpeed={0.05}
            depthFactor={0.7}
            pulseSpeed={2.5}
            particleShape="sphere"
            fieldStrength={12}
          />
        </Suspense>
      )}
    </div>
  );
};

export default ConsultationAtmosphere;
