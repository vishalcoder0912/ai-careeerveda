import {useEffect, useRef, useState} from "react";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {Check} from "lucide-react";
import {createPinnedScrub} from "../fx/pinned";
import {reducedMotionNow} from "../fx/registry";
import {Lines, useCinematic} from "../content";
import {SectionLabel} from "./Atmosphere";
import "./workflow.css";
const pad = (n) => String(n).padStart(2, "0");

// Ten-step workflow. Desktop pins the section and scrolling walks the steps:
// the left card shows the current step, the list on the right marks it and
// ticks off the ones before it. Phones skip the pin and light up the step
// crossing mid-screen. Reduced motion keeps every step static and readable.
export const AgentWorkflow = () => {
  const {workflow} = useCinematic();
  const workflowSteps = workflow.steps;
  const sectionRef = useRef(null);
  const pinRef = useRef(null);
  const stepsRef = useRef([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    const pin = pinRef.current;
    if (!section || !pin) return undefined;
    if (reducedMotionNow()) return undefined;

    if (!window.matchMedia("(min-width: 900px)").matches) {
      const sts = stepsRef.current.map((el, i) =>
        ScrollTrigger.create({
          trigger: el,
          start: "top 55%",
          end: "bottom 55%",
          onToggle: (self) => self.isActive && setActive(i),
        }),
      );
      return () => sts.forEach((st) => st.kill());
    }

    return createPinnedScrub({
      section,
      pinEl: pin,
      end: "+=170%",
      scrub: 1,
      onUpdate: (proxy) => {
        const idx = Math.round(proxy.p * (workflowSteps.length - 1));
        setActive(Math.min(workflowSteps.length - 1, Math.max(0, idx)));
      },
    });
  }, [workflowSteps]);

  const current = workflowSteps[active];
  const progress = Math.round(((active + 1) / workflowSteps.length) * 100);

  return (
    <section className="ga-wf" id="ga-workflow" ref={sectionRef}>
      <div className="ga-wf-pin" ref={pinRef}>
        <div className="ga-wf-inner">
          <div className="ga-wf-intro">
            <SectionLabel index="07">{workflow.label}</SectionLabel>
            <h2 className="ga-display">
              <Lines lines={workflow.title} />
            </h2>
            <p className="ga-wf-lead">{workflow.lead}</p>

            {/* Mirrors the highlighted list row, so screen readers skip it. */}
            <div className="ga-wf-focus" aria-hidden="true">
              <span className="ga-wf-focus-num" key={active}>{pad(active + 1)}</span>
              <div className="ga-wf-focus-text">
                <span className="ga-wf-focus-kicker">
                  Step {pad(active + 1)} of {pad(workflowSteps.length)}
                </span>
                <strong>{current.title}</strong>
                <span>{current.note}</span>
              </div>
              <span className="ga-wf-progress">
                <span style={{width: `${progress}%`}} />
              </span>
            </div>

            <ol className="ga-wf-pipeline" aria-label="Agent loop">
              {workflow.pipeline.map((stage) => <li key={stage}>{stage}</li>)}
            </ol>
          </div>

          <ol className="ga-wf-steps">
            {workflowSteps.map((step, i) => {
              const state = i < active ? "is-done" : i === active ? "is-on" : "is-next";
              return (
                <li
                  className={`ga-wf-step ${state}`}
                  key={step.title}
                  aria-current={i === active ? "step" : undefined}
                  ref={(el) => {
                    if (el) stepsRef.current[i] = el;
                  }}
                >
                  <span className="ga-wf-step-num">
                    {i < active ? <Check size={15} strokeWidth={3} aria-hidden="true" /> : pad(i + 1)}
                  </span>
                  <span className="ga-wf-step-text">
                    <strong>{step.title}</strong>
                    <span>{step.note}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
};

export default AgentWorkflow;
