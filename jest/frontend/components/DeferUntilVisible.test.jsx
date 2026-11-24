// DeferUntilVisible — the fold-gated wrapper around heavy below-the-fold chunks.
//
// The point of the component is that the expensive children are *not* mounted
// until the reader scrolls near: React.lazy() alone splits the code but still
// resolves the import on mount, which is how three.js ended up on the home page.
// The suite pins that the children stay unmounted until the intersection check
// turns true, and that the placeholder holds the section's height so the page
// does not jump when the real component arrives.
//
// IntersectionObserver is replaced by hand here rather than trusting the global
// stub (which reports everything visible immediately) — "not near" is the state
// this component exists to enforce, so the test drives the observer explicitly.

import {afterEach, describe, it, expect, beforeEach} from "@jest/globals";
import {act, render} from "@testing-library/react";

import DeferUntilVisible from "../../../src/components/DeferUntilVisible";

let isIntersecting = false;

class ObserverMock {
  constructor(callback) {
    this.callback = callback;
  }

  observe(target) {
    if (isIntersecting) this.callback([{target, isIntersecting: true}], this);
  }

  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

const Heavy = () => <p>heavy content</p>;

beforeEach(() => {
  isIntersecting = false;
  globalThis.IntersectionObserver = ObserverMock;
});

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("DeferUntilVisible", () => {
  it("mounts nothing until the element is near the viewport", () => {
    const {container} = render(
      <DeferUntilVisible>
        <Heavy />
      </DeferUntilVisible>,
    );

    expect(container.querySelector("p")).toBeNull();
  });

  it("renders the children once the intersection check says the fold is near", () => {
    isIntersecting = true;
    const {container} = render(
      <DeferUntilVisible>
        <Heavy />
      </DeferUntilVisible>,
    );

    expect(container.textContent).toContain("heavy content");
  });

  it("reserves the section's height so the layout does not jump on arrival", () => {
    const {container} = render(<DeferUntilVisible minHeight={420} />);

    // The height lives on the placeholder inside the wrapper: it must disappear
    // with the placeholder once the real chunk arrives, not stay on the section.
    expect(container.firstChild.firstChild).toHaveStyle({minHeight: "420px"});
  });

  it("leaves no inline min-height when the caller does not supply one", () => {
    const {container} = render(<DeferUntilVisible />);

    expect(container.firstChild.style.minHeight).toBe("");
  });

  it("keeps the deep-link listener working when the hash has a malformed escape", () => {
    // decodeURIComponent("#100%off") throws URIError. The listener must still
    // run its "id not mounted yet" branch and reveal deferred sections.
    window.history.replaceState(null, "", "/#100%off");
    const {container} = render(
      <DeferUntilVisible>
        <Heavy />
      </DeferUntilVisible>,
    );

    act(() => {
      window.dispatchEvent(new Event("hashchange"));
    });

    expect(container.textContent).toContain("heavy content");
  });

  it("passes the className through to the wrapping placeholder", () => {
    const {container} = render(<DeferUntilVisible className="deferred-section" />);

    expect(container.firstChild).toHaveClass("deferred-section");
  });
});