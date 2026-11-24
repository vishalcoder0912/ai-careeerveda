import {useEffect, useState} from "react";
import {Reveal} from "./motionPrimitives";
import "./page-shell.css";

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = (event) => setReduced(event.matches);
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  return reduced;
};

// Hero band for a standalone route. Animates in on mount — the entrance was
// framer-motion's staggerChildren; now it is the same rise, delayed per child
// in CSS (see motion-primitives.css), so the animation library never loads for
// it. Reduced motion is handled by the same media query.
export const PageHero = ({eyebrow, title, lead, children}) => {
  const reduced = usePrefersReducedMotion();
  // Inline delays win over the reduced-motion stylesheet. Leaving them off
  // entirely is what makes the hero visible on the first paint instead of
  // blank for 0.05–0.32s and then popping in.
  const delay = (seconds) => (reduced ? undefined : {animationDelay: `${seconds}s`});

  return (
    <header className="page-hero">
      <div className="ps-inner">
        {eyebrow && (
          <span className="page-hero__eyebrow cv-page-hero-item" style={delay(0.05)}>
            {eyebrow}
          </span>
        )}
        <h1 className="page-hero__title cv-page-hero-item" style={delay(0.14)}>
          {title}
        </h1>
        {lead && (
          <p className="page-hero__lead cv-page-hero-item" style={delay(0.23)}>
            {lead}
          </p>
        )}
        {children && (
          <div className="page-hero__actions cv-page-hero-item" style={delay(0.32)}>
            {children}
          </div>
        )}
      </div>
    </header>
  );
};

// Scroll-reveal section heading (label + title + optional description).
export const SectionHeading = ({label, title, children, className = ""}) => (
  <Reveal className={`page-heading ${className}`.trim()}>
    {label && <span className="label">{label}</span>}
    <h2>{title}</h2>
    {children && <p>{children}</p>}
  </Reveal>
);