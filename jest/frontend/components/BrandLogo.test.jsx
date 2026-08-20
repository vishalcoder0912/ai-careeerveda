// BrandLogo — the inline rating-row marks.
//
// The contract is permissive on purpose: an unknown source renders *nothing*
// rather than a broken glyph, and the wrapper is decorative (aria-hidden) while
// each SVG carries its own image role and label for the rating row's reader.
// Because the wrapper is aria-hidden, the label is queried from the DOM rather
// than through the accessibility tree.

import {describe, it, expect} from "@jest/globals";
import {render} from "@testing-library/react";

import BrandLogo from "../../../src/components/BrandLogo";

const mark = (container, label) => container.querySelector(`[aria-label="${label}"]`);

describe("BrandLogo", () => {
  it("draws the Google mark with its brand label", () => {
    const {container} = render(<BrandLogo source="Google" />);

    expect(mark(container, "Google")).not.toBeNull();
  });

  it("draws the Trustpilot, Glassdoor and AmbitionBox marks too", () => {
    const {container} = render(
      <>
        <BrandLogo source="Trustpilot" />
        <BrandLogo source="Glassdoor" />
        <BrandLogo source="AmbitionBox" />
      </>,
    );

    expect(mark(container, "Trustpilot")).not.toBeNull();
    expect(mark(container, "Glassdoor")).not.toBeNull();
    expect(mark(container, "AmbitionBox")).not.toBeNull();
  });

  it("renders nothing for an unknown source rather than a broken glyph", () => {
    const {container} = render(<BrandLogo source="NotARealSource" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("hides the decorative wrapper while keeping the inner label present", () => {
    const {container} = render(<BrandLogo source="Google" />);

    const wrapper = container.querySelector("span");
    expect(wrapper).toHaveClass("brand-logo");
    expect(wrapper).toHaveAttribute("aria-hidden", "true");
    expect(mark(container, "Google")).not.toBeNull();
  });

  it("honours a custom className", () => {
    const {container} = render(<BrandLogo source="Google" className="rating-badge" />);

    expect(container.querySelector("span")).toHaveClass("rating-badge");
  });

  it("labels the mark with its own image role and brand name", () => {
    const {container} = render(<BrandLogo source="Google" />);

    const svg = mark(container, "Google");
    expect(svg.getAttribute("role")).toBe("img");
    expect(svg.getAttribute("aria-label")).toBe("Google");
  });
});