import {Canvas, useFrame} from "@react-three/fiber";
import {useEffect, useRef, useState} from "react";
import {Link} from "react-router-dom";
import {ArrowRight} from "lucide-react";
import {gsap} from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {Bloom, NeuralBrain, Particles} from "./NeuralBrain";
import "./neural-story.css";

// The cinematic scroll story under the hero: a sticky midnight stage where one
// scrubbed GSAP timeline drives the camera, the brain and the copy through
// opening → approach → side view → pullback → laptop → return.
//
// Phones and reduced motion get the same content as a plain stacked section
// (no pin, no scrub); without WebGL the stage is its CSS gradient alone.

gsap.registerPlugin(ScrollTrigger);

const hasWebGL = () => {
  try {
    return Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    return false;
  }
};

const readMode = () => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wide = window.matchMedia("(min-width: 900px)").matches;
  const strong = (navigator.hardwareConcurrency || 8) > 4 && window.matchMedia("(min-width: 1200px)").matches;
  return {
    cinematic: wide && !reduced,
    still: reduced,
    webgl: hasWebGL(),
    bloom: wide && strong && !reduced,
    count: !wide ? 4000 : strong ? 14000 : 8000,
  };
};

// What the timeline animates. Read every frame by the rig; never React state.
const createLook = () => ({camZ: 7.6, orbit: 0, brainX: 0, brainY: 0, scale: 1, intensity: 0.35, dim: 1});

const Rig = ({look, still, count}) => {
  const holder = useRef(null);
  const brain = useRef(null);

  useFrame((state, delta) => {
    const {camera, pointer} = state;
    const t = state.clock.elapsedTime;
    const k = still ? 1 : 1 - Math.exp(-delta * 5);

    // Camera on a circle around the brain; the pointer nudges it.
    const cx = Math.sin(look.orbit) * look.camZ + pointer.x * 0.3;
    const cz = Math.cos(look.orbit) * look.camZ;
    camera.position.x += (cx - camera.position.x) * k;
    camera.position.y += (pointer.y * 0.2 - camera.position.y) * k;
    camera.position.z += (cz - camera.position.z) * k;
    camera.lookAt(0, 0, 0);

    // brainX is a screen-side shift, so it follows the camera's right vector.
    const h = holder.current;
    h.position.x += (Math.cos(look.orbit) * look.brainX - h.position.x) * k;
    h.position.y += (look.brainY - h.position.y) * k;
    h.position.z += (-Math.sin(look.orbit) * look.brainX - h.position.z) * k;
    h.scale.setScalar(h.scale.x + (look.scale - h.scale.x) * k);

    brain.current.rotation.y = -0.35 + Math.sin(t * 0.09) * 0.35;
    brain.current.rotation.x = 0.12 + Math.sin(t * 0.07) * 0.05;
    brain.current.position.y = Math.sin(t * 0.4) * 0.04;
  });

  return (
    <group ref={holder}>
      <group ref={brain}>
        <NeuralBrain count={count} additive look={look} />
      </group>
    </group>
  );
};

const Stage = ({mode, look, active}) => (
  <Canvas
    camera={{position: [0, 0, look.camZ], fov: 42}}
    dpr={[1, mode.bloom ? 1.5 : 1.25]}
    gl={{antialias: !mode.bloom, powerPreference: "high-performance"}}
    frameloop={mode.still ? "demand" : active ? "always" : "never"}
    eventSource={document.body}
    eventPrefix="client"
  >
    <color attach="background" args={["#040a1c"]} />
    {/* Far stars, midground dust, the brain, foreground motes: each layer
        sits at its own depth and follows the pointer by its own amount. */}
    <Particles count={900} inner={16} outer={34} size={0.09} opacity={0.75} drift={0.15} seed={3} color="#c7d7fe" additive />
    <Particles count={420} inner={3.2} outer={8} size={0.03} opacity={0.5} drift={0.6} seed={13} additive />
    <Rig look={look} still={mode.still} count={mode.count} />
    <Particles count={40} inner={1.9} outer={3} size={0.06} opacity={0.6} drift={1.8} seed={29} color="#a5f3fc" additive />
    {mode.bloom && <Bloom />}
  </Canvas>
);

// One scrubbed timeline, 10 units long, mapped onto the whole track.
const buildTimeline = (track, look) => {
  const tl = gsap.timeline({
    defaults: {ease: "sine.inOut"},
    scrollTrigger: {trigger: track, start: "top top", end: "bottom bottom", scrub: 1},
  });
  const show = (target, at, from = {y: 40}) =>
    tl.fromTo(target, {autoAlpha: 0, filter: "blur(10px)", ...from}, {autoAlpha: 1, filter: "blur(0px)", x: 0, y: 0, duration: 0.8}, at);
  const hide = (target, at) => tl.to(target, {autoAlpha: 0, filter: "blur(10px)", y: -30, duration: 0.6}, at);

  // Opening: large brain, the first line fades in.
  show(".ns-beat--open", 0.15);
  hide(".ns-beat--open", 1.6);
  // Approach: dolly in, filaments light up.
  tl.to(look, {camZ: 4.8, brainX: 0.85, intensity: 1, duration: 3}, 0.4);
  show(".ns-beat--approach", 2.1, {x: -40});
  hide(".ns-beat--approach", 3.5);
  // Side perspective: orbit round, brain moves aside for the copy.
  tl.to(look, {orbit: 0.65, brainX: -1.1, duration: 2}, 3.4);
  show(".ns-beat--side", 4.0, {x: 40});
  hide(".ns-beat--side", 5.3);
  // Pullback into the laptop.
  tl.to(look, {camZ: 9.5, brainX: 0, brainY: -0.2, scale: 0.8, dim: 0.3, intensity: 0.5, duration: 1.8}, 5.3);
  tl.fromTo(
    ".ns-laptop",
    {autoAlpha: 0, rotateX: 28, y: 140, scale: 0.82},
    {autoAlpha: 1, rotateX: 0, y: 0, scale: 1, duration: 1.4},
    5.9,
  );
  show(".ns-beat--device .ns-copy", 6.4);
  tl.to(".ns-beat--device", {autoAlpha: 0, scale: 1.12, filter: "blur(8px)", duration: 0.8}, 7.9);
  // Return: back into the brain, final call to action.
  tl.to(look, {camZ: 6, orbit: 2.75, brainX: 1.1, brainY: 0, scale: 1, dim: 1, intensity: 0.9, duration: 1.8}, 8.0);
  show(".ns-beat--final", 8.8, {x: -40});
  tl.to({}, {duration: 0.4}, 9.6); // hold the final frame briefly
  return tl;
};

const NeuralStory = () => {
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const [mode] = useState(readMode);
  // The static layout never scrubs, so it starts at the close, lit-up view.
  const [look] = useState(() => (mode.cinematic ? createLook() : {...createLook(), camZ: 6.2, intensity: 0.85}));
  // Without IntersectionObserver, just keep rendering.
  const [active, setActive] = useState(() => typeof IntersectionObserver === "undefined");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting));
    observer.observe(trackRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!mode.cinematic) return undefined;
    const ctx = gsap.context(() => buildTimeline(trackRef.current, look), sectionRef);
    return () => ctx.revert();
  }, [mode, look]);

  return (
    <section
      ref={sectionRef}
      className={`ns ${mode.cinematic ? "ns--cinematic" : "ns--static"}`}
      aria-label="How CareerVeda builds your career"
    >
      <div className="ns-fade ns-fade--in" aria-hidden="true" />
      <div className="ns-track" ref={trackRef}>
        <div className="ns-stage">
          <div className="ns-canvas" aria-hidden="true">
            {mode.webgl && <Stage mode={mode} look={look} active={active} />}
          </div>

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
                  src="/images/careerveda-site.jpg"
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
