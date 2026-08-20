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

import {describe, it, expect, beforeEach} from "@jest/globals";
import {render} from "@testing-library/react";

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

    expect(container.firstChild).toHaveStyle({minHeight: "420px"});
  });

  it("leaves no inline min-height when the caller does not supply one", () => {
    const {container} = render(<DeferUntilVisible />);

    expect(container.firstChild.style.minHeight).toBe("");
  });

  it("passes the className through to the wrapping placeholder", () => {
    const {container} = render(<DeferUntilVisible className="deferred-section" />);

    expect(container.firstChild).toHaveClass("deferred-section");
  });
});