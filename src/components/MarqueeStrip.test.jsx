import {cleanup, render} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";

import MarqueeStrip from "./MarqueeStrip";

afterEach(cleanup);

const many = ["A", "B", "C", "D", "E", "F", "G", "H"];

describe("MarqueeStrip", () => {
  it("renders nothing for an empty or all-blank list", () => {
    expect(render(<MarqueeStrip items={[]} />).container.firstChild).toBeNull();
    expect(render(<MarqueeStrip items={["", "  "]} />).container.firstChild).toBeNull();
  });

  it("drops blank chips", () => {
    const {container} = render(<MarqueeStrip items={[...many, " "]} />);
    const firstCopy = container.querySelectorAll(".ms-group")[0];
    expect(firstCopy.querySelectorAll(".ms-chip")).toHaveLength(many.length);
  });

  it("hides the duplicate copy from screen readers", () => {
    const {container} = render(<MarqueeStrip items={many} label="Skills" />);
    const [first, second] = container.querySelectorAll(".ms-group");
    expect(first.getAttribute("aria-hidden")).toBeNull();
    expect(second.getAttribute("aria-hidden")).toBe("true");
    expect(container.firstChild.getAttribute("aria-label")).toBe("Skills");
  });

  it("tiles a short list so the loop never shows empty track", () => {
    const {container} = render(<MarqueeStrip items={["A", "B", "C"]} />);
    expect(container.querySelectorAll(".ms-group")[0].querySelectorAll(".ms-chip")).toHaveLength(6);
  });

  it("applies direction, speed and extra classes", () => {
    const {container} = render(<MarqueeStrip items={many} direction="rtl" speed={20} className="x" />);
    const strip = container.firstChild;
    expect(strip.className).toBe("ms-strip ms-strip--rtl x");
    expect(strip.style.getPropertyValue("--ms-speed")).toBe("20s");
  });
});
