import {useEffect, useRef} from "react";
import {gsap} from "gsap";
import {reducedMotionNow} from "../fx/registry";
import {skillCategories} from "../data";
import {TalentSilhouette} from "./TalentSilhouette";
import {SectionLabel} from "./Atmosphere";

export const SkillsSection = () => {
  const sectionRef = useRef(null);
  const pinRef = useRef(null);
  const cardsRef = useRef([]);
  const silRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    const pin = pinRef.current;
    if (!section || !pin) return undefined;
    if (reducedMotionNow() || !window.matchMedia("(min-width: 900px)").matches) return undefined;

    const cards = cardsRef.current.filter(Boolean);

    const entrance = cards.map((el, i) => {
      const base = {opacity: 0, ease: "power2.out"};
      const from =
        i === 0 ? {x: -140, y: 0, scale: 1, opacity: 0}
          : i === 1 ? {x: 0, y: -110, scale: 1, opacity: 0}
          : i === 2 ? {x: 0, y: 0, scale: 0.55, opacity: 0}
          : i === 3 ? {x: 150, y: 0, rotationY: 42, opacity: 0}
          : {x: 0, y: 170, scale: 1, opacity: 0};
      return gsap.fromTo(el, from, {
        ...base,
        x: 0,
        y: 0,
        scale: 1,
        rotationY: 0,
        opacity: 1,
      });
    });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "+=260%",
        pin: pin,
        scrub: 1,
        anticipatePin: 1,
        onRefresh: (self) => self.scroll(),
      },
    });

    entrance.forEach((tw, i) => {
      tl.add(tw, i === 0 ? 0 : `+=0.08`);
    });
    /* Let the grid breathe for the remaining scroll distance. */
    tl.to({}, {duration: 0.5});

    const silPar = gsap.fromTo(
      silRef.current,
      {yPercent: 8},
      {
        yPercent: -8,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=260%",
          scrub: 0.6,
        },
      },
    );

    const cleanup = () => {
      tl.scrollTrigger?.kill();
      tl.kill();
      silPar.scrollTrigger?.kill();
      silPar.kill();
    };
    return cleanup;
  }, []);

  return (
    <section className="ga-skills" id="ga-stack" ref={sectionRef}>
      <div className="ga-skills-pin" ref={pinRef}>
        <div className="ga-skills-head">
          <SectionLabel index="02">The Laboratory</SectionLabel>
          <h2 className="ga-display">
            What You
            <br />
            Will Master
          </h2>
          <p className="ga-sub">From prompts to autonomous systems — five domains, one engineering discipline.</p>
        </div>

        <div className="ga-skills-body">
          <div className="ga-skills-human" ref={silRef} aria-hidden="true">
            <TalentSilhouette className="ga-skills-sil" />
            <span className="ga-skills-rim" />
            <span className="ga-skills-caption">
              <span className="ga-meta">Practitioner · Builder · Operator</span>
            </span>
            <span className="ga-skills-floor" />
          </div>

          <div className="ga-skills-grid">
            {skillCategories.map((cat, i) => (
              <div
                className={`ga-skill ga-skill-${cat.palette}`}
                key={cat.id}
                ref={(el) => {
                  if (el) cardsRef.current[i] = el;
                }}
                style={{gridRow: i === 4 ? "span 1" : undefined, gridColumn: i === 4 ? "1 / -1" : undefined}}
              >
                <div className="ga-skill-top">
                  <span className="ga-skill-id">{cat.id}</span>
                  <cat.icon className="ga-skill-icon" size={22} strokeWidth={1.4} aria-hidden="true" />
                </div>
                <h3>{cat.title}</h3>
                <p className="ga-skill-intro">{cat.intro}</p>
                <ul className="ga-skill-stack">
                  {cat.stack.map((s) => <li key={s}>{s}</li>)}
                </ul>
                <span className="ga-skill-sweep" aria-hidden="true" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SkillsSection;