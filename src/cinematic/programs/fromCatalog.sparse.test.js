import { describe, expect, it } from "vitest";
import { CINEMATIC_COPY } from "./catalogPrograms";
import { buildCinematicContent } from "./fromCatalog";

describe("buildCinematicContent with a sparse admin record", () => {
  it("falls back to the catalogue instead of blanking the page", () => {
    const content = buildCinematicContent("data-analytics", CINEMATIC_COPY["data-analytics"], {
      id: "data-analytics",
      title: "PG Program in Data Analytics",
      modules: [],
      skills: [],
      internship: [],
      softSkills: [],
      projects: "",
      duration: "",
      nextBatch: "",
    });
    expect(content.timeline.items).toHaveLength(6);
    expect(content.modules.stages).toHaveLength(5);
    expect(content.skills.items).toHaveLength(5);
    expect(content.projects.items).toHaveLength(8);
    expect(content.stats.items.find((s) => s.label === "Structured Modules").value).toBeGreaterThan(0);
  });
});
