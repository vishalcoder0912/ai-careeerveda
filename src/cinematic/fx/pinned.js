import {gsap} from "gsap";
import {addTrigger, addTween} from "./registry";

/**
 * The shared cinematic "pinned + scrubbed proxy" pattern used by every film
 * section. Pins `pinEl` while the visitor scrolls through `end`, then scrubs a
 * proxy 0→1 and calls `onUpdate(proxy)` in lockstep with the scroll.
 *
 * Implemented as a single scrubbed timeline (the same shape the Skills
 * section uses), so the pin is owned by exactly one ScrollTrigger — a
 * separate `ScrollTrigger.create({pin})` proved fragile here (GSAP tears its
 * spacer back down shortly after creation). Returns a teardown that dissolves
 * both the pin and the tween.
 */
export const createPinnedScrub = ({
  section,
  pinEl,
  end = "+=300%",
  scrub = 1,
  onUpdate,
}) => {
  const proxy = {p: 0};
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end,
      pin: pinEl,
      scrub,
      anticipatePin: 1,
      onRefresh: (self) => self.scroll(),
    },
  });

  tl.to(proxy, {p: 1, duration: 3, onUpdate: () => onUpdate(proxy)}, 0);

  /* The scrub's playhead does not call onUpdate at progress 0, so paint the
     initial frame now. Cheap on canonical layouts; a viewport that cannot show
     the pinned row simply skips a few empty frames. */
  onUpdate(proxy);

  addTrigger(tl.scrollTrigger);
  addTween(tl);

  return () => {
    tl.scrollTrigger?.kill();
    tl.kill();
  };
};