import {useEffect, useRef} from "react";
import {gsap} from "gsap";
import {addTween, EASE, reducedMotionNow} from "../fx/registry";
import {useMagneticHover} from "../fx/hooks";
import {ArrowDownRight} from "lucide-react";

const HERO_LINES = ["GENERATIVE AI", "&", "AGENTIC AI"];

export const HeroSection = () => {
  const rootRef = useRef(null);
  const bgRef = useRef(null);
  const streakRef = useRef(null);
  const linesRef = useRef([]);
  const subRef = useRef(null);
  const ctaRef = useRef(null);
  const netRef = useRef(null);
  const extraLeft = useRef(null);
  const extraRight = useRef(null);
  const magneticA = useMagneticHover(0.35);
  const magneticB = useMagneticHover(0.35);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const reduced = reducedMotionNow();

    // ── Load sequence ───────────────────────────────────────────────────────
    if (reduced) {
      gsap.set([linesRef.current, subRef.current, ctaRef.current, netRef.current], {opacity: 1});
      return undefined;
    }

    gsap.set([linesRef.current, subRef.current, ctaRef.current, netRef.current], {opacity: 0});
    gsap.set(linesRef.current, {y: 34});
    gsap.set(subRef.current, {y: 16});
    gsap.set(ctaRef.current, {y: 14});
    gsap.set([extraLeft.current, extraRight.current], {opacity: 0});
    gsap.set(streakRef.current, {xPercent: -100, opacity: 0});

    const tl = gsap.timeline({defaults: {ease: EASE}});

    // 1. background eases out of black
    tl.fromTo(bgRef.current, {opacity: 0}, {opacity: 1, duration: 1.5, ease: "none"});
    // 2. light streak enters from the left
    tl.to(streakRef.current, {xPercent: 0, opacity: 1, duration: 1.4, ease: EASE}, "-=1.1");
    // 3. heading line by line
    linesRef.current.forEach((el) => {
      tl.to(el, {y: 0, opacity: 1, duration: 0.9, ease: EASE}, `-=0.5`);
    });
    // 4. subtitle
    tl.to(subRef.current, {y: 0, opacity: 1, duration: 0.7, ease: EASE}, "-=0.6");
    // 5. CTAs
    tl.to(ctaRef.current, {y: 0, opacity: 1, duration: 0.6, ease: EASE}, "-=0.55");
    // 6. ambient network behind the title switches on
    tl.to(netRef.current, {opacity: 1, duration: 1.2}, "-=0.4");
    tl.to([extraLeft.current, extraRight.current], {opacity: 1, duration: 1.4}, "-=0.9");

    addTween(tl);

    // ── Scroll-away camera push ────────────────────────────────────────────
    const cam = gsap.to(root, {
      yPercent: -6,
      opacity: 0.35,
      ease: "none",
      scrollTrigger: {
        trigger: root,
        start: "top top",
        end: "+=120%",
        scrub: 0.6,
      },
    });
    const zoom = gsap.to(bgRef.current, {
      scale: 1.12,
      ease: "none",
      scrollTrigger: {
        trigger: root,
        start: "top top",
        end: "+=80%",
        scrub: 0.5,
      },
    });
    addTween(cam);
    addTween(zoom);

    return () => {
      tl.kill();
      cam.scrollTrigger?.kill();
      cam.kill();
      zoom.scrollTrigger?.kill();
      zoom.kill();
    };
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

      {/* Constellation behind title */}
      <svg className="ga-hero-network" ref={netRef} viewBox="0 0 900 420" aria-hidden="true">
        <g stroke="rgba(242,200,120,0.14)" strokeWidth="0.6">
          <line x1="120" y1="120" x2="620" y2="60" />
          <line x1="620" y1="60" x2="760" y2="180" />
          <line x1="760" y1="180" x2="420" y2="300" />
          <line x1="420" y1="300" x2="120" y2="120" />
          <line x1="620" y1="60" x2="320" y2="220" />
          <line x1="120" y1="120" x2="420" y2="300" />
          <line x1="320" y1="220" x2="760" y2="180" />
        </g>
        <g fill="rgba(242,200,120,0.55)">
          <circle cx="120" cy="120" r="2" /><circle cx="620" cy="60" r="2.4" />
          <circle cx="760" cy="180" r="2" /><circle cx="420" cy="300" r="2.6" />
          <circle cx="320" cy="220" r="1.6" />
        </g>
      </svg>

      <div className="ga-hero-extra ga-hero-extra-l" ref={extraLeft}>
        <span className="ga-meta">INTELLIGENCE ENGINEERING</span>
        <span className="ga-hero-rule" />
      </div>
      <div className="ga-hero-extra ga-hero-extra-r" ref={extraRight}>
        <span className="ga-meta">BATCH 2026 · APPLICATIONS OPEN</span>
      </div>

      <div className="ga-hero-content">
        <div className="ga-hero-eyebrow">
          <span className="ga-eyebrow-line" />
          <span>PG PROGRAM — NEXT-GENERATION AI EDUCATION</span>
        </div>

        <h1 className="ga-hero-title" aria-label="PG Program in Generative AI and Agentic AI">
          {HERO_LINES.map((line, i) => (
            <span
              key={line}
              className={`ga-hero-line${i === 2 ? " ga-hero-line-italic" : ""}`}
              ref={(el) => {
                if (el) linesRef.current[i] = el;
              }}
            >
              {line}
            </span>
          ))}
        </h1>

        <p className="ga-hero-sub" ref={subRef}>
          Build intelligent systems that understand, reason, create &amp; act.
        </p>

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

      <div className="ga-hero-scroll" aria-hidden="true">
        <span className="ga-scroll-word">Scroll to explore</span>
        <span className="ga-scroll-track"><i /></span>
      </div>
    </section>
  );
};