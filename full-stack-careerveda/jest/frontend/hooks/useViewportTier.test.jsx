// useViewportTier — which breakpoint the viewport is in.
//
// jsdom does not implement window.matchMedia, so the suite installs one and
// drives it. The behaviour that matters is that the tier is decided on the very
// first render (a desktop-sized hero must not mount before being swapped out)
// and that the hook re-reads the media queries when a boundary is crossed —
// not on every resize.

import {describe, it, expect, jest, afterEach} from "@jest/globals";
import {renderHook, act} from "@testing-library/react";

import useViewportTier from "../../../src/hooks/useViewportTier";

const TABLET_QUERY = "(max-width: 980px)";
const MOBILE_QUERY = "(max-width: 680px)";

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

// Window's matchMedia answers from the two live query objects below, which the
// tests can flip and then notify, exactly as the browser would at a breakpoint.
let tabletQuery;
let mobileQuery;

const stubMatchMedia = ({tablet = false, mobile = false} = {}) => {
  tabletQuery = makeQuery(TABLET_QUERY, tablet);
  mobileQuery = makeQuery(MOBILE_QUERY, mobile);
  window.matchMedia = jest.fn((media) => (media === TABLET_QUERY ? tabletQuery : mobileQuery));
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

  it("watches both breakpoints, not just one", () => {
    const matchMedia = stubMatchMedia({tablet: false, mobile: false});

    renderHook(() => useViewportTier());

    expect(matchMedia).toHaveBeenCalledWith(TABLET_QUERY);
    expect(matchMedia).toHaveBeenCalledWith(MOBILE_QUERY);
  });

  it("stops listening when the caller unmounts", () => {
    stubMatchMedia({tablet: false, mobile: false});

    const {unmount} = renderHook(() => useViewportTier());
    unmount();

    expect(tabletQuery.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    expect(mobileQuery.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("settles on desktop when matchMedia is unavailable, instead of crashing", () => {
    const {result} = renderHook(() => useViewportTier());

    expect(result.current).toBe("desktop");
  });
});