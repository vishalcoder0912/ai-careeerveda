import {describe, expect, it} from "vitest";

import {programCatalog, getProgram} from "../../data/programCatalog";
import {CINEMATIC_PROGRAMS} from "../../lib/routeChunks";
import {CATALOG_CINEMATIC, CINEMATIC_COPY} from "./catalogPrograms";
import {productManagementContent, buildProductManagementContent} from "./productManagement";
import {buildCinematicContent} from "./fromCatalog";

describe("cinematic program pages built from the catalogue", () => {
  it("covers every catalogue program, and the route list agrees with the content", () => {
    const expected = programCatalog.map((p) => p.id).filter((id) => id !== "gen-ai-agentic-ai");
    expect([...CINEMATIC_PROGRAMS].sort()).toEqual(expected.sort());
    for (const id of CINEMATIC_PROGRAMS) {
      if (id !== "product-management") expect(CATALOG_CINEMATIC[id], id).toBeDefined();
    }
  });

  it.each(Object.keys(CATALOG_CINEMATIC))("%s has every section the template renders", (id) => {
    expect(Object.keys(CATALOG_CINEMATIC[id]).sort()).toEqual(Object.keys(productManagementContent).sort());
  });

  it.each(Object.keys(CATALOG_CINEMATIC))("%s lists every catalogue module exactly once, in order", (id) => {
    const content = CATALOG_CINEMATIC[id];
    const shown = content.modules.stages.flatMap((stage) => stage.weeks.map((week) => week.title));
    expect(shown).toEqual(getProgram(id).modules.map((m) => m.title));
    expect(content.modules.stages).toHaveLength(5);
    expect(content.timeline.items).toHaveLength(6);
    expect(content.workflow.steps).toHaveLength(10);
    expect(content.projects.items).toHaveLength(8);
  });

  it.each(Object.keys(CATALOG_CINEMATIC))("%s shows real salary bands and the catalogue's batch", (id) => {
    const content = CATALOG_CINEMATIC[id];
    expect(content.careers.roles.length).toBeGreaterThan(0);
    for (const role of content.careers.roles) expect(role.salary, role.role).toMatch(/^₹\d+–\d+ LPA$/);
    expect(content.hero.metaRight).toBe(`Next batch · ${getProgram(id).nextBatch}`);
  });

  // The page rebuilds these objects from the admin API record. These two tests
  // are the regression guard for the original bug: the hero kept printing the
  // build-time September date no matter what was saved in the panel.
  it("prints the admin record's batch date on a catalogue cinematic page", () => {
    const live = {...getProgram("data-analytics"), nextBatch: "December 5, 2026"};
    const content = buildCinematicContent("data-analytics", CINEMATIC_COPY["data-analytics"], live);
    expect(content.hero.metaRight).toBe("Next batch · December 5, 2026");
    expect(content.cta.meta[0]).toBe("Next batch · December 5, 2026");
  });

  it("prints the admin record's batch date on the Product Management page", () => {
    const live = {...getProgram("product-management"), nextBatch: "December 5, 2026"};
    const content = buildProductManagementContent(live);
    expect(content.hero.metaRight).toBe("Next batch · December 5, 2026");
    expect(content.cta.meta[0]).toBe("Next batch · December 5, 2026");
  });
});
