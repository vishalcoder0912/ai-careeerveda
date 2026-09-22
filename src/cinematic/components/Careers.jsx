import {useEffect, useRef} from "react";
import {createPinnedScrub} from "../fx/pinned";
import {reducedMotionNow} from "../fx/registry";
import {careerRoles} from "../data";
import {SectionLabel} from "./Atmosphere";

export const CareerOutcomes = () => {
  const sectionRef = useRef(null);
  const pinRef = useRef(null);
  const roleRefs = useRef([]);

  useEffect(() => {
    const section = sectionRef.current;
    const pin = pinRef.current;
    if (!section || !pin) return undefined;
    if (reducedMotionNow() || !window.matchMedia("(min-width: 900px)").matches) return undefined;

    let last = -1;

    const setState = (idx) => {
      roleRefs.current.forEach((el, i) => {
        const d = i - idx;
        el.classList.toggle("ga-role-current", d === 0);
        el.classList.toggle("ga-role-prev", d < 0);
        el.classList.toggle("ga-role-next", d > 0);
      });
    };

    const cleanup = createPinnedScrub({
      section,
      pinEl: pin,
      end: "+=280%",
      scrub: 1,
      onUpdate: (proxy) => {
        const idx = Math.min(
          careerRoles.length - 1,
          Math.max(0, Math.round(proxy.p * (careerRoles.length - 1))),
        );
        if (idx !== last) {
          last = idx;
          setState(idx);
        }
      },
    });

    return cleanup;
  }, []);

  return (
    <section className="ga-careers" id="ga-career" ref={sectionRef}>
      <div className="ga-careers-pin" ref={pinRef}>
        <div className="ga-careers-head">
          <SectionLabel index="08">Outcomes</SectionLabel>
          <h2 className="ga-display">
            Where This
            <br />
            Can Take You
          </h2>
        </div>

        <div className="ga-careers-reel">
          {careerRoles.map((c, i) => (
            <div
              className="ga-role"
              key={c.role}
              style={{"--dir": i % 2 ? 1 : -1}}
              ref={(el) => {
                if (el) roleRefs.current[i] = el;
              }}
            >
              <span className="ga-role-index">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="ga-role-name">{c.role}</h3>
              <span className="ga-role-domain">{c.domain}</span>
            </div>
          ))}
        </div>

        <p className="ga-careers-caption">each role is a system you will have already built in the lab</p>
      </div>

      {/* Mobile — editorial flow list, no reel */}
      <div className="ga-careers-flow">
        {careerRoles.map((c, i) => (
          <div className="ga-career-row ga-reveal ga-reveal-up" key={c.role} style={{transitionDelay: `${(i % 4) * 70}ms`}}>
            <span className="ga-career-row-index">{String(i + 1).padStart(2, "0")}</span>
            <h3>{c.role}</h3>
            <span>{c.domain}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default CareerOutcomes;