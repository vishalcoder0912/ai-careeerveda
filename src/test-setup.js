// Browser APIs jsdom does not implement, which components on this site rely on.
//
// These are shims, not stubs of our own behaviour: each stands in for something
// a real browser provides. Keeping them here rather than mocking framer-motion
// or the hooks means a component test exercises the real component.

// framer-motion's `whileInView` observes the viewport, and every reveal
// animation on the site uses it. Without this, mounting almost any section
// throws before a single assertion runs.
class IntersectionObserverStub {
  constructor(callback) {
    this.callback = callback;
  }

  // Elements are reported as visible immediately. The alternative — never firing
  // — would leave every revealed section at opacity 0 and invisible to queries,
  // which would make the tests assert on an animation state no visitor sees.
  observe(element) {
    this.callback([{target: element, isIntersecting: true, intersectionRatio: 1}], this);
  }

  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

globalThis.IntersectionObserver ??= IntersectionObserverStub;

// Used by useViewportTier, useFinePointer and the alumni dome's breakpoint
// tracking. jsdom has no layout, so it reports every query as not matching —
// which is the desktop default these hooks already fall back to.
globalThis.matchMedia ??= (query) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  dispatchEvent: () => false,
});

// GSAP and the scroll-driven effects measure elements on mount.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

globalThis.scrollTo ??= () => {};

// jsdom ships no canvas, and its getContext logs a "Not implemented" page error
// on every call rather than returning null. ShapeGrid — the hero and home page
// backdrop — already bows out when there is no 2D context; this keeps four of
// those errors out of every run that mounts the hero.
globalThis.HTMLCanvasElement.prototype.getContext = () => null;
