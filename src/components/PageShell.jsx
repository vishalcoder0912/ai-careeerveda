import {Reveal} from "./motionPrimitives";
import "./page-shell.css";

// Hero band for a standalone route. Animates in on mount — the entrance was
// framer-motion's staggerChildren; now it is the same rise, delayed per child
// in CSS (see motion-primitives.css), so the animation library never loads for
// it. Reduced motion is handled by the same media query.
export const PageHero = ({eyebrow, title, lead, children}) => {
  return (
    <header className="page-hero">
      <div className="ps-inner">
        {eyebrow && (
          <span className="page-hero__eyebrow cv-page-hero-item" style={{animationDelay: "0.05s"}}>
            {eyebrow}
          </span>
        )}
        <h1 className="page-hero__title cv-page-hero-item" style={{animationDelay: "0.14s"}}>
          {title}
        </h1>
        {lead && (
          <p className="page-hero__lead cv-page-hero-item" style={{animationDelay: "0.23s"}}>
            {lead}
          </p>
        )}
        {children && (
          <div className="page-hero__actions cv-page-hero-item" style={{animationDelay: "0.32s"}}>
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