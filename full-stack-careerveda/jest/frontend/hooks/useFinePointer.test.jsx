// useFinePointer — whether the device has a precise, hovering pointer.
//
// The pointer-trail effect renders an empty box on a touchscreen, so the hook
// must know the answer on its first render (a phone must not mount the trail
// and then swap it out) and must re-answer when the capability changes, such as
// a tablet gaining a mouse.

import {describe, it, expect, jest, afterEach} from "@jest/globals";
import {renderHook, act} from "@testing-library/react";

import {useFinePointer} from "../../../src/hooks/useFinePointer";

const QUERY = "(hover: hover) and (pointer: fine)";

let listeners = new Set();
let liveQuery = null;

const stubMatchMedia = (matches) => {
  listeners = new Set();
  liveQuery = {
    media: QUERY,
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
  window.matchMedia = jest.fn(() => liveQuery);
  return window.matchMedia;
};

const fireChange = () => {
  for (const callback of listeners) callback();
};

afterEach(() => {
  delete window.matchMedia;
});

describe("useFinePointer", () => {
  it("reports true on the first render for a mouse or trackpad", () => {
    stubMatchMedia(true);

    const {result} = renderHook(() => useFinePointer());

    expect(result.current).toBe(true);
  });

  it("reports false on the first render for a touchscreen", () => {
    stubMatchMedia(false);

    const {result} = renderHook(() => useFinePointer());

    expect(result.current).toBe(false);
  });

  it("updates when the pointer capability changes", () => {
    stubMatchMedia(false);
    const {result} = renderHook(() => useFinePointer());
    expect(result.current).toBe(false);

    act(() => {
      liveQuery.matches = true;
      fireChange();
    });

    expect(result.current).toBe(true);
  });

  it("queries the precise-pointer media feature specifically", () => {
    const matchMedia = stubMatchMedia(true);

    renderHook(() => useFinePointer());

    expect(matchMedia).toHaveBeenCalledWith(QUERY);
  });

  it("stops listening when the caller unmounts", () => {
    stubMatchMedia(true);

    const {unmount} = renderHook(() => useFinePointer());
    unmount();

    expect(liveQuery.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("settles on false when matchMedia is unavailable, so no trail renders on a phone", () => {
    const {result} = renderHook(() => useFinePointer());

    expect(result.current).toBe(false);
  });
});