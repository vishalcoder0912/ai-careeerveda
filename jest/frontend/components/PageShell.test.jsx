// PageShell — the hero band and section-heading primitives for standalone routes.
//
// framer-motion is mocked as a pass-through so the assertions run against the
// real DOM structure (a real <h1>, a real <h2>) rather than against the library's
// animation machinery. The contract under test is the accessible one: the hero
// exposes its title as a heading and its eyebrow/lead only when they exist, and
// the section heading labels the section it belongs to.

import {describe, it, expect, jest} from "@jest/globals";
import {render, screen} from "@testing-library/react";

jest.mock("framer-motion", () => {
  const React = jest.requireActual("react");
  const MOTION_PROPS = new Set([
    "variants", "initial", "animate", "whileInView", "viewport",
    "whileHover", "whileTap", "transition", "exit", "layout",
  ]);
  const asDom = (tag) =>
    React.forwardRef((props, ref) => {
      const rest = {};
      for (const [key, value] of Object.entries(props)) {
        if (!MOTION_PROPS.has(key)) rest[key] = value;
      }
      return React.createElement(tag, {...rest, ref}, props.children);
    });
  return {
    motion: new Proxy({}, {get: (_target, tag) => asDom(tag)}),
    useReducedMotion: () => false,
    useInView: () => true,
  };
});

import {PageHero, SectionHeading} from "../../../src/components/PageShell";

describe("PageHero", () => {
  it("renders the page title as the single heading of the band", () => {
    render(<PageHero title="Programs" />);

    expect(screen.getByRole("heading", {name: "Programs", level: 1})).toBeInTheDocument();
  });

  it("shows the eyebrow and lead only when they are supplied", () => {
    const {rerender} = render(<PageHero eyebrow="Explore" title="Programs" lead="Find your path" />);
    expect(screen.getByText("Explore")).toBeInTheDocument();
    expect(screen.getByText("Find your path")).toBeInTheDocument();

    rerender(<PageHero title="Programs" />);
    expect(screen.queryByText("Explore")).not.toBeInTheDocument();
    expect(screen.queryByText("Find your path")).not.toBeInTheDocument();
  });

  it("renders extra actions inside the band", () => {
    render(
      <PageHero title="Programs">
        <a href="/enroll">Enroll now</a>
      </PageHero>,
    );

    expect(screen.getByRole("link", {name: "Enroll now"})).toBeInTheDocument();
  });
});

describe("SectionHeading", () => {
  it("renders the label and the title, with the title as the heading", () => {
    render(<SectionHeading label="Why us" title="Mentor-led learning" />);

    expect(screen.getByText("Why us")).toBeInTheDocument();
    expect(screen.getByRole("heading", {name: "Mentor-led learning"})).toBeInTheDocument();
  });

  it("adds the description paragraph when provided", () => {
    render(
      <SectionHeading label="Why us" title="Mentor-led learning">
        A paragraph.
      </SectionHeading>,
    );

    expect(screen.getByText("A paragraph.")).toBeInTheDocument();
  });

  it("applies the modifier className to the heading block", () => {
    const {container} = render(<SectionHeading title="Mentor-led learning" className="section-heading--compact" />);

    expect(container.querySelector(".page-heading")).toHaveClass("section-heading--compact");
  });
});