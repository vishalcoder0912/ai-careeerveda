import {describe, it, expect, afterEach} from "vitest";
import {render, screen, cleanup} from "@testing-library/react";
import AiSkillsCurve, {skillsCurveData} from "./AiSkillsCurve";

afterEach(cleanup);

describe("AiSkillsCurve", () => {
  it("reads every role's mid-level band from salaryMarket.js", () => {
    const rows = skillsCurveData();
    expect(rows).toHaveLength(5);
    for (const row of rows) expect(row.upskilled).toBeGreaterThan(row.average);
    // Product management mid-level band is 15–28 LPA.
    expect(rows[0]).toMatchObject({average: 21.5, upskilled: 28});
  });

  it("gives screen readers the numbers as a table", () => {
    render(<AiSkillsCurve />);
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getByRole("rowheader", {name: "Advanced Generative AI"})).toBeTruthy();
  });
});
