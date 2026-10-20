// Stage cards open a dialog with that stage's weeks; previous/next walk the
// roadmap and "Back to all stages" closes it.

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";

vi.mock("../../lib/smoothScroll", () => ({useLockSmoothScroll: () => {}}));

const {curriculumJourney} = await import("../data");
const {default: ModuleGrid} = await import("./ModuleGrid");

beforeEach(() => {
  // jsdom has no top layer; flip `open` the way the browser does.
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
  };
  render(
    <MemoryRouter>
      <ModuleGrid />
    </MemoryRouter>,
  );
});

afterEach(cleanup);

const dialog = () => document.querySelector("dialog.ga-stage-dialog");
const openStage = (i) =>
  fireEvent.click(screen.getByRole("button", {name: new RegExp(curriculumJourney[i].title)}));

describe("ModuleGrid stage dialog", () => {
  it("opens a stage with every week, topic and deliverable", () => {
    expect(dialog().hasAttribute("open")).toBe(false);
    openStage(0);

    const d = within(dialog());
    const [first] = curriculumJourney;
    expect(dialog().hasAttribute("open")).toBe(true);
    expect(d.getByRole("heading", {level: 3}).textContent).toBe(first.title);
    for (const week of first.weeks) {
      expect(d.getByText(week.title)).toBeTruthy();
      expect(d.getByText(week.topics[0])).toBeTruthy();
    }
  });

  it("walks to the next stage and back to the grid", () => {
    openStage(0);
    const d = within(dialog());
    fireEvent.click(d.getByRole("button", {name: new RegExp(curriculumJourney[1].title)}));
    expect(d.getByRole("heading", {level: 3}).textContent).toBe(curriculumJourney[1].title);

    fireEvent.click(d.getByRole("button", {name: /back to all stages/i}));
    expect(dialog().hasAttribute("open")).toBe(false);
  });
});
