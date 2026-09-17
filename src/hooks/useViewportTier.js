import {useEffect, useState} from "react";

// Reports which breakpoint the viewport is in, so a component can scale its own
// cost down on smaller screens. The breakpoints match the responsive tier system
// the stylesheets use: mobile <= 767, tablet 768-1023, laptop 1024-1199,
// desktop >= 1200.
//
// Written against matchMedia instead of a resize listener: the browser only
// notifies us when a boundary is actually crossed, so scrolling and resizing
// don't trigger a render per pixel.
const LAPTOP_QUERY = "(max-width: 1199px)";
const TABLET_QUERY = "(max-width: 1023px)";
const MOBILE_QUERY = "(max-width: 767px)";

const readTier = () => {
  if (typeof window === "undefined" || !window.matchMedia) return "desktop";

  if (window.matchMedia(MOBILE_QUERY).matches) return "mobile";
  if (window.matchMedia(TABLET_QUERY).matches) return "tablet";
  if (window.matchMedia(LAPTOP_QUERY).matches) return "laptop";

  return "desktop";
};

export const useViewportTier = () => {
  // Lazy initialiser, so the first paint already has the right tier and we
  // don't mount a 200-particle desktop field on a phone and then swap it.
  const [tier, setTier] = useState(readTier);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;

    const queries = [window.matchMedia(LAPTOP_QUERY), window.matchMedia(TABLET_QUERY), window.matchMedia(MOBILE_QUERY)];
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
