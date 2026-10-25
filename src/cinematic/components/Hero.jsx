import {useEffect, useRef} from "react";
import {gsap} from "gsap";
import {addTween, reducedMotionNow} from "../fx/registry";
import {useMagneticHover} from "../fx/hooks";
import {ArrowDownRight} from "lucide-react";
import {useCinematic} from "../content";

// "PG Program in Data Analytics with Generative AI" → lead "PG Program in" and
// the full name as the two-tone title, broken before its first "with" / "&" /
// "and" (else before its last word) so it still reads as two lines.
const PREFIX = /^((?:PG|Post Graduate) Program in)\s+(.+)$/i;

const heroTitle = (hero) => {
  const match = (hero.ariaLabel || "").match(PREFIX);
  if (!match) return {lead: "", lines: hero.title};
  const name = match[2];
  let at = name.search(/ (with|&|and) /i);
  // No connector: split before the last word, unless the name is too short to
  // need two lines ("GEN AI").
  if (at < 0 && name.length > 10) at = name.lastIndexOf(" ");
  return {lead: match[1], lines: at > 0 ? [name.slice(0, at), name.slice(at + 1)] : [name]};
};

export const HeroSection = () => {
  const {hero} = useCinematic();
  const title = heroTitle(hero);
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
        <span className="ga-meta">{hero.metaLeft}</span>
        <span className="ga-hero-rule" />
      </div>
      <div className="ga-hero-extra ga-hero-extra-r" ref={extraRight}>
        <span className="ga-meta">{hero.metaRight}</span>
      </div>

      <div className="ga-hero-content">
        <div className="ga-hero-eyebrow">
          <span className="ga-eyebrow-line" />
          <span>{hero.eyebrow}</span>
        </div>

        {/* Visual only: the h1's aria-label already carries the full name. */}
        {title.lead && (
          <p className="ga-hero-lead" aria-hidden="true">
            {title.lead}
          </p>
        )}

        <h1 className="ga-hero-title" aria-label={hero.ariaLabel}>
          {title.lines.map((line, i) => (
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
          {hero.sub}
        </p>

        <div className="ga-hero-badges" ref={subRef} aria-hidden="true">
          {hero.badges.map((b) => <span key={b}>{b}</span>)}
        </div>

        <div className="ga-hero-stats" ref={statsRef}>
          {hero.stats.map(([value, label]) => (
            <span className="ga-hero-stat" key={label}>
              <strong>{value}</strong>
              <em>{label}</em>
            </span>
          ))}
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
        src={hero.image}
        alt=""
        width="1600"
        height="1200"
        decoding="async"
        aria-hidden="true"
      />
    </section>
  );
};