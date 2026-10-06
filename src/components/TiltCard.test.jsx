import {cleanup, fireEvent, render} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";

import TiltCard from "./TiltCard";

afterEach(cleanup);

const original = window.matchMedia;
const pointer = ({fine, reduced = false}) => {
  window.matchMedia = (query) => ({
    matches: query.includes("pointer: fine") ? fine : query.includes("reduced-motion") ? reduced : false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  });
};
afterEach(() => {
  window.matchMedia = original;
});

const mount = (props) => {
  const {container} = render(<TiltCard {...props}>content</TiltCard>);
  const card = container.firstChild;
  card.getBoundingClientRect = () => ({left: 0, top: 0, width: 100, height: 100});
  return card;
};

describe("TiltCard", () => {
  it("tilts toward the cursor and settles back on leave with a fine pointer", () => {
    pointer({fine: true});
    const card = mount({max: 10});

    fireEvent.mouseEnter(card);
    expect(card.className).toContain("tilt-card--active");

    fireEvent.mouseMove(card, {clientX: 100, clientY: 0});
    expect(card.style.getPropertyValue("--tilt-rx")).toBe("5.00deg");
    expect(card.style.getPropertyValue("--tilt-ry")).toBe("5.00deg");

    fireEvent.mouseLeave(card);
    expect(card.style.getPropertyValue("--tilt-rx")).toBe("0deg");
    expect(card.className).not.toContain("tilt-card--active");
  });

  it.each([
    ["a touch screen", {fine: false}],
    ["reduced motion", {fine: true, reduced: true}],
  ])("does not tilt on %s", (_, env) => {
    pointer(env);
    const card = mount();
    fireEvent.mouseEnter(card);
    fireEvent.mouseMove(card, {clientX: 100, clientY: 0});
    expect(card.style.getPropertyValue("--tilt-rx")).toBe("");
    expect(card.className).toBe("tilt-card");
  });

  it("renders the requested element and forwards extra props", () => {
    pointer({fine: false});
    const {container} = render(
      <TiltCard as="article" className="extra" data-id="7" scale={1.1}>
        x
      </TiltCard>,
    );
    const card = container.firstChild;
    expect(card.tagName).toBe("ARTICLE");
    expect(card.className).toBe("tilt-card extra");
    expect(card.dataset.id).toBe("7");
    expect(card.style.getPropertyValue("--tilt-scale")).toBe("1.1");
  });
});
