import {useEffect, useRef} from "react";
import {reducedMotionNow} from "../fx/registry";
import {createPinnedScrub} from "../fx/pinned";
import {timelineData} from "../data";
import {SectionLabel} from "./Atmosphere";

const MQ_DESKTOP = "(min-width: 900px)";

export const TimelineSection = () => {
  const sectionRef = useRef(null);
  const pinRef = useRef(null);
  const rowRef = useRef(null);
  const stageRef = useRef(null);
  const captionRef = useRef(null);
  const cardEls = useRef([]);

  useEffect(() => {
    const section = sectionRef.current;
    const pin = pinRef.current;
    const row = rowRef.current;
    const stage = stageRef.current;
    const caption = captionRef.current;
    if (!section || !pin || !row || !stage) return undefined;

    const desktop = window.matchMedia(MQ_DESKTOP).matches;
    const reduced = reducedMotionNow();

    if (!desktop || reduced) return undefined;

    let measure = {cardW: 340, gap: 140, center: 1, stageW: 0};
    let cleanup = null;
    let lastStage = -1;

    const measureLayout = () => {
      const first = cardEls.current[0];
      const second = cardEls.current[1] || first;
      if (first && stage) {
        const fw = first.getBoundingClientRect().width;
        const gap = second
          ? second.getBoundingClientRect().left - first.getBoundingClientRect().right
          : 140;
        measure = {
          cardW: fw,
          gap: gap || 140,
          center: stage.clientWidth / 2,
          stageW: stage.clientWidth,
        };
      }
    };

    const cardTargetX = (i) =>
      measure.center - (i * (measure.cardW + measure.gap) + measure.cardW / 2);

    const setCardState = (idx) => {
      cardEls.current.forEach((el, i) => {
        const dist = Math.abs(i - idx);
        el.classList.toggle("ga-on", dist === 0);
        el.classList.toggle("ga-near", dist === 1);
        el.classList.toggle("ga-far", dist > 1);
        const delay = el.querySelector(".ga-tl-card-reveal");
        if (delay) delay.style.transitionDelay = dist === 0 ? "80ms" : "0ms";
      });
      if (caption) {
        const active = caption.querySelector(".ga-tl-caption-active");
        const frame = active && active.querySelectorAll(".ga-tl-caption-frame")[idx];
        const prev = active && active.querySelector(".ga-tl-frame-on");
        if (prev && prev !== frame) prev.classList.remove("ga-tl-frame-on");
        if (frame) frame.classList.add("ga-tl-frame-on");
      }
    };

    measureLayout();
    setCardState(0);

    cleanup = createPinnedScrub({
      section,
      pinEl: pin,
      end: "+=320%",
      scrub: 1.2,
      onUpdate: (proxy) => {
        const n = timelineData.length;
        const pos = proxy.p * (n - 1);
        const i = Math.min(n - 2, Math.max(0, Math.floor(pos)));
        const frac = pos - i;
        const x = cardTargetX(i) + frac * (cardTargetX(i + 1) - cardTargetX(i));
        row.style.transform = `translate3d(${x.toFixed(2)}px, -50%, 0)`;

        const stageIdx = Math.round(pos);
        if (stageIdx !== lastStage) {
          lastStage = stageIdx;
          setCardState(stageIdx);
        }
      },
    });

    const onResize = () => {
      measureLayout();
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (cleanup) cleanup();
    };
  }, []);

  return (
    <section className="ga-timeline" id="ga-program" ref={sectionRef}>
      <div className="ga-tl-pin" ref={pinRef}>
        <div className="ga-tl-head">
          <SectionLabel index="01">A Journey from Models to Agents</SectionLabel>
          <h2 className="ga-display">
            The Evolution
            <br />
            of Intelligence
          </h2>
        </div>

        <div className="ga-tl-stage" ref={stageRef}>
          <div className="ga-tl-row" ref={rowRef}>
            {timelineData.map((item, i) => (
              <article
                className="ga-tl-card"
                key={item.year}
                ref={(el) => {
                  if (el) cardEls.current[i] = el;
                }}
                style={{zIndex: 10 - Math.abs(i - 3)}}
              >
                <span className="ga-tl-card-year">{item.year}</span>
                <div className="ga-tl-card-visual">
                  <img className="ga-tl-card-img" src={item.image} alt={item.title} loading="lazy" />
                </div>
                <h3>{item.title}</h3>
                <div className="ga-tl-card-reveal">
                  <p>{item.description}</p>
                  <span className="ga-tl-tags">
                    {item.tags.map((t) => <em key={t}>{t}</em>)}
                  </span>
                </div>
              </article>
            ))}
          </div>

          <div className="ga-tl-caption" ref={captionRef}>
            <div className="ga-tl-caption-active">
              {timelineData.map((item) => (
                <span className="ga-tl-caption-frame" key={item.year}>
                  <span className="ga-tl-caption-year">{item.year}</span>
                  <span className="ga-tl-caption-title">{item.title}</span>
                </span>
              ))}
            </div>
            <span className="ga-tl-caption-hint">scroll to advance the timeline</span>
          </div>
        </div>

        {/* Dedicated mobile composition — vertical timeline */}
        <div className="ga-tl-vertical">
          {timelineData.map((item, i) => (
            <article className="ga-tl-vcard ga-reveal ga-reveal-up" key={item.year} style={{transitionDelay: `${i * 60}ms`}}>
              <div className="ga-tl-v-visual">
                <img className="ga-tl-v-img" src={item.image} alt={item.title} loading="lazy" />
              </div>
              <span className="ga-tl-v-year">{item.num} · {item.year}</span>
              <div className="ga-tl-v-body">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <span className="ga-tl-tags">
                  {item.tags.map((t) => <em key={t}>{t}</em>)}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};