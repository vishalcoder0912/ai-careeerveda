import {useEffect, useRef} from "react";
import {gsap} from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {addTrigger, reducedMotionNow} from "../fx/registry";
import {Lines, useCinematic} from "../content";
import {SectionLabel} from "./Atmosphere";

export const ProgramArchitecture = () => {
  const {architecture} = useCinematic();
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const lineRef = useRef(null);
  const fillRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    const line = lineRef.current;
    const fill = fillRef.current;
    if (!section || !track || !line || !fill) return undefined;
    const reduced = reducedMotionNow();

    const layout = () => {
      const dots = Array.from(track.querySelectorAll(".ga-layer-dot"));
      if (!dots.length) return;
      const trackRect = track.getBoundingClientRect();
      const first = dots[0].getBoundingClientRect();
      const last = dots[dots.length - 1].getBoundingClientRect();
      const top = first.top + first.height / 2 - trackRect.top;
      const bottom = last.top + last.height / 2 - trackRect.top;
      line.style.top = `${top}px`;
      line.style.height = `${Math.max(0, bottom - top)}px`;
    };

    layout();
    window.addEventListener("resize", layout);
    const t = setTimeout(layout, 100);

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
    }

    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", layout);
      triggers.forEach((tr) => tr.kill());
    };
  }, []);

  return (
    <section className="ga-arch" id="ga-architecture" ref={sectionRef}>
      <div className="ga-arch-head">
        <SectionLabel index="04">{architecture.label}</SectionLabel>
        <h2 className="ga-display">
          <Lines lines={architecture.title} />
        </h2>
        <p className="ga-sub">{architecture.sub}</p>
      </div>

      <div className="ga-arch-track" ref={trackRef}>
        <div className="ga-arch-line" ref={lineRef} aria-hidden="true">
          <span className="ga-arch-line-fill" ref={fillRef} />
        </div>
        <div className="ga-arch-layers">
          {architecture.layers.map((layer, i) => (
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