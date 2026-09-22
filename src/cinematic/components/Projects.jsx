import {useEffect, useRef} from "react";
import {createPinnedScrub} from "../fx/pinned";
import {reducedMotionNow} from "../fx/registry";
import {projectsData} from "../data";
import {TalentSilhouette} from "./TalentSilhouette";
import {SectionLabel} from "./Atmosphere";
import {useTilt} from "../fx/hooks";

const MQ_DESKTOP = "(min-width: 900px)";

const ProjectCard = ({project, index}) => {
  const tilt = useTilt(6);
  return (
    <div
      className={`ga-project ga-project-${project.accent}`}
      ref={tilt}
      data-cursor
      style={{transitionDelay: `${(index % 4) * 60}ms`}}
    >
      <div className="ga-project-visual">
        <project.icon className="ga-project-icon" size={26} strokeWidth={1.3} aria-hidden="true" />
        <span className="ga-project-visual-halo" />
      </div>
      <h3>{project.name}</h3>
      <span className="ga-project-stack">{project.stack.join(" · ")}</span>
      <p>{project.description}</p>
      <span className="ga-project-sweep" aria-hidden="true" />
    </div>
  );
};

export const ProjectsSection = () => {
  const sectionRef = useRef(null);
  const pinRef = useRef(null);
  const orbitRef = useRef(null);
  const stageRef = useRef(null);
  const captionRef = useRef(null);
  const cardEls = useRef([]);

  useEffect(() => {
    const section = sectionRef.current;
    const pin = pinRef.current;
    const orbit = orbitRef.current;
    const caption = captionRef.current;
    if (!section || !pin || !orbit) return undefined;
    if (reducedMotionNow() || !window.matchMedia(MQ_DESKTOP).matches) return undefined;

    let lastFront = -1;
    const N = projectsData.length;

    const setCaption = (idx) => {
      const frame = caption.querySelectorAll(".ga-project-caption-frame")[idx];
      const prev = caption.querySelector(".ga-project-caption-on");
      if (prev && prev !== frame) prev.classList.remove("ga-project-caption-on");
      if (frame) frame.classList.add("ga-project-caption-on");
    };

    let R = 180;
    let W = 600;
    let H = 620;
    const measureRadius = () => {
      const stage = stageRef.current;
      if (stage) {
        W = stage.clientWidth;
        H = stage.clientHeight;
        R = Math.max(120, Math.min(W, H) * 0.3);
      }
    };
    measureRadius();
    window.addEventListener("resize", measureRadius);

    const cleanup = createPinnedScrub({
      section,
      pinEl: pin,
      end: "+=300%",
      scrub: 1.2,
      onUpdate: (proxy) => {
        const offset = proxy.p * Math.PI * 2;
        let bestIdx = 0;
        let bestDepth = -2;

        cardEls.current.forEach((el, i) => {
          if (!el) return;
          const eff = (i / N) * Math.PI * 2 + offset + Math.PI / 2;
          const dx = Math.cos(eff) * R;
          const dy = Math.sin(eff) * R * 0.78;
          const depth = -Math.sin(eff); // -1 back, +1 front
          const scale = 0.62 + Math.max(0, depth) * 0.55;
          el.style.transform =
            `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
          el.style.zIndex = 10 + Math.round(depth * 10);
          el.style.opacity = `${(0.4 + Math.max(0, depth) * 0.6).toFixed(3)}`;
          el.style.filter = `brightness(${(0.75 + Math.max(0, depth) * 0.55).toFixed(3)}) blur(${Math.max(0, -depth * 0.8).toFixed(2)}px)`;
          el.classList.toggle("ga-project-front", depth > 0.72);
          if (depth > bestDepth) {
            bestDepth = depth;
            bestIdx = i;
          }
        });

        if (bestIdx !== lastFront) {
          lastFront = bestIdx;
          if (caption) setCaption(bestIdx);
        }

        const scale = 1 + proxy.p * 0.05;
        orbit.style.transform = `scale(${scale.toFixed(4)})`;
      },
    });

    return () => {
      window.removeEventListener("resize", measureRadius);
      cleanup();
    };
  }, []);

  return (
    <section className="ga-projects" id="ga-projects" ref={sectionRef}>
      <div className="ga-projects-pin" ref={pinRef}>
        <div className="ga-projects-head">
          <SectionLabel index="07">Portfolio</SectionLabel>
          <h2 className="ga-display">
            Build.
            <br />
            Deploy. Automate.
          </h2>
          <div className="ga-projects-caption" ref={captionRef}>
            {projectsData.map((p) => (
              <span className="ga-project-caption-frame" key={p.id}>
                {p.name}
              </span>
            ))}
          </div>
        </div>

        <div className="ga-projects-stage" ref={stageRef}>
          <span className="ga-projects-orbits" aria-hidden="true">
            <i /><i /><i />
          </span>
          <div className="ga-projects-orbit" ref={orbitRef}>
            {projectsData.map((p, i) => (
              <div
                className="ga-project-orbit-item"
                key={p.id}
                ref={(el) => {
                  if (el) cardEls.current[i] = el;
                }}
              >
                <ProjectCard project={p} index={i} />
              </div>
            ))}
          </div>

          <div className="ga-projects-center" aria-hidden="true">
            <TalentSilhouette className="ga-projects-sil" />
            <span className="ga-projects-center-ring">
              <em>8 systems · one owner</em>
            </span>
          </div>
        </div>

        <p className="ga-projects-note">scroll rotates the constellation — study a project up close, then keep moving</p>
      </div>

      {/* Mobile composition — clean grid, no orbit */}
      <div className="ga-projects-grid">
        {projectsData.map((p, i) => (
          <ProjectCard project={p} index={i} key={p.id} />
        ))}
      </div>
    </section>
  );
};

export default ProjectsSection;