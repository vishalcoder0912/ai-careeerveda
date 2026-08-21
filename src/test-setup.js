
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


globalThis.HTMLCanvasElement.prototype.getContext = () => null;
