import {motion,useReducedMotion} from "framer-motion";
import {Reveal} from "./motionPrimitives";
import "./page-shell.css";

const EASE = [0.22, 1, 0.36, 1];

// Hero band for a standalone route. Animates in on mount.
export const PageHero = ({eyebrow, title, lead, children}) => {
  const reduce = useReducedMotion();
  const container = reduce
    ? {}
    : {hidden: {}, visible: {transition: {staggerChildren: 0.09, delayChildren: 0.05}}};
  // Opacity and transform only — no blur. This hero animates on mount, so its
  // frames land in the middle of the page's own load; see the note in
  // motionPrimitives.jsx for what an animated filter costs there.
  const item = reduce
    ? {}
    : {
        hidden: {opacity: 0, y: 24},
        visible: {opacity: 1, y: 0, transition: {duration: 0.7, ease: EASE}},
      };

  return (
    <header className="page-hero">
      <motion.div
        className="ps-inner"
        variants={container}
        initial={reduce ? false : "hidden"}
        animate={reduce ? false : "visible"}
      >
        {eyebrow && <motion.span className="page-hero__eyebrow" variants={item}>{eyebrow}</motion.span>}
        <motion.h1 className="page-hero__title" variants={item}>{title}</motion.h1>
        {lead && <motion.p className="page-hero__lead" variants={item}>{lead}</motion.p>}
        {children && <motion.div className="page-hero__actions" variants={item}>{children}</motion.div>}
      </motion.div>
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
