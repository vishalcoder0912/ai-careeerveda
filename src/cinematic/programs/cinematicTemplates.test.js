import {describe, expect, it} from "vitest";

import {programBody} from "../../../backend/src/validators/content.validators.js";
import {CINEMATIC_PROGRAMS} from "../../lib/routeChunks";
import {getProgram} from "../../data/programCatalog";
import {CINEMATIC_COPY} from "./catalogPrograms";
import {
  CINEMATIC_COPY_TEMPLATES,
  GEN_AI_COPY_TEMPLATE,
  cinematicTemplateFor,
} from "./cinematicTemplates";
import {buildCinematicContent} from "./fromCatalog";
import {buildGenAiContent} from "./genAi";
import {buildProductManagementContent} from "./productManagement";
import {Compass, Bot} from "lucide-react";

const ALL_CINEMATIC_ROUTES = [...CINEMATIC_PROGRAMS, "gen-ai-agentic-ai"];

describe("cinematic \"Load current page copy\" templates", () => {
  it("has a template for every cinematic route (and nothing unexpected)", () => {
    expect(Object.keys(CINEMATIC_COPY_TEMPLATES).sort()).toEqual([...ALL_CINEMATIC_ROUTES].sort());
  });

  it.each(Object.keys(CINEMATIC_COPY_TEMPLATES))("%s template is accepted by the backend validator", (id) => {
    const template = CINEMATIC_COPY_TEMPLATES[id];
    expect(() => programBody.parse({title: "x", cinematic: template}), id).not.toThrow();
  });

  it("resolves the template from the record being edited, not a static constant", () => {
    expect(cinematicTemplateFor({slug: "data-analytics"})).toBe(CINEMATIC_COPY_TEMPLATES["data-analytics"]);
    expect(cinematicTemplateFor({id: "gen-ai-agentic-ai"})).toBe(
      CINEMATIC_COPY_TEMPLATES["gen-ai-agentic-ai"],
    );
    expect(cinematicTemplateFor("product-management")).toBe(CINEMATIC_COPY_TEMPLATES["product-management"]);
    // A brand-new record has no id/slug yet: give it a usable shared voice.
    expect(cinematicTemplateFor({slug: undefined})).toBe(CINEMATIC_COPY_TEMPLATES["product-management"]);
  });

  it("uses each page's own words, never another page's template", () => {
    const pm = JSON.stringify(CINEMATIC_COPY_TEMPLATES["product-management"]);
    const da = JSON.stringify(CINEMATIC_COPY_TEMPLATES["data-analytics"]);
    expect(pm).not.toBe(da);
    expect(CINEMATIC_COPY_TEMPLATES["data-analytics"].hero.title).toEqual(
      CINEMATIC_COPY["data-analytics"].title,
    );
    expect(CINEMATIC_COPY_TEMPLATES["ai-systems-agentic-ai"].hero.title).toEqual(
      CINEMATIC_COPY["ai-systems-agentic-ai"].title,
    );
  });

  it("carries the Gen AI flagship's editable roadmap and module story", () => {
    expect(GEN_AI_COPY_TEMPLATE.certs.roadmap).toBeDefined();
    expect(GEN_AI_COPY_TEMPLATE.certs.roadmap.rows.length).toBeGreaterThan(0);
    expect(GEN_AI_COPY_TEMPLATE.modules.stages[0].weeks.length).toBeGreaterThan(0);
  });

  it("keeps module art as tokens so the image path is never doubled", () => {
    for (const [id, template] of Object.entries(CINEMATIC_COPY_TEMPLATES)) {
      for (const [stage, token] of Object.entries(template.modules?.art || {})) {
        expect(token, `${id} stage ${stage}`).toMatch(/^[a-z]+$/);
      }
    }
    // The runtime builders must not resolve tokens into paths either.
    const pm = buildProductManagementContent(getProgram("product-management"));
    const da = buildCinematicContent("data-analytics", CINEMATIC_COPY["data-analytics"]);
    for (const art of [...Object.values(pm.modules.art), ...Object.values(da.modules.art)]) {
      expect(art).toMatch(/^[a-z]+$/);
    }
  });

  it("keeps structural stage and week ids the module grid renders", () => {
    const built = buildGenAiContent(getProgram("gen-ai-agentic-ai"));
    expect(built.modules.stages[0].id).toBe("01");
    expect(built.modules.stages[0].weeks[0].id).toBe("W01");
    expect(GEN_AI_COPY_TEMPLATE.modules.stages[0].id).toBe("01");
    expect(GEN_AI_COPY_TEMPLATE.modules.stages[0].weeks[0].id).toBe("W01");
  });

  it("serialises icons as tokens, not React components", () => {
    const ga = GEN_AI_COPY_TEMPLATE;
    expect(ga.skills.items[3].icon).toBe("Bot");
    expect(JSON.stringify(ga)).not.toContain("function");
  });

  it("keeps every rendered icon as a valid token (none silently dropped)", () => {
    const ga = GEN_AI_COPY_TEMPLATE;
    const iconGroups = [
      ga.skills.items,
      ga.learning.items,
      ga.certs.proofPillars,
      ga.footer.channels,
    ];
    for (const group of iconGroups) {
      expect(group.length).toBeGreaterThan(0);
      for (const item of group) expect(typeof item.icon).toBe("string");
    }
    expect(CINEMATIC_COPY_TEMPLATES["data-analytics"].skills.items.every((item) => typeof item.icon === "string")).toBe(true);
  });
});

describe("cinematic overrides on every page type", () => {
  it("lets a catalogue page change copy without detaching live facts", () => {
    const live = {
      ...getProgram("data-analytics"),
      nextBatch: "December 5, 2026",
      seats: "3 seats left",
      cinematic: {
        hero: {title: ["Edited", "Headline"], sub: "Written in the panel."},
        skills: {items: [{title: "One skill", stack: ["A"], icon: "Compass"}]},
        cta: {meta: ["stale", "stale", "EMI if eligible"]},
      },
    };
    const content = buildCinematicContent(
      "data-analytics",
      CINEMATIC_COPY["data-analytics"],
      live,
    );

    expect(content.hero.title).toEqual(["Edited", "Headline"]);
    expect(content.hero.sub).toBe("Written in the panel.");
    expect(content.hero.metaRight).toBe("Next batch · December 5, 2026");
    expect(content.cta.meta).toEqual(["Next batch · December 5, 2026", "3 seats left", "EMI if eligible"]);
    expect(content.skills.items).toHaveLength(1);
    expect(content.skills.items[0].icon).toBe(Compass);
    // Every module is still present — an override never rewrites the curriculum.
    const shown = content.modules.stages.flatMap((stage) => stage.weeks.map((week) => week.title));
    expect(shown).toEqual(getProgram("data-analytics").modules.map((m) => m.title));
  });

  it("keeps every AI Systems module when modules are numbered from 0", () => {
    const live = {
      ...getProgram("ai-systems-agentic-ai"),
      cinematic: {
        modules: {stages: [{from: 0, to: 4}]},
      },
    };
    const content = buildCinematicContent(
      "ai-systems-agentic-ai",
      CINEMATIC_COPY["ai-systems-agentic-ai"],
      live,
    );
    expect(content.modules.stages[0].weeks.map((week) => week.title)).toEqual(
      getProgram("ai-systems-agentic-ai").modules.slice(0, 5).map((m) => m.title),
    );
  });

  it("lets the flagship change its credo without rewriting its facts", () => {
    const live = {
      ...getProgram("gen-ai-agentic-ai"),
      nextBatch: "January 9, 2027",
      seats: "5 seats left",
      cinematic: {
        quote: {lines: ["A new credo"], cite: "An editor"},
        skills: {items: [{title: "Agents", stack: ["A"], icon: "Bot"}]},
        certs: {roadmap: {title: "A new roadmap"}},
      },
    };
    const content = buildGenAiContent(live);

    expect(content.quote.lines).toEqual(["A new credo"]);
    expect(content.skills.items[0].icon).toBe(Bot);
    expect(content.certs.roadmap.title).toBe("A new roadmap");
    expect(content.hero.metaRight).toBe("Next batch · January 9, 2027");
    expect(content.cta.meta[1]).toBe("5 seats left");
    // Salary bands and stats are facts, not editorial copy.
    expect(content.stats.items).toEqual(
      buildGenAiContent(getProgram("gen-ai-agentic-ai")).stats.items,
    );
  });

  it("uses the saved hero video URL, even if the cinematic JSON tries to change it", () => {
    const url = "https://ik.imagekit.io/q7ucn1rfni/careerveda/programs/hero.mp4";
    const live = {
      ...getProgram("gen-ai-agentic-ai"),
      heroVideo: url,
      cinematic: {hero: {video: "https://other.example/override.mp4"}},
    };

    expect(buildGenAiContent(live).hero.video).toBe(url);
    expect(buildGenAiContent(getProgram("gen-ai-agentic-ai")).hero.video).toBe("");
  });
});
