// The five scroll hooks.
//
// Scroll bugs are the hardest class of bug to catch by hand — the symptom is
// "it feels wrong", it only shows on a real wheel, and the causes (two Lenis
// instances fighting, a listener that outlives its component, a ticker callback
// never removed) all look fine in the source. Lenis is replaced with a recorder
// so every subscribe/unsubscribe and every destroy is observable.

import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";
import {act, cleanup, fireEvent, render, renderHook, screen, waitFor} from "@testing-library/react";
import {useRef} from "react";

// A stand-in that records exactly what the provider does to it. Not a stub of
// our behaviour — Lenis's own surface, reduced to the parts this file touches.
const instances = [];

vi.mock("lenis", () => ({
  default: class LenisDouble {
    constructor(options) {
      this.options = options;
      this.listeners = new Map();
      this.destroyed = false;
      this.stopped = false;
      this.rafCalls = [];
      this.scrolledTo = [];
      instances.push(this);
    }

    on(event, handler) {
      if (!this.listeners.has(event)) this.listeners.set(event, new Set());
      this.listeners.get(event).add(handler);
    }

    off(event, handler) {
      this.listeners.get(event)?.delete(handler);
    }

    emit(event, payload) {
      for (const handler of this.listeners.get(event) || []) handler(payload);
    }

    countFor(event) {
      return this.listeners.get(event)?.size || 0;
    }

    raf(time) {
      this.rafCalls.push(time);
    }

    scrollTo(target, options) {
      this.scrolledTo.push({target, options});
    }

    stop() {
      this.stopped = true;
    }

    start() {
      this.stopped = false;
    }

    destroy() {
      this.destroyed = true;
    }
  },
}));

const ticker = {added: [], removed: [], lagSmoothing: vi.fn()};

vi.mock("gsap", () => ({
  default: {
    registerPlugin: vi.fn(),
    ticker: {
      add: (fn) => ticker.added.push(fn),
      remove: (fn) => ticker.removed.push(fn),
      lagSmoothing: (...args) => ticker.lagSmoothing(...args),
    },
  },
}));

const scrollTriggerUpdate = vi.fn();
vi.mock("gsap/ScrollTrigger", () => ({ScrollTrigger: {update: () => scrollTriggerUpdate()}}));

const {
  SmoothScrollProvider,
  useAnchorScroll,
  useLenis,
  useLockSmoothScroll,
  useScrollProgress,
  useSmoothScrollY,
} = await import("./smoothScroll");

const latest = () => instances[instances.length - 1];

// The provider wires itself to GSAP through a dynamic import, so the wiring
// lands a microtask after mount. Waiting for it is what makes the ticker
// assertions deterministic rather than racy.
const wrapper = ({children}) => <SmoothScrollProvider>{children}</SmoothScrollProvider>;

const reducedMotion = (matches) => {
  window.matchMedia = (query) => ({
    matches: query.includes("prefers-reduced-motion") ? matches : false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    onchange: null,
    dispatchEvent: () => false,
  });
};

// jsdom cannot navigate, and an un-prevented click on a real href prints a
// "Not implemented: navigation" page error. Registered on `document`, so it runs
// AFTER the container's own delegated handler and cannot mask what that handler
// decided — the container is earlier in the bubble path.
const swallowNavigation = (event) => {
  const link = event.target.closest?.("a[href]");
  if (link && !link.getAttribute("href").startsWith("#")) event.preventDefault();
};

beforeEach(() => {
  document.addEventListener("click", swallowNavigation);
  instances.length = 0;
  ticker.added.length = 0;
  ticker.removed.length = 0;
  ticker.lagSmoothing.mockClear();
  scrollTriggerUpdate.mockClear();
  reducedMotion(false);
});

afterEach(() => {
  document.removeEventListener("click", swallowNavigation);
  cleanup();
  vi.restoreAllMocks();
});

// ── SmoothScrollProvider ────────────────────────────────────────────────────

describe("SmoothScrollProvider", () => {
  it("builds exactly one Lenis for the whole tree", async () => {
    const {result} = renderHook(() => useLenis(), {wrapper});

    await waitFor(() => expect(result.current).toBeTruthy());
    expect(instances).toHaveLength(1);
  });

  it("hands the same instance to every consumer, so nothing fights for the scroll position", async () => {
    const seen = [];
    const Consumer = () => {
      seen.push(useLenis());
      return null;
    };

    render(
      <SmoothScrollProvider>
        <Consumer />
        <Consumer />
      </SmoothScrollProvider>,
    );

    await waitFor(() => expect(seen.at(-1)).toBeTruthy());
    expect(seen.at(-1)).toBe(seen.at(-2));
  });

  it("builds nothing at all under reduced motion — native scrolling, not a slowed-down effect", async () => {
    reducedMotion(true);

    const {result} = renderHook(() => useLenis(), {wrapper});

    await act(async () => {});
    expect(instances).toHaveLength(0);
    expect(result.current).toBeNull();
  });

  it("builds nothing when disabled", async () => {
    const {result} = renderHook(() => useLenis(), {
      wrapper: ({children}) => <SmoothScrollProvider enabled={false}>{children}</SmoothScrollProvider>,
    });

    await act(async () => {});
    expect(instances).toHaveLength(0);
    expect(result.current).toBeNull();
  });

  it("exposes null, not undefined, when smooth scrolling is off — consumers branch on it", async () => {
    const {result} = renderHook(() => useLenis(), {
      wrapper: ({children}) => <SmoothScrollProvider enabled={false}>{children}</SmoothScrollProvider>,
    });

    await act(async () => {});
    expect(result.current).toBeNull();
  });

  it("returns null outside any provider rather than throwing", () => {
    const {result} = renderHook(() => useLenis());

    expect(result.current).toBeNull();
  });

  it("does not multiply the touch momentum the OS already applies", async () => {
    renderHook(() => useLenis(), {wrapper});

    await waitFor(() => expect(latest()).toBeTruthy());
    expect(latest().options.touchMultiplier).toBeLessThanOrEqual(1.5);
    expect(latest().options.wheelMultiplier).toBe(1);
    expect(latest().options.infinite).toBe(false);
  });

  describe("sharing one clock with GSAP", () => {
    it("drives Lenis from gsap.ticker rather than a second rAF loop", async () => {
      renderHook(() => useLenis(), {wrapper});

      await waitFor(() => expect(ticker.added).toHaveLength(1));

      // gsap.ticker reports seconds; Lenis expects milliseconds.
      ticker.added[0](2);
      expect(latest().rafCalls).toEqual([2000]);
    });

    it("updates ScrollTrigger on every Lenis scroll, so pinned elements do not jitter a frame behind", async () => {
      renderHook(() => useLenis(), {wrapper});

      await waitFor(() => expect(latest().countFor("scroll")).toBe(1));

      latest().emit("scroll", {scroll: 100});
      expect(scrollTriggerUpdate).toHaveBeenCalledTimes(1);
    });

    it("disables lag smoothing, which would otherwise skip Lenis frames", async () => {
      renderHook(() => useLenis(), {wrapper});

      await waitFor(() => expect(ticker.lagSmoothing).toHaveBeenCalledWith(0));
    });
  });

  describe("teardown", () => {
    it("destroys the instance on unmount", async () => {
      const {unmount} = renderHook(() => useLenis(), {wrapper});

      await waitFor(() => expect(instances).toHaveLength(1));
      const instance = latest();

      unmount();
      expect(instance.destroyed).toBe(true);
    });

    it("detaches its ScrollTrigger listener, so a stale one cannot keep firing", async () => {
      const {unmount} = renderHook(() => useLenis(), {wrapper});

      await waitFor(() => expect(latest().countFor("scroll")).toBe(1));
      const instance = latest();

      unmount();
      expect(instance.countFor("scroll")).toBe(0);
    });

    it("removes its ticker callback, which is the leak that grows across route changes", async () => {
      const {unmount} = renderHook(() => useLenis(), {wrapper});

      await waitFor(() => expect(ticker.added).toHaveLength(1));

      unmount();
      await waitFor(() => expect(ticker.removed).toEqual(ticker.added));
    });

    it("tears the old instance down before building a new one when enabled flips", async () => {
      const {rerender} = render(<SmoothScrollProvider enabled><span /></SmoothScrollProvider>);

      await waitFor(() => expect(instances).toHaveLength(1));
      const first = latest();

      rerender(<SmoothScrollProvider enabled={false}><span /></SmoothScrollProvider>);
      expect(first.destroyed).toBe(true);
      expect(instances).toHaveLength(1);

      rerender(<SmoothScrollProvider enabled><span /></SmoothScrollProvider>);
      await waitFor(() => expect(instances).toHaveLength(2));
      expect(latest()).not.toBe(first);
    });
  });
});

// ── useAnchorScroll ─────────────────────────────────────────────────────────

describe("useAnchorScroll", () => {
  const Anchored = ({headerHeight}) => {
    const ref = useRef(null);
    useAnchorScroll(ref, headerHeight === undefined ? undefined : {headerHeight});

    return (
      <div ref={ref}>
        <a href="#faq">To the FAQ</a>
        <a href="#missing">To nowhere</a>
        <a href="#">Empty hash</a>
        <a href="/programs">A real link</a>
        <section id="faq">FAQ</section>
      </div>
    );
  };

  const renderAnchored = (props = {}) =>
    render(
      <SmoothScrollProvider>
        <Anchored {...props} />
      </SmoothScrollProvider>,
    );

  it("scrolls through Lenis with the header offset applied", async () => {
    renderAnchored();
    await waitFor(() => expect(latest()).toBeTruthy());

    fireEvent.click(screen.getByText("To the FAQ"));

    expect(latest().scrolledTo).toHaveLength(1);
    expect(latest().scrolledTo[0].target).toBe(document.getElementById("faq"));
    expect(latest().scrolledTo[0].options).toEqual({offset: -76});
  });

  it("honours a custom header height", async () => {
    renderAnchored({headerHeight: 120});
    await waitFor(() => expect(latest()).toBeTruthy());

    fireEvent.click(screen.getByText("To the FAQ"));

    expect(latest().scrolledTo[0].options).toEqual({offset: -120});
  });

  it("moves focus to the target, or a keyboard user is left behind in the nav", async () => {
    renderAnchored();
    await waitFor(() => expect(latest()).toBeTruthy());

    fireEvent.click(screen.getByText("To the FAQ"));

    const target = document.getElementById("faq");
    expect(target.getAttribute("tabindex")).toBe("-1");
    expect(document.activeElement).toBe(target);
  });

  it("still applies the offset with no Lenis — the offset is a layout fix, not a flourish", async () => {
    const scrollSpy = vi.fn();
    vi.stubGlobal("scrollTo", scrollSpy);

    render(
      <SmoothScrollProvider enabled={false}>
        <Anchored />
      </SmoothScrollProvider>,
    );
    await act(async () => {});

    fireEvent.click(screen.getByText("To the FAQ"));

    expect(scrollSpy).toHaveBeenCalledWith(expect.objectContaining({behavior: "auto"}));
    vi.unstubAllGlobals();
  });

  it("leaves an ordinary link to the router", async () => {
    renderAnchored();
    await waitFor(() => expect(latest()).toBeTruthy());

    fireEvent.click(screen.getByText("A real link"));

    expect(latest().scrolledTo).toHaveLength(0);
    // The handler bailed before its focus-management step, which is the other
    // observable half of "it did not treat this as an in-page anchor".
    expect(document.getElementById("faq").hasAttribute("tabindex")).toBe(false);
  });

  it("does nothing for an anchor whose target is not on the page", async () => {
    renderAnchored();
    await waitFor(() => expect(latest()).toBeTruthy());

    fireEvent.click(screen.getByText("To nowhere"));

    expect(latest().scrolledTo).toHaveLength(0);
  });

  it("ignores a bare '#'", async () => {
    renderAnchored();
    await waitFor(() => expect(latest()).toBeTruthy());

    fireEvent.click(screen.getByText("Empty hash"));

    expect(latest().scrolledTo).toHaveLength(0);
  });

  it.each([["metaKey"], ["ctrlKey"], ["shiftKey"]])(
    "leaves a %s click alone — that is a request for a new tab",
    async (modifier) => {
      renderAnchored();
      await waitFor(() => expect(latest()).toBeTruthy());

      fireEvent.click(screen.getByText("To the FAQ"), {[modifier]: true});

      expect(latest().scrolledTo).toHaveLength(0);
    },
  );

  it("does not fight a handler that already called preventDefault", async () => {
    renderAnchored();
    await waitFor(() => expect(latest()).toBeTruthy());

    const link = screen.getByText("To the FAQ");
    link.addEventListener("click", (event) => event.preventDefault());

    fireEvent.click(link);

    expect(latest().scrolledTo).toHaveLength(0);
  });

  it("removes its listener on unmount", async () => {
    const {unmount} = renderAnchored();
    await waitFor(() => expect(latest()).toBeTruthy());
    const instance = latest();

    unmount();
    // The container is gone; nothing should still be able to drive the instance.
    expect(instance.scrolledTo).toHaveLength(0);
  });
});

// ── useLockSmoothScroll ─────────────────────────────────────────────────────

describe("useLockSmoothScroll", () => {
  const renderLock = (locked) =>
    renderHook(({value}) => useLockSmoothScroll(value), {wrapper, initialProps: {value: locked}});

  it("pauses Lenis while an overlay owns the screen", async () => {
    renderLock(false);
    await waitFor(() => expect(latest()).toBeTruthy());

    const {rerender} = renderLock(true);
    await waitFor(() => expect(latest().stopped).toBe(true));
    rerender({value: true});
  });

  it("resumes when the overlay closes, or the page stays frozen", async () => {
    const {rerender} = renderLock(true);
    await waitFor(() => expect(latest().stopped).toBe(true));

    rerender({value: false});
    expect(latest().stopped).toBe(false);
  });

  it("resumes on unmount, so a dialog removed without closing does not freeze the page", async () => {
    const {unmount} = renderLock(true);
    await waitFor(() => expect(latest().stopped).toBe(true));
    const instance = latest();

    unmount();
    expect(instance.stopped).toBe(false);
  });

  it("does nothing while unlocked", async () => {
    renderLock(false);
    await waitFor(() => expect(latest()).toBeTruthy());

    expect(latest().stopped).toBe(false);
  });

  it("is safe with no Lenis at all", async () => {
    expect(() =>
      renderHook(() => useLockSmoothScroll(true), {
        wrapper: ({children}) => <SmoothScrollProvider enabled={false}>{children}</SmoothScrollProvider>,
      }),
    ).not.toThrow();
  });
});

// ── useScrollProgress ───────────────────────────────────────────────────────

describe("useScrollProgress", () => {
  const setGeometry = ({scrollHeight, innerHeight, scrollY}) => {
    Object.defineProperty(document.documentElement, "scrollHeight", {value: scrollHeight, configurable: true});
    Object.defineProperty(window, "innerHeight", {value: innerHeight, configurable: true});
    Object.defineProperty(window, "scrollY", {value: scrollY, writable: true, configurable: true});
  };

  it("reports 0 at the top of the page", async () => {
    setGeometry({scrollHeight: 2000, innerHeight: 1000, scrollY: 0});

    const {result} = renderHook(() => useScrollProgress(), {wrapper});

    await waitFor(() => expect(latest()).toBeTruthy());
    expect(result.current).toBe(0);
  });

  it("reports the fraction scrolled, sampled off Lenis when it is running", async () => {
    setGeometry({scrollHeight: 2000, innerHeight: 1000, scrollY: 0});

    const {result} = renderHook(() => useScrollProgress(), {wrapper});
    await waitFor(() => expect(latest().countFor("scroll")).toBe(1));

    window.scrollY = 500;
    act(() => latest().emit("scroll", {scroll: 500}));

    expect(result.current).toBe(0.5);
  });

  it("clamps at 1 rather than overshooting past the end", async () => {
    setGeometry({scrollHeight: 2000, innerHeight: 1000, scrollY: 0});

    const {result} = renderHook(() => useScrollProgress(), {wrapper});
    await waitFor(() => expect(latest().countFor("scroll")).toBe(1));

    window.scrollY = 5000;
    act(() => latest().emit("scroll", {scroll: 5000}));

    expect(result.current).toBe(1);
  });

  it("reports 0 rather than NaN on a page shorter than the viewport", async () => {
    setGeometry({scrollHeight: 500, innerHeight: 1000, scrollY: 0});

    const {result} = renderHook(() => useScrollProgress(), {wrapper});
    await waitFor(() => expect(latest()).toBeTruthy());

    expect(result.current).toBe(0);
  });

  it("falls back to native scroll and resize events with no Lenis", async () => {
    setGeometry({scrollHeight: 2000, innerHeight: 1000, scrollY: 0});

    const {result} = renderHook(() => useScrollProgress(), {
      wrapper: ({children}) => <SmoothScrollProvider enabled={false}>{children}</SmoothScrollProvider>,
    });
    await act(async () => {});

    window.scrollY = 250;
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });

    expect(result.current).toBe(0.25);
  });

  it("unsubscribes from Lenis on unmount", async () => {
    const {unmount} = renderHook(() => useScrollProgress(), {wrapper});
    await waitFor(() => expect(latest().countFor("scroll")).toBe(1));
    const instance = latest();

    unmount();
    expect(instance.countFor("scroll")).toBe(0);
  });
});

// ── useSmoothScrollY ────────────────────────────────────────────────────────

describe("useSmoothScrollY", () => {
  it("tracks the position Lenis is actually painting, not the target", async () => {
    const {result} = renderHook(() => useSmoothScrollY(), {wrapper});
    await waitFor(() => expect(latest().countFor("scroll")).toBe(1));

    // The distinction that matters for parallax: window.scrollY has already
    // jumped to the destination while Lenis is still interpolating toward it.
    window.scrollY = 1000;
    act(() => latest().emit("scroll", {scroll: 137}));

    expect(result.current).toBe(137);
  });

  it("starts from the native position, because Lenis does not exist on the first render", async () => {
    // The provider sets its instance in an effect, so the hook's first pass sees
    // null and takes the native branch. A parallax that started at 0 on a page
    // restored mid-scroll would jump on the first frame.
    Object.defineProperty(window, "scrollY", {value: 320, writable: true, configurable: true});

    const {result} = renderHook(() => useSmoothScrollY(), {wrapper});

    await waitFor(() => expect(latest()).toBeTruthy());
    expect(result.current).toBe(320);
  });

  it("falls back to window.scrollY with no Lenis", async () => {
    Object.defineProperty(window, "scrollY", {value: 0, writable: true, configurable: true});

    const {result} = renderHook(() => useSmoothScrollY(), {
      wrapper: ({children}) => <SmoothScrollProvider enabled={false}>{children}</SmoothScrollProvider>,
    });
    await act(async () => {});

    window.scrollY = 42;
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });

    expect(result.current).toBe(42);
  });

  it("unsubscribes on unmount", async () => {
    const {unmount} = renderHook(() => useSmoothScrollY(), {wrapper});
    await waitFor(() => expect(latest().countFor("scroll")).toBe(1));
    const instance = latest();

    unmount();
    expect(instance.countFor("scroll")).toBe(0);
  });
});
