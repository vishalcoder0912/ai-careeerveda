import {cleanup, render} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";

import {StaggerGroup, StaggerItem} from "./motionPrimitives";

afterEach(cleanup);

describe("StaggerGroup context", () => {
  it("does not redraw items when the group re-renders with the same stagger", () => {
    const paints = [];
    // StaggerItem renders its `as` component on every draw, so counting those
    // calls measures how often the context consumer actually re-rendered.
    const Tracked = ({children, ...props}) => {
      paints.push(children);
      return <div {...props}>{children}</div>;
    };

    // Keep the child element identity fixed: only the group's own render and
    // the context value can change between passes.
    const item = <StaggerItem as={Tracked}>Card</StaggerItem>;
    const group = (stagger) => <StaggerGroup stagger={stagger}>{item}</StaggerGroup>;

    const {rerender} = render(group(0.1));
    expect(paints).toEqual(["Card"]);

    rerender(group(0.1));
    expect(paints).toEqual(["Card"]);

    // A real change to the dependency must still reach the item.
    rerender(group(0.25));
    expect(paints).toEqual(["Card", "Card"]);
  });
});
