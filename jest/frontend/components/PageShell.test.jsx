// PageShell — the hero band and section-heading primitives for standalone routes.
//
// The animations these used to get from framer-motion are now CSS (see
// motionPrimitives), so the assertions run against the real DOM structure: the
// hero exposes its title as a heading and its eyebrow/lead only when they exist,
// and the section heading labels the section it belongs to.

import {describe, it, expect} from "@jest/globals";
import {render, screen} from "@testing-library/react";

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