import {useEffect, useState} from "react";

// Reports which breakpoint the viewport is in, so a component can scale its own
// cost down on smaller screens. The breakpoints deliberately match the ones the
// stylesheets already use (980px / 680px) rather than inventing new ones.
//
// Written against matchMedia instead of a resize listener: the browser only
// notifies us when a boundary is actually crossed, so scrolling and resizing
// don't trigger a render per pixel.
const TABLET_QUERY = "(max-width: 980px)";
const MOBILE_QUERY = "(max-width: 680px)";

const readTier = () => {
  if (typeof window === "undefined" || !window.matchMedia) return "desktop";

  if (window.matchMedia(MOBILE_QUERY).matches) return "mobile";
  if (window.matchMedia(TABLET_QUERY).matches) return "tablet";

  return "desktop";
};

export const useViewportTier = () => {
  // Lazy initialiser, so the first paint already has the right tier and we
  // don't mount a 200-particle desktop field on a phone and then swap it.
  const [tier, setTier] = useState(readTier);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;

    const queries = [window.matchMedia(TABLET_QUERY), window.matchMedia(MOBILE_QUERY)];
    const sync = () => setTier(readTier());

    queries.forEach((query) => query.addEventListener("change", sync));
    sync();

    return () => {
      queries.forEach((query) => query.removeEventListener("change", sync));
    };
  }, []);

  return tier;
};

export default useViewportTier;
