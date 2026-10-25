import {createContext, useContext} from "react";

// What the hero, the shared stage and the scroll story agree on. Kept free of
// three.js so the hero can read it without pulling in the 3D chunk.

export const FOV = 42;
// The brain's world-space footprint at scale 1 (see brainGeometry.js).
export const BRAIN_SIZE = {width: 2.6, height: 2.3};

// What the timelines animate and the rig reads every frame (never React
// state). sx/sy place the brain's centre on screen as a fraction of the
// canvas (0 = centre, +sx right, +sy up), so the hero can pin it to its
// column whatever the camera distance. light: 1 on the white hero, 0 in the
// midnight story; the brain, motes and core blend between the two.
export const createLook = () => ({
  camZ: 7.6,
  orbit: 0,
  sx: 0,
  sy: 0,
  scale: 1,
  turn: 0,
  intensity: 0.7,
  dim: 1,
  gain: 1.5,
  core: 1,
  light: 1,
});

// The hand-off frame: where the hero's scroll leaves the brain and the story
// picks it up. Both timelines use it, so neither resets the other.
export const HANDOFF = {camZ: 7.6, orbit: 0, sx: 0, sy: 0.08, scale: 1, turn: 0.6, intensity: 0.6, dim: 1, gain: 0.95, core: 0.45, light: 0};

// The rig reads one `look`, but the two timelines each animate their own
// object and FlowStage composes them every tick: the hero's values, with the
// story's camera and framing on top while the story is under way. Both used
// to write `look` directly, and the story's smoothed scrub, still easing after
// a quick scroll back up, overwrote the hero frame with HANDOFF. The hero ends
// on HANDOFF and the story starts there, so the switch is seamless.
export const STORY_KEYS = ["camZ", "orbit", "sx", "sy", "scale", "intensity", "dim"];
export const createFlowState = () => ({hero: createLook(), story: {...HANDOFF}, storyActive: false});
export const composeLook = (look, state) => {
  Object.assign(look, state.hero);
  if (state.storyActive) for (const key of STORY_KEYS) look[key] = state.story[key];
};

// Software renderers: Chrome's ANGLE-on-SwiftShader does NOT trip
// failIfMajorPerformanceCaveat, so its name is checked too.
const SOFTWARE_GL = /swiftshader|llvmpipe|softpipe|software|basic render driver/i;

// Only real GPU WebGL counts. Where WebGL is emulated on the CPU (no GPU, a
// blocklisted driver, a VM, headless Chrome) the particle brain froze the main
// thread for ~3 s on load (measured: Total Blocking Time ~3,000 ms with it,
// ~50 ms without), so those visitors get the CSS atmosphere the no-WebGL path
// already draws. The probe context is released straight away: browsers cap
// live WebGL contexts, and this runs more than once per page.
export const hasWebGL = () => {
  try {
    const gl = document.createElement("canvas").getContext("webgl2", {failIfMajorPerformanceCaveat: true});
    if (!gl) return false;
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = String(gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return !SOFTWARE_GL.test(renderer);
  } catch {
    return false;
  }
};

// Runs `callback` once the page has loaded AND the main thread has a gap.
// "load" alone fires while React is still painting the home page on a
// mid-range phone, and three.js (~870 ms of parse + scene setup there) then
// lands on top of it as one long block. Waiting for idle lets the page become
// usable first; the timeout caps the wait on a page that never goes quiet.
// Returns a cancel function for effect cleanup.
export const whenLoadedAndIdle = (callback) => {
  let idleId = null;
  let timer = null;
  const queue = () => {
    if (typeof window.requestIdleCallback === "function") idleId = window.requestIdleCallback(callback, {timeout: 2500});
    else timer = setTimeout(callback, 300); // Safari: no requestIdleCallback
  };
  if (document.readyState === "complete") queue();
  else window.addEventListener("load", queue, {once: true});
  return () => {
    window.removeEventListener("load", queue);
    if (idleId !== null) window.cancelIdleCallback(idleId);
    clearTimeout(timer);
  };
};

const matches = (query) => typeof window !== "undefined" && Boolean(window.matchMedia?.(query).matches);

// cinematic: one sticky canvas carries the brain from the hero through the
// story, on every screen size. Otherwise (reduced motion, no WebGL) the hero
// and the story each show a still-composed copy of the same scene.
export const readMode = () => {
  const reduced = matches("(prefers-reduced-motion: reduce)");
  const phone = matches("(max-width: 767px)");
  const weak = typeof navigator !== "undefined" && (navigator.hardwareConcurrency || 8) <= 4;
  const webgl = typeof document !== "undefined" && hasWebGL();
  return {
    cinematic: !reduced && webgl,
    still: reduced,
    phone,
    webgl,
    count: phone ? 4000 : weak ? 7000 : 11000,
  };
};

export const NeuralFlowContext = createContext(null);
export const useNeuralFlow = () => useContext(NeuralFlowContext);
