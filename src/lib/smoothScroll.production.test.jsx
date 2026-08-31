// Production health checks for the scroll layer.
//
// The smooth-scroll hooks are the ones whose failures only surface on a real
// page after deploy: a Lenis instance that is never destroyed, a listener that
// outlives its component, a second Lenis arriving to fight over the wheel, a
// native-scroll fallback that silently disappears. These tests assert those
// exact failure modes through the public hooks — the same API App.jsx and
// ScrollStack.jsx consume — so the suite genuinely exercises what ships.
//
// Lenis is replaced with a recorder (LenisDouble) that exposes every subscribe,
// unsubscribe and destroy, making each leak observable rather than inferred.

import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";
import {act, cleanup, fireEvent, render, renderHook, screen, waitFor} from "@testing-library/react";
import {useRef} from "react";

const instances = [];

// A stand-in for Lenis's own surface, reduced to what the provider and hooks
// touch: an O(1) Map<event, Set<handler>> subscriber, rAF pump and lifecycle
// methods. Recording `destroyed`/`stopped` is what lets the tests see a leak.
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

const {
  SmoothScrollProvider,
  useAnchorScroll,
  useLenis,
  useLockSmoothScroll,
  useScrollProgress,
  useSmoothScrollY,
} = await import("./smoothScroll");

const latest = () => instances[instances.length - 1];

const wrapper = ({children}) => <SmoothScrollProvider>{children}</SmoothScrollProvider>;
const noLenisWrapper = ({children}) => <SmoothScrollProvider enabled={false}>{children}</SmoothScrollProvider>;

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

const swallowNavigation = (event) => {
  const link = event.target.closest?.("a[href]");
  if (link && !link.getAttribute("href").startsWith("#")) event.preventDefault();
};

const setGeometry = ({scrollHeight, innerHeight, scrollY}) => {
  Object.defineProperty(document.documentElement, "scrollHeight", {value: scrollHeight, configurable: true});
  Object.defineProperty(window, "innerHeight", {value: innerHeight, configurable: true});
  Object.defineProperty(window, "scrollY", {value: scrollY, writable: true, configurable: true});
};

const settle = () =>
  act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });
  });

beforeEach(() => {
  document.addEventListener("click", swallowNavigation);
  instances.length = 0;
  reducedMotion(false);
});

afterEach(() => {
  document.removeEventListener("click", swallowNavigation);
  cleanup();
  vi.restoreAllMocks();
});

// ── Single source of truth ───────────────────────────────────────────────────

describe("SmoothScrollProvider — one instance per tree", () => {
  it("creates exactly one Lenis for the whole tree, shared by every consumer", async () => {
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
    expect(instances).toHaveLength(1);
    expect(seen.at(-1)).toBe(seen.at(-2));
  });

  it("destroys the instance on unmount — no orphaned scroll driver", async () => {
    const {unmount} = renderHook(() => useLenis(), {wrapper});
    await waitFor(() => expect(instances).toHaveLength(1));
    const instance = latest();

    unmount();
    expect(instance.destroyed).toBe(true);
  });

  it("stops the rAF loop on unmount — nothing keeps pumping a dead instance", async () => {
    const {unmount} = renderHook(() => useLenis(), {wrapper});
    await waitFor(() => expect(latest().rafCalls.length).toBeGreaterThan(0));
    const instance = latest();
    const atUnmount = instance.rafCalls.length;

    unmount();
    await settle();
    expect(instance.rafCalls.length).toBe(atUnmount);
  });

  it("tears down the old instance before building a new one on an enabled flip", async () => {
    const {rerender} = render(<SmoothScrollProvider enabled><span /></SmoothScrollProvider>);
    await waitFor(() => expect(instances).toHaveLength(1));
    const first = latest();

    rerender(<SmoothScrollProvider enabled={false}><span /></SmoothScrollProvider>);
    expect(first.destroyed).toBe(true);

    rerender(<SmoothScrollProvider enabled><span /></SmoothScrollProvider>);
    await waitFor(() => expect(instances).toHaveLength(2));
    expect(latest()).not.toBe(first);
  });

  it("stays native under reduced motion — no slowed-down effect", async () => {
    reducedMotion(true);

    const {result} = renderHook(() => useLenis(), {wrapper});
    await settle();

    expect(instances).toHaveLength(0);
    expect(result.current).toBeNull();
  });

  it("exposes null, not undefined, when disabled — consumers branch on null", async () => {
    const {result} = renderHook(() => useLenis(), {wrapper: noLenisWrapper});
    await settle();

    expect(result.current).toBeNull();
  });
});

// ── useAnchorScroll ─────────────────────────────────────────────────────────

describe("useAnchorScroll — in-page navigation", () => {
  const Anchored = ({headerHeight}) => {
    const ref = useRef(null);
    useAnchorScroll(ref, headerHeight === undefined ? undefined : {headerHeight});

    return (
      <div ref={ref}>
        <a href="#faq">To the FAQ</a>
        <a href="#missing">To nowhere</a>
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

  it("scrolls through Lenis with the header offset", async () => {
    renderAnchored();
    await waitFor(() => expect(latest()).toBeTruthy());

    fireEvent.click(screen.getByText("To the FAQ"));

    expect(latest().scrolledTo).toHaveLength(1);
    expect(latest().scrolledTo[0].target).toBe(document.getElementById("faq"));
    expect(latest().scrolledTo[0].options).toEqual({offset: -76});
  });

  it("moves keyboard focus to the target after scrolling", async () => {
    renderAnchored();
    await waitFor(() => expect(latest()).toBeTruthy());

    fireEvent.click(screen.getByText("To the FAQ"));

    const target = document.getElementById("faq");
    expect(target.getAttribute("tabindex")).toBe("-1");
    expect(document.activeElement).toBe(target);
  });

  it("applies the offset with no Lenis — the offset is a layout fix, not a flourish", async () => {
    const scrollSpy = vi.fn();
    vi.stubGlobal("scrollTo", scrollSpy);

    render(
      <SmoothScrollProvider enabled={false}>
        <Anchored />
      </SmoothScrollProvider>,
    );
    await settle();

    fireEvent.click(screen.getByText("To the FAQ"));
    expect(scrollSpy).toHaveBeenCalledWith(expect.objectContaining({behavior: "auto"}));
    vi.unstubAllGlobals();
  });

  it("leaves real links and missing targets to the router / does nothing", async () => {
    renderAnchored();
    await waitFor(() => expect(latest()).toBeTruthy());

    fireEvent.click(screen.getByText("A real link"));
    fireEvent.click(screen.getByText("To nowhere"));

    expect(latest().scrolledTo).toHaveLength(0);
    expect(document.getElementById("faq").hasAttribute("tabindex")).toBe(false);
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
});

// ── useLockSmoothScroll ─────────────────────────────────────────────────────

describe("useLockSmoothScroll — overlays freeze the page, not the app", () => {
  it("pauses Lenis while locked and resumes when released", async () => {
    const {rerender} = renderHook(({value}) => useLockSmoothScroll(value), {
      wrapper,
      initialProps: {value: true},
    });
    await waitFor(() => expect(latest().stopped).toBe(true));

    rerender({value: false});
    expect(latest().stopped).toBe(false);
  });

  it("resumes on unmount, so a dialog removed without closing never freezes the page", async () => {
    const {unmount} = renderHook(() => useLockSmoothScroll(true), {wrapper});
    await waitFor(() => expect(latest().stopped).toBe(true));
    const instance = latest();

    unmount();
    expect(instance.stopped).toBe(false);
  });
});

// ── useScrollProgress ───────────────────────────────────────────────────────

describe("useScrollProgress — document progress", () => {
  it("reports the fraction scrolled off Lenis, clamped to [0, 1]", async () => {
    setGeometry({scrollHeight: 2000, innerHeight: 1000, scrollY: 0});

    const {result} = renderHook(() => useScrollProgress(), {wrapper});
    await waitFor(() => expect(latest().countFor("scroll")).toBe(1));

    window.scrollY = 500;
    act(() => latest().emit("scroll", {scroll: 500}));
    expect(result.current).toBe(0.5);

    window.scrollY = 5000;
    act(() => latest().emit("scroll", {scroll: 5000}));
    expect(result.current).toBe(1);
  });

  it("reports 0 on a page shorter than the viewport, never NaN", async () => {
    setGeometry({scrollHeight: 500, innerHeight: 1000, scrollY: 0});

    const {result} = renderHook(() => useScrollProgress(), {wrapper});
    await waitFor(() => expect(latest()).toBeTruthy());

    expect(result.current).toBe(0);
  });

  it("falls back to native scroll and resize events with no Lenis", async () => {
    setGeometry({scrollHeight: 2000, innerHeight: 1000, scrollY: 0});

    const {result} = renderHook(() => useScrollProgress(), {wrapper: noLenisWrapper});
    await settle();

    window.scrollY = 250;
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    expect(result.current).toBe(0.25);
  });

  it("unsubscribes from Lenis on unmount — no leaked scroll listener", async () => {
    const {unmount} = renderHook(() => useScrollProgress(), {wrapper});
    await waitFor(() => expect(latest().countFor("scroll")).toBe(1));
    const instance = latest();

    unmount();
    expect(instance.countFor("scroll")).toBe(0);
  });
});

// ── useSmoothScrollY ────────────────────────────────────────────────────────

describe("useSmoothScrollY — the position Lenis is painting", () => {
  it("tracks Lenis's interpolated value, not the scrolled target", async () => {
    const {result} = renderHook(() => useSmoothScrollY(), {wrapper});
    await waitFor(() => expect(latest().countFor("scroll")).toBe(1));

    window.scrollY = 1000;
    act(() => latest().emit("scroll", {scroll: 137}));
    expect(result.current).toBe(137);
  });

  it("starts from the native position, because Lenis does not exist on the first render", async () => {
    Object.defineProperty(window, "scrollY", {value: 320, writable: true, configurable: true});

    const {result} = renderHook(() => useSmoothScrollY(), {wrapper});
    await waitFor(() => expect(latest()).toBeTruthy());

    expect(result.current).toBe(320);
  });

  it("falls back to window.scrollY with no Lenis", async () => {
    Object.defineProperty(window, "scrollY", {value: 0, writable: true, configurable: true});

    const {result} = renderHook(() => useSmoothScrollY(), {wrapper: noLenisWrapper});
    await settle();

    window.scrollY = 42;
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    expect(result.current).toBe(42);
  });

  it("unsubscribes on unmount — no leaked scroll listener", async () => {
    const {unmount} = renderHook(() => useSmoothScrollY(), {wrapper});
    await waitFor(() => expect(latest().countFor("scroll")).toBe(1));
    const instance = latest();

    unmount();
    expect(instance.countFor("scroll")).toBe(0);
  });
});
