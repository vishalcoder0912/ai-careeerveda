import {existsSync} from "node:fs";
import {describe, expect, it} from "vitest";
import {getProgram} from "../../data/programCatalog";
import {CINEMATIC_PROGRAMS} from "../../lib/routeChunks";

// Every content object exported by a program file, keyed by program id.
const CINEMATIC_CONTENT = Object.fromEntries(
  Object.values(import.meta.glob(["./*.js", "!./*.test.js"], {eager: true}))
    .flatMap((mod) => Object.values(mod))
    .filter((value) => value?.programTitle)
    .map((content) => [content.id, content]),
);

const localImage = (src) => !src.startsWith("/") || existsSync(`public${src}`);

describe.each(CINEMATIC_PROGRAMS)("cinematic content: %s", (id) => {
  const content = CINEMATIC_CONTENT[id];
  const program = getProgram(id);

  it("exists for every cinematic route", () => {
    expect(content?.id).toBe(id);
  });

  it("covers every catalogue module exactly once across the stages", () => {
    const ids = content.modules.stages.flatMap((s) => s.weeks.map((w) => w.id));
    expect(ids).toEqual(program.modules.map((m) => `M${String(m.n).padStart(2, "0")}`));
  });

  it("pictures and tags every timeline chapter", () => {
    for (const item of content.timeline.items) {
      expect(item.image, item.title).toBeTruthy();
      expect(localImage(item.image), item.image).toBe(true);
      expect(item.tags[0], item.title).toBeTruthy();
    }
  });

  it("points at art that exists", () => {
    const art = [
      content.system.center.art,
      ...content.system.nodes.map((n) => n.img),
      ...Object.values(content.modules.art).map((name) => `/images/curriculum/${name}.webp`),
    ];
    for (const src of art) expect(localImage(src), src).toBe(true);
    expect(Object.keys(content.modules.art)).toEqual(content.modules.stages.map((s) => s.id));
  });

  it("gives every icon slot a component", () => {
    const icons = [
      ...content.skills.items.map((s) => s.icon),
      ...content.learning.items.map((s) => s.icon),
      ...content.certs.proofPillars.map((s) => s.icon),
    ];
    for (const icon of icons) expect(icon).toBeTruthy();
  });

  it("prices every role from the salary market", () => {
    for (const role of content.careers.roles) expect(role.salary, role.role).toMatch(/^₹\d+–\d+ LPA$/);
  });

  it("names a category for every project", () => {
    expect(content.projects.categories).toHaveLength(content.projects.items.length);
  });
});
