import {useEffect, useRef} from "react";
import {gsap} from "gsap";
import {addTween, reducedMotionNow} from "../fx/registry";
import {useMagneticHover} from "../fx/hooks";
import {ArrowDownRight} from "lucide-react";

const HERO_LINES = ["GEN AI &", "AGENTIC AI ENGINEERING"];

const HERO_BADGES = [
  "24 WEEKS",
  "6 MONTHS",
  "PROJECT-DRIVEN",
  "GPU-ENABLED",
  "PRODUCTION-ORIENTED",
  "HACKATHON-FIRST",
];

export const HeroSection = () => {
  const rootRef = useRef(null);
  const bgRef = useRef(null);
  const streakRef = useRef(null);
  const linesRef = useRef([]);
  const subRef = useRef(null);
  const ctaRef = useRef(null);
  const extraLeft = useRef(null);
  const extraRight = useRef(null);
  const statsRef = useRef(null);
  const magneticA = useMagneticHover(0.35);
  const magneticB = useMagneticHover(0.35);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const els = [
      ...linesRef.current,
      subRef.current,
      ctaRef.current,
      statsRef.current,
      extraLeft.current,
      extraRight.current,
    ].filter(Boolean);

    if (reducedMotionNow()) {
      gsap.set(els, {opacity: 1});
      return undefined;
    }

    const tween = gsap.fromTo(
      els,
      {opacity: 0, y: 14},
      {opacity: 1, y: 0, duration: 0.7, ease: "power1.out", stagger: 0.06},
    );
    addTween(tween);

    return () => tween.kill();
  }, []);

  const scrollTo = (id) => () => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({behavior: "smooth"});
  };

  return (
    <section className="ga-hero" id="ga-top" ref={rootRef}>
      <div className="ga-hero-bg" ref={bgRef}>
        <span className="ga-hero-glow ga-hero-glow-a" />
        <span className="ga-hero-glow ga-hero-glow-b" />
        <span className="ga-hero-glow-arch" />
        <span className="ga-hero-columns" aria-hidden="true" />
        <span className="ga-hero-floor" aria-hidden="true" />
      </div>

      <div className="ga-hero-streak" ref={streakRef} aria-hidden="true" />

      <div className="ga-hero-extra ga-hero-extra-l" ref={extraLeft}>
        <span className="ga-meta">6-MONTH PROFESSIONAL PROGRAM</span>
        <span className="ga-hero-rule" />
      </div>
      <div className="ga-hero-extra ga-hero-extra-r" ref={extraRight}>
        <span className="ga-meta">Batch 2026 · Applications open</span>
      </div>

      <div className="ga-hero-content">
        <div className="ga-hero-eyebrow">
          <span className="ga-eyebrow-line" />
          <span>CAREERVEDA · PROFESSIONAL PROGRAM</span>
        </div>

        <h1 className="ga-hero-title" aria-label="PG Program in Gen AI and Agentic AI Engineering">
          {HERO_LINES.map((line, i) => (
            <span
              key={line}
              className={`ga-hero-line${i === 1 ? " ga-hero-line-italic" : ""}`}
              ref={(el) => {
                if (el) linesRef.current[i] = el;
              }}
            >
              {line}
            </span>
          ))}
        </h1>

        <p className="ga-hero-sub" ref={subRef}>
          Build AI. Break AI. Measure AI. Secure AI. Deploy AI — from Python to production agents.
        </p>

        <div className="ga-hero-badges" ref={subRef} aria-hidden="true">
          {HERO_BADGES.map((b) => <span key={b}>{b}</span>)}
        </div>

        <div className="ga-hero-stats" ref={statsRef}>
          <span className="ga-hero-stat">
            <strong>24 Weeks</strong>
            <em>Duration</em>
          </span>
          <span className="ga-hero-stat">
            <strong>Expert AI Mentors</strong>
            <em>Mentorship</em>
          </span>
          <span className="ga-hero-stat">
            <strong>Live Online</strong>
            <em>Format</em>
          </span>
          <span className="ga-hero-stat">
            <strong>10,000+</strong>
            <em>Learners</em>
          </span>
        </div>

        <div className="ga-hero-ctas" ref={ctaRef}>
          <button type="button" className="ga-btn ga-btn-solid" data-cursor="cta" ref={magneticA} onClick={scrollTo("ga-architecture")}>
            <span>Explore Program</span>
            <ArrowDownRight size={17} aria-hidden="true" />
          </button>
          <a href="#ga-cta" className="ga-btn ga-btn-outline" data-cursor="cta" ref={magneticB} onClick={(e) => {
            e.preventDefault();
            const el = document.getElementById("ga-cta");
            if (el) el.scrollIntoView({behavior: "smooth"});
          }}>
            Download Brochure
          </a>
        </div>
      </div>

      <img
        className="ga-hero-side-image"
        src="/images/agentic-ai-robot.jpg"
        alt=""
        width="1200"
        height="900"
        decoding="async"
        aria-hidden="true"
      />
    </section>
  );
};