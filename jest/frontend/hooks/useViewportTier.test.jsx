// useViewportTier — which breakpoint the viewport is in.
//
// jsdom does not implement window.matchMedia, so the suite installs one and
// drives it. The behaviour that matters is that the tier is decided on the very
// first render (a desktop-sized hero must not mount before being swapped out)
// and that the hook re-reads the media queries when a boundary is crossed —
// not on every resize.
//
// The breakpoints mirror the stylesheet tier system: mobile <= 767,
// tablet 768-1023, laptop 1024-1199, desktop >= 1200.

import {describe, it, expect, jest, afterEach} from "@jest/globals";
import {renderHook, act} from "@testing-library/react";

import useViewportTier from "../../../src/hooks/useViewportTier";

const LAPTOP_QUERY = "(max-width: 1199px)";
const TABLET_QUERY = "(max-width: 1023px)";
const MOBILE_QUERY = "(max-width: 767px)";

const listenersByQuery = new Map();

const makeQuery = (media, matches) => {
  const listeners = new Set();
  listenersByQuery.set(media, listeners);
  return {
    media,
    matches,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn((type, callback) => {
      if (type === "change") listeners.add(callback);
    }),
    removeEventListener: jest.fn((type, callback) => {
      if (type === "change") listeners.delete(callback);
    }),
    dispatchEvent: jest.fn(),
  };
};

// Window's matchMedia answers from the three live query objects below, which
// the tests can flip and then notify, exactly as the browser would at a
// breakpoint.
let laptopQuery;
let tabletQuery;
let mobileQuery;

const stubMatchMedia = ({laptop = false, tablet = false, mobile = false} = {}) => {
  laptopQuery = makeQuery(LAPTOP_QUERY, laptop);
  tabletQuery = makeQuery(TABLET_QUERY, tablet);
  mobileQuery = makeQuery(MOBILE_QUERY, mobile);
  window.matchMedia = jest.fn((media) => {
    if (media === LAPTOP_QUERY) return laptopQuery;
    if (media === TABLET_QUERY) return tabletQuery;
    return mobileQuery;
  });
  return window.matchMedia;
};

const fireChange = (query) => {
  for (const callback of listenersByQuery.get(query.media) || []) callback();
};

afterEach(() => {
  delete window.matchMedia;
});

describe("useViewportTier", () => {
  it("reports desktop on the first render when no breakpoint matches", () => {
    stubMatchMedia({tablet: false, mobile: false});

    const {result} = renderHook(() => useViewportTier());

    expect(result.current).toBe("desktop");
  });

  it("reports mobile when the mobile query matches", () => {
    stubMatchMedia({tablet: true, mobile: true});

    const {result} = renderHook(() => useViewportTier());

    expect(result.current).toBe("mobile");
  });

  it("reports tablet for the band between the two breakpoints", () => {
    stubMatchMedia({tablet: true, mobile: false});

    const {result} = renderHook(() => useViewportTier());

    expect(result.current).toBe("tablet");
  });

  it("treats mobile as the narrower, higher-priority breakpoint", () => {
    stubMatchMedia({tablet: true, mobile: true});

    const {result} = renderHook(() => useViewportTier());

    expect(result.current).toBe("mobile");
  });

  it("re-reads the queries when a boundary is crossed", () => {
    stubMatchMedia({tablet: false, mobile: false});
    const {result} = renderHook(() => useViewportTier());
    expect(result.current).toBe("desktop");

    act(() => {
      tabletQuery.matches = true;
      fireChange(tabletQuery);
    });

    expect(result.current).toBe("tablet");
  });

  it("watches every breakpoint, not just one", () => {
    const matchMedia = stubMatchMedia({laptop: false, tablet: false, mobile: false});

    renderHook(() => useViewportTier());

    expect(matchMedia).toHaveBeenCalledWith(LAPTOP_QUERY);
    expect(matchMedia).toHaveBeenCalledWith(TABLET_QUERY);
    expect(matchMedia).toHaveBeenCalledWith(MOBILE_QUERY);
  });

  it("stops listening when the caller unmounts", () => {
    stubMatchMedia({laptop: false, tablet: false, mobile: false});

    const {unmount} = renderHook(() => useViewportTier());
    unmount();

    expect(laptopQuery.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    expect(tabletQuery.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    expect(mobileQuery.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("settles on desktop when matchMedia is unavailable, instead of crashing", () => {
    const {result} = renderHook(() => useViewportTier());

    expect(result.current).toBe("desktop");
  });
});