import {useEffect, useState} from "react";

// True when the device has a precise, hovering pointer — i.e. a mouse or
// trackpad, not a finger.
//
// Needed because a pointer-trail effect has nothing to react to on a
// touchscreen: without this, the partner band would render an empty box on
// every phone. Callers use it to fall back to a static layout.
//
// matchMedia rather than a resize listener: the browser only notifies us when
// the capability actually changes (e.g. a tablet gains a mouse), so this costs
// nothing on scroll or resize.
const QUERY = "(hover: hover) and (pointer: fine)";

const read = () => {
  if (typeof window === "undefined" || !window.matchMedia) return false;

  return window.matchMedia(QUERY).matches;
};

export const useFinePointer = () => {
  // Lazy initialiser so the first paint already knows, rather than mounting the
  // trail on a phone and then swapping it out.
  const [isFine, setIsFine] = useState(read);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;

    const query = window.matchMedia(QUERY);
    const sync = () => setIsFine(query.matches);

    query.addEventListener("change", sync);
    sync();

    return () => query.removeEventListener("change", sync);
  }, []);

  return isFine;
};

export default useFinePointer;
