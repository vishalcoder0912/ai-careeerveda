import {useEffect, useRef, useState} from "react";
import {Link} from "react-router-dom";
import {ArrowRight} from "lucide-react";
import {gsap} from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import BrainCanvas from "./BrainCanvas";
import {BRAIN_SIZE, FOV, HANDOFF, readMode, useNeuralFlow} from "./flow";
import "./neural-story.css";

// The cinematic scroll story under the hero: one scrubbed GSAP timeline drives
// the camera, the brain and the copy through opening → approach → side view →
// pullback → laptop → return.
//
// On wide screens it has no canvas of its own: the brain is the hero's, on
// NeuralFlow's shared stage, and this timeline starts from the HANDOFF frame
// the hero's timeline ends on. Phones and reduced motion get the same content
// as a plain stacked section (no pin, no scrub) over a still copy of the same
// scene; without WebGL the stage is its CSS gradient alone.

gsap.registerPlugin(ScrollTrigger);

// One scrubbed timeline, 11.2 units long, mapped onto the whole track.
// look: the flow's story object, which starts at HANDOFF. onUpdate tells the
// flow when the story owns the camera.
const buildTimeline = (track, look, flowState) => {
  const tl = gsap.timeline({
    defaults: {ease: "sine.inOut"},
    scrollTrigger: {
      trigger: track,
      start: "top top",
      end: "bottom bottom",
      scrub: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        flowState.storyActive = self.progress > 0;
      },
    },
  });
  // Narrow screens stack the copy under the brain instead of beside it (see
  // neural-story.css), and skip the blur: a filter repainted every scroll
  // frame is what stutters on phone GPUs.
  const narrow = () => window.matchMedia("(max-width: 899px)").matches;
  const blur = narrow() ? () => ({}) : (px) => ({filter: `blur(${px}px)`});
  // Function values, re-read on refresh (invalidateOnRefresh), so a rotated
  // phone re-frames. Narrow: centred, in the band between the header and the
  // copy, and never wider than ~90% of the screen.
  const stage = track.querySelector(".ns-stage");
  const sx = (v) => () => (narrow() ? 0 : v);
  const sy = (v, phone = 0.15) => () => (narrow() ? phone : v);
  const fit = (camZ, k = 1) => () => {
    if (!narrow()) return 1;
    const viewW = 2 * Math.tan((FOV * Math.PI) / 360) * camZ * (stage.clientWidth / stage.clientHeight);
    return Math.min(1, (k * 0.9 * viewW) / BRAIN_SIZE.width);
  };
  const show = (target, at, from = {y: 40}) =>
    tl.fromTo(target, {autoAlpha: 0, ...blur(6), ...from}, {autoAlpha: 1, ...blur(0), x: 0, y: 0, duration: 0.8}, at);
  const hide = (target, at) => tl.to(target, {autoAlpha: 0, ...blur(6), y: -30, duration: 0.6}, at);

  // sx is a screen fraction, so each beat's copy and the brain stay on
  // opposite sides at every viewport width.
  // Opening: the brain centred as the hero left it; the first line rises in
  // beneath it.
  show(".ns-beat--open", 0.15);
  hide(".ns-beat--open", 1.6);
  // Approach: dolly in, filaments light up.
  tl.to(look, {camZ: 4.8, sx: sx(0.2), sy: sy(0.08), scale: fit(4.8), intensity: 1, duration: 3}, 0.4);
  show(".ns-beat--approach", 2.1, {x: -40});
  hide(".ns-beat--approach", 3.5);
  // Side perspective: orbit round, brain moves aside for the copy.
  tl.to(look, {orbit: 0.65, sx: sx(-0.25), duration: 2}, 3.4);
  show(".ns-beat--side", 4.0, {x: 40});
  hide(".ns-beat--side", 5.3);
  // Pullback into the laptop.
  tl.to(look, {camZ: 9.5, sx: 0, sy: -0.03, scale: 0.8, dim: 0.3, intensity: 0.5, duration: 1.8}, 5.3);
  tl.fromTo(
    ".ns-laptop",
    {autoAlpha: 0, rotateX: 28, y: 140, scale: 0.82},
    {autoAlpha: 1, rotateX: 0, y: 0, scale: 1, duration: 1.4},
    5.9,
  );
  show(".ns-beat--device .ns-copy", 6.4);
  tl.to(".ns-beat--device", {autoAlpha: 0, scale: 1.12, ...blur(6), duration: 0.8}, 7.9);
  // Return: back into the brain, final call to action.
  tl.to(look, {camZ: 6, orbit: 2.75, sx: sx(0.2), sy: sy(0, 0.22), scale: fit(6, 0.8), dim: 1, intensity: 0.9, duration: 1.8}, 8.0);
  show(".ns-beat--final", 8.8, {x: -40});
  // Hold the final frame: the call to action needs real scroll time while the
  // stage is still pinned. At 0.4 units it got ~4% of the track, so it had
  // barely faded in when the stage unstuck and carried it off screen.
  tl.to({}, {duration: 1.6}, 9.6);
  return tl;
};

const NeuralStory = () => {
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const flow = useNeuralFlow();
  const [mode] = useState(() => flow?.mode ?? readMode());
  // The static layout never scrubs, so it starts at the close, lit-up view.
  const [look] = useState(() => (mode.cinematic ? flow.state.story : {...HANDOFF, camZ: 6.2, intensity: 0.85}));
  // Without IntersectionObserver, just keep rendering.
  const [active, setActive] = useState(() => typeof IntersectionObserver === "undefined");

  useEffect(() => {
    if (mode.cinematic || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting));
    observer.observe(trackRef.current);
    return () => observer.disconnect();
  }, [mode]);

  useEffect(() => {
    if (!mode.cinematic) return undefined;
    const ctx = gsap.context(() => buildTimeline(trackRef.current, look, flow.state), sectionRef);
    // The page grew when this chunk arrived; re-measure every trigger.
    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, [mode, look, flow]);

  return (
    <section
      ref={sectionRef}
      className={`ns ${mode.cinematic ? "ns--cinematic" : "ns--static"}`}
      aria-label="How CareerVeda builds your career"
    >
      {/* The cinematic flow darkens into midnight behind the hero instead. */}
      {!mode.cinematic && <div className="ns-fade ns-fade--in" aria-hidden="true" />}
      <div className="ns-track" ref={trackRef}>
        <div className="ns-stage">
          {!mode.cinematic && (
            <div className="ns-canvas" aria-hidden="true">
              {mode.webgl && <BrainCanvas look={look} mode={mode} active={active} />}
            </div>
          )}

          <div className="ns-beat ns-beat--open">
            <p className="ns-eyebrow">The CareerVeda method</p>
            <h2>Every skill creates a new possibility.</h2>
          </div>

          <div className="ns-beat ns-beat--approach ns-copy">
            <p className="ns-eyebrow">Learn</p>
            <h2>Knowledge becomes capability.</h2>
            <p>Live classes and expert faculty turn concepts into skills you can use from day one.</p>
          </div>

          <div className="ns-beat ns-beat--side ns-copy">
            <p className="ns-eyebrow">Build &amp; get mentored</p>
            <h2>Connect learning with real-world impact.</h2>
            <p>Real-world projects and industry mentors tie what you learn to the work teams hire for.</p>
          </div>

          <div className="ns-beat ns-beat--device">
            <div className="ns-copy">
              <p className="ns-eyebrow">Get placed</p>
              <h2>Your career, on one platform.</h2>
            </div>
            <div className="ns-laptop">
              <div className="ns-laptop__screen">
                <img
                  src="/images/careerveda-site-1440.webp"
                  srcSet="/images/careerveda-site-720.webp 720w, /images/careerveda-site-1440.webp 1440w"
                  sizes="(max-width: 899px) 92vw, 50vw"
                  width="1440"
                  height="900"
                  loading="lazy"
                  decoding="async"
                  alt="The CareerVeda website open on a laptop"
                />
              </div>
              <div className="ns-laptop__base" />
            </div>
          </div>

          <div className="ns-beat ns-beat--final ns-copy">
            <p className="ns-eyebrow">Your next step</p>
            <h2>Build the future you want.</h2>
            <p>
              Explore programs in Data Analytics, Product Management, Data Science and
              Generative AI.
            </p>
            <div className="ns-actions">
              <Link className="ns-btn ns-btn--primary" to="/programs">
                Explore Programs <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link className="ns-btn ns-btn--ghost" to="/#consultation">
                Get in Touch
              </Link>
            </div>
          </div>
        </div>
      </div>
      <div className="ns-fade" aria-hidden="true" />
    </section>
  );
};

export default NeuralStory;
