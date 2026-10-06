import {render} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import SkillMark from "./SkillMark";

describe("SkillMark", () => {
  it("uses the brand logo when the skill has one", () => {
    const {container} = render(<SkillMark name="Python" />);
    expect(container.querySelector("img.skill-mark")).not.toBeNull();
  });

  it("falls back to a line icon so no chip is bare text", () => {
    for (const name of ["ETL", "Pipelines", "Gen AI", "Something Unmapped"]) {
      const {container, unmount} = render(<SkillMark name={name} />);
      expect(container.querySelector("svg.skill-mark--icon")).not.toBeNull();
      unmount();
    }
  });
});
