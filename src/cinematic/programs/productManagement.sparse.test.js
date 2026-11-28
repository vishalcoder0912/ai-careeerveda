import {Compass} from "lucide-react";
import { describe, expect, it } from "vitest";
import { buildProductManagementContent } from "./productManagement";

describe("buildProductManagementContent with a sparse admin record", () => {
  it("does not throw and keeps the 13-module story", () => {
    const content = buildProductManagementContent({
      id: "product-management",
      title: "PG Program in Product Management",
      modules: [],
      internship: [],
      softSkills: [],
      projects: "",
      nextBatch: "",
    });
    expect(content.timeline.items).toHaveLength(6);
    expect(content.modules.stages).toHaveLength(5);
    expect(content.stats.items.find((s) => s.label === "Structured Modules").value).toBe(13);
    expect(content.stats.items.find((s) => s.label === "Projects").value).toBe(30);
  });

  it("lets admin cinematic overrides replace copy without detaching live facts", () => {
    const content = buildProductManagementContent({
      id: "product-management",
      title: "PG Program in Product Management",
      duration: "6 Months",
      format: "Live Online",
      learners: "10,000+",
      nextBatch: "November 28, 2026",
      seats: "Few seats left",
      projects: "30+",
      modules: [],
      internship: [],
      softSkills: ["Stakeholder Communication"],
      cinematic: {
        hero: {title: ["Build", "Products"], sub: "Edited in the panel."},
        timeline: {items: [{title: "A new chapter", description: "Written by an editor."}]},
        skills: {items: [{title: "Made up skill", stack: ["One"], icon: "Compass"}]},
        cta: {meta: ["stale", "stale", "EMI if eligible"]},
      },
    });

    expect(content.hero.title).toEqual(["Build", "Products"]);
    expect(content.hero.sub).toBe("Edited in the panel.");
    expect(content.hero.metaRight).toBe("Next batch · November 28, 2026");
    expect(content.hero.stats[0]).toEqual(["6 Months", "Duration"]);

    expect(content.timeline.items).toHaveLength(1);
    expect(content.timeline.items[0].title).toBe("A new chapter");
    expect(content.timeline.items[0].tags.length).toBeGreaterThan(0);

    expect(content.skills.items).toHaveLength(1);
    expect(content.skills.items[0].icon).toBe(Compass);

    expect(content.modules.tracks).toEqual([{title: "Stakeholder Communication", range: "All modules"}]);
    expect(content.cta.meta).toEqual(["Next batch · November 28, 2026", "Few seats left", "EMI if eligible"]);
  });

  it("uses the saved hero video URL, even if cinematic JSON tries to change it", () => {
    const url = "https://ik.imagekit.io/x/pm-hero.mp4";
    const content = buildProductManagementContent({
      id: "product-management",
      title: "PG Program in Product Management",
      modules: [],
      internship: [],
      softSkills: [],
      projects: "",
      nextBatch: "",
      heroVideo: url,
      cinematic: {hero: {video: "https://other.example/override.mp4"}},
    });
    expect(content.hero.video).toBe(url);
  });
});
