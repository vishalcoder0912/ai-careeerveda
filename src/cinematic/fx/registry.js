import {gsap} from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* Central registry so the lazy page can kill every tween/trigger it created on
   unmount — nothing leaks into other routes, where a stray ScrollTrigger would
   keep pinning phantom space. */
const tweens = [];
const triggers = [];

export const addTween = (t) => {
  tweens.push(t);
  return t;
};
export const addTrigger = (t) => {
  triggers.push(t);
  return t;
};
export const killFX = () => {
  triggers.forEach((t) => t.kill());
  tweens.forEach((t) => t.kill());
  tweens.length = 0;
  triggers.length = 0;
  ScrollTrigger.refresh();
};

export const reducedMotionNow = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Lenis drives window scroll on its own rAF loop, so pinned triggers must be
   told the page moved. One subscription, torn down with the page. */
export const syncLenisToScrollTrigger = (lenis) => {
  if (!lenis) return () => {};
  const onScroll = () => ScrollTrigger.update();
  lenis.on("scroll", onScroll);
  return () => lenis.off("scroll", onScroll);
};

/* Ease used across the whole cinematic system (expo.out family). */
export const EASE = gsap.parseEase("expo.out");

export const gsapObject = {gsap, ScrollTrigger};
export default gsapObject;