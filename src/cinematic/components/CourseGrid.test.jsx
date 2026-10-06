import {cleanup, render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {afterEach, describe, expect, it} from "vitest";

import {programCatalog} from "../../data/programCatalog";
import CourseGrid from "./CourseGrid";

afterEach(cleanup);

const renderGrid = () =>
  render(
    <MemoryRouter>
      <CourseGrid />
    </MemoryRouter>,
  );

describe("CourseGrid", () => {
  it("renders one card per catalogue program, numbered in order", () => {
    renderGrid();
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(programCatalog.length);
    expect(links[0].textContent).toContain("01");
  });

  it("routes each card to its landing page or its detail page", () => {
    renderGrid();
    for (const program of programCatalog) {
      const link = screen.getByRole("link", {name: `Open ${program.title}`});
      expect(link.getAttribute("href")).toBe(program.landingPath || `/programs/${program.id}`);
    }
  });

  it("prints exactly one rupee sign whether or not the data already has one", () => {
    const {container} = renderGrid();
    const fees = Array.from(container.querySelectorAll(".ga-journey-motif"), (el) => el.textContent);
    expect(fees.length).toBe(programCatalog.length);
    for (const fee of fees) expect(fee).not.toMatch(/₹\s*₹/);
  });
});
