import {useEffect, useRef} from "react";
import {createPinnedScrub} from "../fx/pinned";
import {reducedMotionNow} from "../fx/registry";
import {workflowSteps} from "../data";
import {SectionLabel} from "./Atmosphere";

export const AgentWorkflow = () => {
  const sectionRef = useRef(null);
  const pinRef = useRef(null);
  const stepsRef = useRef([]);
  const fillRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    const pin = pinRef.current;
    if (!section || !pin) return undefined;
    if (reducedMotionNow() || !window.matchMedia("(min-width: 900px)").matches) return undefined;

    let last = -1;

    const setState = (idx) => {
      stepsRef.current.forEach((el, i) => {
        el.classList.toggle("ga-step-done", i < idx);
        el.classList.toggle("ga-step-on", i === idx);
        el.classList.toggle("ga-step-idle", i > idx);
      });
      const proxied = idx / Math.max(1, workflowSteps.length - 1);
      const fill = fillRef.current;
      if (fill) fill.style.height = `${Math.round(proxied * 100)}%`;
    };

    const cleanup = createPinnedScrub({
      section,
      pinEl: pin,
      end: "+=260%",
      scrub: 1,
      onUpdate: (proxy) => {
        const idx = Math.min(
          workflowSteps.length - 1,
          Math.max(0, Math.round(proxy.p * (workflowSteps.length - 1))),
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
    <section className="ga-flow" id="ga-workflow" ref={sectionRef}>
      <div className="ga-flow-pin" ref={pinRef}>
        <div className="ga-flow-head">
          <SectionLabel index="06">Living Workflow</SectionLabel>
          <h2 className="ga-display">
            From Input
            <br />
            to Response
          </h2>
        </div>

        <div className="ga-flow-track">
          <span className="ga-flow-line" aria-hidden="true">
            <span className="ga-flow-line-fill" ref={fillRef} />
          </span>

          <ol className="ga-flow-steps">
            {workflowSteps.map((step, i) => (
              <li
                className="ga-step"
                key={step.title}
                ref={(el) => {
                  if (el) stepsRef.current[i] = el;
                }}
              >
                <span className="ga-step-index">{String(i + 1).padStart(2, "0")}</span>
                <span className="ga-step-node">
                  <span className="ga-step-core" />
                  <span className="ga-step-ring" />
                </span>
                <span className="ga-step-body">
                  <strong>{step.title}</strong>
                  <em>{step.note}</em>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <p className="ga-flow-caption">input → understand → plan → reason → tool → execute → observe → memory → respond</p>
      </div>
    </section>
  );
};

export default AgentWorkflow;