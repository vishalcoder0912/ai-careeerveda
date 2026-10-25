/* eslint-disable react-hooks/immutability -- `look` is a GSAP frame object, mutated per tick by design (as in NeuralStory) */
import {useEffect, useState} from "react";
import {gsap} from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import * as THREE from "three";
import BrainCanvas from "./BrainCanvas";
import {BRAIN_SIZE, FOV, HANDOFF, composeLook, createLook} from "./flow";

gsap.registerPlugin(ScrollTrigger);

const HERO_CAM_Z = createLook().camZ;
// `light` gets its own tween below, synced with the midnight.
const {light: _heroLight, ...HERO_FRAME} = createLook();
const {light: _handoffLight, ...HANDOFF_FRAME} = HANDOFF;
const TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2));

// Where the hero's brain sits: centred on the hero's visual column and sized
// to fill ~85% of it, in the fractions the rig reads. Measured from the
// layout, so every breakpoint lines up without per-size constants.
const heroAnchor = (flowEl) => {
  const host = flowEl.getBoundingClientRect();
  const box = flowEl.querySelector(".hh-visual")?.getBoundingClientRect();
  // The stage, not innerHeight: on phones that changes as the address bar
  // slides, while the 100svh stage (and so the canvas) does not.
  const viewH = flowEl.querySelector(".nf-stage")?.clientHeight || window.innerHeight;
  if (!box || !box.width) return {sx: 0.25, sy: 0, scale: 1};
  const worldPerPx = (2 * TAN * HERO_CAM_Z) / viewH;
  return {
    sx: (box.left + box.width / 2 - host.left) / host.width - 0.5,
    sy: 0.5 - (box.top - host.top + box.height / 2) / viewH,
    scale: Math.min((box.width * 0.85) / BRAIN_SIZE.width, (box.height * 0.85) / BRAIN_SIZE.height) * worldPerPx,
  };
};

// The hero half of the sequence: from the hero frame to HANDOFF, scrubbed
// from the top of the flow until the hero has scrolled away (where the story
// pins). The story timeline
// (NeuralStory.jsx) starts from HANDOFF, so the two meet without a reset.
const FlowStage = ({flowRef, look, state, mode, onReady}) => {
  const [active, setActive] = useState(true);

  useEffect(() => {
    const flowEl = flowRef.current;
    const anchor = (key) => () => heroAnchor(flowEl)[key];
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: flowEl,
          start: "top top",
          // The story mounts lazily right below the hero, so the hero's own
          // bottom edge is where it pins, and it exists from the first frame.
          endTrigger: flowEl.querySelector(".hh") ?? flowEl,
          end: "bottom top",
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
      tl.fromTo(
        state.hero,
        {...HERO_FRAME, sx: anchor("sx"), sy: anchor("sy"), scale: anchor("scale")},
        {...HANDOFF_FRAME, duration: 1, ease: "power1.inOut"},
        0,
      );
      // Midnight rises once the hero copy is mostly off screen, so the navy
      // headline never sits on a darkening page. It starts as brand blue and
      // deepens, so the half-way frames read blue, not grey. The brain's
      // rendering crosses from day to night on the same stretch of scroll.
      tl.fromTo(
        ".nf-night",
        {opacity: 0, backgroundColor: "#1d4ed8"},
        {opacity: 1, backgroundColor: "#040a1c", duration: 0.42, ease: "sine.in"},
        0.58,
      );
      tl.fromTo(state.hero, {light: 1}, {light: 0, duration: 0.42, ease: "sine.inOut"}, 0.58);
    }, flowEl);

    // The brain rides along with the hero's visual column. Wide: until that
    // column reaches mid-screen, then the timeline takes over. Narrow (one
    // column, stats under the brain): it scrolls away with its column like an
    // image, and comes back to the timeline's frame as the midnight rises
    // (light 1 → 0), so it never sits behind the stats. Offsets cached per
    // refresh, so the tick does no layout reads.
    let rig = null;
    const measure = () => {
      const host = flowEl.getBoundingClientRect();
      const box = flowEl.querySelector(".hh-visual")?.getBoundingClientRect();
      const stageH = flowEl.querySelector(".nf-stage")?.clientHeight || window.innerHeight;
      const narrow = window.matchMedia("(max-width: 899px)").matches;
      rig = box?.height ? {hostTop: host.top + window.scrollY, mid: box.top - host.top + box.height / 2, stageH, narrow} : null;
    };
    measure();
    ScrollTrigger.addEventListener("refresh", measure);

    // Compose the frame the rig reads (see STORY_KEYS in flow.js).
    const compose = () => {
      composeLook(look, state);
      if (!rig || state.storyActive) return;
      const hostTop = rig.hostTop - window.scrollY;
      const follow = 0.5 - (hostTop + rig.mid - Math.max(hostTop, 0)) / rig.stageH;
      look.sy = rig.narrow ? follow + (look.sy - follow) * (1 - state.hero.light) : Math.min(look.sy, follow);
    };
    compose();
    gsap.ticker.add(compose);

    const observer = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting));
    observer.observe(flowEl);
    return () => {
      observer.disconnect();
      ScrollTrigger.removeEventListener("refresh", measure);
      gsap.ticker.remove(compose);
      ctx.revert();
    };
  }, [flowRef, look, state]);

  return <BrainCanvas look={look} mode={mode} active={active} onCreated={onReady} />;
};

export default FlowStage;
