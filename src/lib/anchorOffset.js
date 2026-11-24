/**
 * The site declares the fixed-navbar clearance once, as `[id] { scroll-margin-top }`.
 * Lenis already subtracts that value when given an element, so passing an extra
 * `offset` double-counts the bar and deep links land ~90px too low. Native
 * `window.scrollTo` does not read scroll-margin, so it still needs the number —
 * read the same CSS value here instead of measuring the bar a second time.
 * `fallback` keeps the older explicit-header-height API working in tests and
 * for targets whose scroll-margin has not been styled yet.
 */
export const getAnchorOffset = (el, fallback) => {
  const margin =
    el && typeof window !== "undefined"
      ? Number.parseFloat(getComputedStyle(el).scrollMarginTop)
      : NaN;
  if (Number.isFinite(margin) && margin > 0) return margin;
  if (fallback !== undefined) return fallback;
  const nav = typeof window !== "undefined" ? document.querySelector(".site-nav") : null;
  return (nav && nav.offsetHeight ? nav.offsetHeight : 76) + 12;
};
