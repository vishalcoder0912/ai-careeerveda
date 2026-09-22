import {useEffect, useRef} from "react";
import {gsap} from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {addTrigger, reducedMotionNow} from "../fx/registry";
import {architectureLayers} from "../data";
import {SectionLabel} from "./Atmosphere";

export const ProgramArchitecture = () => {
  const sectionRef = useRef(null);
  const fillRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    const fill = fillRef.current;
    if (!section) return undefined;
    const reduced = reducedMotionNow();

    const triggers = [];

    if (!reduced) {
      const scrub = gsap.fromTo(
        fill,
        {scaleY: 0, transformOrigin: "50% 0%"},
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top 70%",
            end: "bottom 45%",
            scrub: 0.6,
          },
        },
      );
      triggers.push({kill: () => {
        scrub.scrollTrigger?.kill();
        scrub.kill();
      }});
    }

    section.querySelectorAll(".ga-layer").forEach((el) => {
      const st = addTrigger(
        ScrollTrigger.create({
          trigger: el,
          start: "top 78%",
          end: "top 24%",
          onToggle: (self) => {
            el.classList.toggle("ga-on", self.isActive);
          },
        }),
      );
      triggers.push({kill: () => st.kill()});
    });

    return () => triggers.forEach((t) => t.kill());
  }, []);

  return (
    <section className="ga-arch" id="ga-architecture" ref={sectionRef}>
      <div className="ga-arch-head">
        <SectionLabel index="04">Curriculum</SectionLabel>
        <h2 className="ga-display">
          The AI
          <br />
          Engineering Stack
        </h2>
        <p className="ga-sub">Eight layers, built in order — each one a foundation for the next.</p>
      </div>

      <div className="ga-arch-track">
        <div className="ga-arch-line" aria-hidden="true">
          <span className="ga-arch-line-fill" ref={fillRef} />
        </div>

        <div className="ga-arch-layers">
          {architectureLayers.map((layer, i) => (
            <div className={`ga-layer${i % 2 ? " ga-layer-right" : ""}`} key={layer.layer}>
              <span className="ga-layer-dot" aria-hidden="true">
                <i />
              </span>
              <div className="ga-layer-card">
                <span className="ga-layer-index">Layer {layer.layer}</span>
                <h3>{layer.title}</h3>
                <p>{layer.note}</p>
                <span className="ga-layer-arrow" aria-hidden="true">→</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProgramArchitecture;