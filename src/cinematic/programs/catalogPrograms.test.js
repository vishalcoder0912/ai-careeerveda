import {describe, expect, it} from "vitest";

import {programCatalog, getProgram} from "../../data/programCatalog";
import {CINEMATIC_PROGRAMS} from "../../lib/routeChunks";
import {CATALOG_CINEMATIC} from "./catalogPrograms";
import {productManagementContent} from "./productManagement";

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
});
