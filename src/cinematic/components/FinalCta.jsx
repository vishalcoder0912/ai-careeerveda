import {Fragment, useEffect, useRef} from "react";
import {reducedMotionNow} from "../fx/registry";
import {useMagneticHover} from "../fx/hooks";
import {SectionLabel} from "./Atmosphere";
import {Lines, useCinematic} from "../content";

export const FinalCTA = () => {
  const {cta} = useCinematic();
  const streakRef = useRef(null);
  const magA = useMagneticHover(0.32);
  const magB = useMagneticHover(0.32);

  useEffect(() => {
    const streak = streakRef.current;
    if (!streak || reducedMotionNow()) return undefined;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          streak.classList.add("ga-cta-trail-on");
          io.disconnect();
        }
      },
      {threshold: 0.4},
    );
    io.observe(streak);
    return () => io.disconnect();
  }, []);

  return (
    <section className="ga-cta" id="ga-cta">
      <div className="ga-cta-bg" aria-hidden="true">
        <span className="ga-cta-horizon" />
        <span className="ga-cta-glow" />
      </div>

      <svg className="ga-cta-trail" ref={streakRef} viewBox="0 0 1200 300" aria-hidden="true">
        <path d="M -60 240 C 260 180, 420 260, 620 170 S 1000 60, 1260 40" />
      </svg>

      <div className="ga-cta-inner">
        <SectionLabel index="13">{cta.label}</SectionLabel>
        <h2 className="ga-display ga-cta-title">
          <Lines lines={cta.title} />
        </h2>
        <p className="ga-sub ga-cta-sub">{cta.sub}</p>
        <div className="ga-cta-actions">
          <a href="#ga-contact" className="ga-btn ga-btn-solid ga-btn-lg" data-cursor="cta" ref={magA}>
            Apply for the Program
          </a>
          <a href="#ga-contact" className="ga-btn ga-btn-outline" data-cursor="cta" ref={magB}>
            Download Brochure
          </a>
        </div>
        <span className="ga-cta-meta">
          {cta.meta.map((m, i) => (
            <Fragment key={m}>
              {i > 0 && " · "}
              <span>{m}</span>
            </Fragment>
          ))}
        </span>
      </div>
    </section>
  );
};

export default FinalCTA;