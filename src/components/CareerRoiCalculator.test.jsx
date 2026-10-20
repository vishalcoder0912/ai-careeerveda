import {describe, it, expect, afterEach} from "vitest";
import {render, screen, fireEvent, cleanup} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import CareerRoiCalculator, {ROI_TRACKS, projectCtc} from "./CareerRoiCalculator";

afterEach(cleanup);

const track = (id) => ROI_TRACKS.find((entry) => entry.id === id);

describe("projectCtc", () => {
  it("applies the track's hike range", () => {
    const {low, high} = projectCtc(10, track("data-analytics")); // 60–90%
    expect(low).toBeCloseTo(16);
    expect(high).toBeCloseTo(19);
  });

  it("caps at the top of the market band, never below current pay", () => {
    // Business analytics tops out at 30 LPA in salaryMarket.js.
    const capped = projectCtc(25, track("business-analytics"));
    expect(capped.high).toBe(30);
    expect(capped.capped).toBe(true);

    const above = projectCtc(50, track("business-analytics"));
    expect(above.low).toBe(50);
    expect(above.high).toBe(50);
  });

  it("has salary-market data for every track", () => {
    for (const entry of ROI_TRACKS) expect(() => projectCtc(6, entry)).not.toThrow();
  });
});

describe("CareerRoiCalculator", () => {
  it("shows the projection after calculating and follows the chosen track", () => {
    render(
      <MemoryRouter>
        <CareerRoiCalculator />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/lakhs per annum/i), {target: {value: "10"}});
    fireEvent.click(screen.getByLabelText(/Data Analytics with Gen AI/));
    fireEvent.click(screen.getByRole("button", {name: /calculate my projection/i}));

    expect(screen.getByText("₹16 LPA – ₹19 LPA")).toBeTruthy();
    expect(screen.getByRole("link", {name: /explore the program/i}).getAttribute("href")).toBe(
      "/programs/data-analytics",
    );
  });
});
