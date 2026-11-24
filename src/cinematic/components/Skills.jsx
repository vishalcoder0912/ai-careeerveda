import {useEffect, useRef} from "react";
import {gsap} from "gsap";
import {Lines, useCinematic} from "../content";
import {SectionLabel} from "./Atmosphere";

const MQ_MOBILE = "(max-width: 899px) and (prefers-reduced-motion: no-preference)";
const MQ_DESKTOP = "(min-width: 900px) and (prefers-reduced-motion: no-preference)";

export const SkillsSection = () => {
  const {skills} = useCinematic();
  const sectionRef = useRef(null);
  const pinRef = useRef(null);
  const cardsRef = useRef([]);

  useEffect(() => {
    const section = sectionRef.current;
    const pin = pinRef.current;
    if (!section || !pin) return undefined;

    const cards = cardsRef.current.filter(Boolean);
    const mm = gsap.matchMedia();

    /* Defensive clear of the rendered props: no card should stay dimmed or
       shifted if an entrance is interrupted by a media-query change. */
    const clearCards = () => {
      cards.forEach((el) => {
        el.style.removeProperty("opacity");
        el.style.removeProperty("transform");
      });
    };

    /* Mobile: no pin — each card rises in as it scrolls into view. */
    mm.add(MQ_MOBILE, () => {
      const tweens = cards.map((el, i) =>
        gsap.fromTo(el, {opacity: 0, y: 48, x: i % 2 ? 24 : -24}, {
          opacity: 1, y: 0, x: 0, duration: 0.9, ease: "expo.out",
          scrollTrigger: {trigger: el, start: "top 88%", once: true},
        }),
      );
      return () => {
        tweens.forEach((t) => {
          t.scrollTrigger?.kill();
          t.kill();
        });
        clearCards();
      };
    });

    mm.add(MQ_DESKTOP, () => {
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
          // Pinned sections measure first (see fx/pinned.js); this pin must
          // do the same so the sections below measure against its spacer.
          refreshPriority: 1,
          onRefresh: (self) => self.scroll(),
        },
      });

      entrance.forEach((tw, i) => {
        tl.add(tw, i === 0 ? 0 : `+=0.08`);
      });
      /* Let the grid breathe for the remaining scroll distance. */
      tl.to({}, {duration: 0.5});

      return () => {
        tl.scrollTrigger?.kill();
        tl.kill();
        clearCards();
      };
    });

    return () => mm.revert();
  }, []);

  return (
    <section className="ga-skills" id="ga-stack" ref={sectionRef}>
      <div className="ga-skills-pin" ref={pinRef}>
        <div className="ga-skills-head">
          <SectionLabel index="02">{skills.label}</SectionLabel>
          <h2 className="ga-display">
            <Lines lines={skills.title} />
          </h2>
          <p className="ga-sub">{skills.sub}</p>
          <p className="ga-meta ga-skills-tag">{skills.tag}</p>
        </div>

        <div className="ga-skills-body">
          <div className="ga-skills-grid">
            {skills.items.map((cat, i) => (
              <div
                className={`ga-skill ga-skill-${cat.palette}`}
                key={cat.id}
                ref={(el) => {
                  if (el) cardsRef.current[i] = el;
                }}
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