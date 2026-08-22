import {describe, expect, it} from "@jest/globals";
import {
  PUBLISH_REQUIREMENTS,
  isFilled,
  missingForPublish,
} from "../../src/config/publishRules.js";

// A stand-in for a Mongoose document: missingForPublish reads the model name off
// the constructor and the values through .get(), and nothing else.
const asDocument = (modelName, values) => {
  function Model() {}
  Model.modelName = modelName;

  return Object.assign(Object.create(Model.prototype), {
    get: (field) => values[field],
  });
};

describe("isFilled", () => {
  it("rejects nullish and blank strings", () => {
    expect(isFilled(null)).toBe(false);
    expect(isFilled(undefined)).toBe(false);
    expect(isFilled("")).toBe(false);
    expect(isFilled("   ")).toBe(false);
    expect(isFilled("\n\t")).toBe(false);
  });

  it("accepts a string with content", () => {
    expect(isFilled("x")).toBe(true);
    expect(isFilled("  padded  ")).toBe(true);
  });

  it("treats 0 as filled — displayOrder 0 is the first item, not a missing value", () => {
    expect(isFilled(0)).toBe(true);
  });

  it("treats false as filled, since it is a deliberate value", () => {
    expect(isFilled(false)).toBe(true);
  });

  it("requires an array to have at least one entry", () => {
    expect(isFilled([])).toBe(false);
    expect(isFilled(["a"])).toBe(true);
  });

  it("counts a media reference as filled only when it points at an image", () => {
    expect(isFilled({url: "https://cdn/x.jpg"})).toBe(true);
    expect(isFilled({url: ""})).toBe(false);
    expect(isFilled({url: "   "})).toBe(false);
    expect(isFilled({url: null})).toBe(false);
    // The key being present is what marks it a media ref; other keys don't rescue it.
    expect(isFilled({url: "", alt: "logo"})).toBe(false);
  });

  it("counts a plain object as filled when it has any key", () => {
    expect(isFilled({})).toBe(false);
    expect(isFilled({a: 1})).toBe(true);
  });
});

describe("missingForPublish", () => {
  it("returns {} for a resource with no rules — a rule set is opt-in", () => {
    expect(missingForPublish(asDocument("Media", {}))).toEqual({});
    expect(missingForPublish(asDocument("SomethingNew", {}))).toEqual({});
  });

  it("returns {} when every required field is filled", () => {
    const faq = asDocument("Faq", {question: "What?", answer: "This."});

    expect(missingForPublish(faq)).toEqual({});
  });

  it("names each missing field with a human label the panel can show", () => {
    const faq = asDocument("Faq", {question: "What?", answer: "  "});
    const missing = missingForPublish(faq);

    expect(Object.keys(missing)).toEqual(["answer"]);
    expect(missing.answer).toMatch(/Answer/);
    expect(missing.answer).toMatch(/required/i);
  });

  it("reports every missing field at once, not just the first", () => {
    const missing = missingForPublish(asDocument("Job", {}));

    expect(Object.keys(missing).sort()).toEqual(
      ["applicationUrl", "company", "description", "location", "title"].sort(),
    );
  });

  it("blocks a program missing the sections that render as empty headings", () => {
    const program = asDocument("Program", {
      title: "PG in Product Management",
      subtitle: "Become a PM",
      category: "Product",
      description: "Lead products.",
      duration: "6 Months",
      mentorship: "Mentor-led",
      format: "Live Online",
      image: {url: "https://cdn/x.jpg"},
      overview: ["a"],
      curriculum: [],
      outcomes: [],
    });

    expect(Object.keys(missingForPublish(program)).sort()).toEqual(["curriculum", "outcomes"]);
  });

  it("passes a fully populated program", () => {
    const program = asDocument("Program", {
      title: "PG in Product Management",
      subtitle: "Become a PM",
      category: "Product",
      description: "Lead products.",
      duration: "6 Months",
      mentorship: "Mentor-led",
      format: "Live Online",
      image: {url: "https://cdn/x.jpg"},
      overview: ["a"],
      curriculum: ["b"],
      outcomes: ["c"],
    });

    expect(missingForPublish(program)).toEqual({});
  });

  it("blocks a program whose card image record exists but has no URL", () => {
    const program = asDocument("Program", {
      title: "t",
      subtitle: "s",
      category: "c",
      description: "d",
      duration: "6 Months",
      mentorship: "m",
      format: "f",
      image: {url: ""},
      overview: ["a"],
      curriculum: ["b"],
      outcomes: ["c"],
    });

    expect(missingForPublish(program)).toHaveProperty("image");
  });

  it("blocks a policy with no sections — an empty page with legal force", () => {
    const policy = asDocument("Policy", {
      title: "Terms",
      lead: "These terms apply.",
      updated: "2026-01-01",
      sections: [],
    });

    expect(missingForPublish(policy)).toHaveProperty("sections");
  });

  it("blocks a blog with no body", () => {
    const blog = asDocument("Blog", {
      title: "Post",
      category: "News",
      excerpt: "Short",
      sections: [],
    });

    expect(missingForPublish(blog)).toHaveProperty("sections");
  });
});

describe("PUBLISH_REQUIREMENTS", () => {
  it("gives every rule both a field and a label, or the panel shows 'undefined is required'", () => {
    for (const [model, rules] of Object.entries(PUBLISH_REQUIREMENTS)) {
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);

      for (const rule of rules) {
        expect(typeof rule.field).toBe("string");
        expect(rule.field.length).toBeGreaterThan(0);
        expect(typeof rule.label).toBe("string");
        expect(rule.label.length).toBeGreaterThan(0);
      }

      // A duplicated field would overwrite itself in the returned map.
      const fields = rules.map((rule) => rule.field);
      expect(new Set(fields).size).toBe(fields.length);
      expect(model.length).toBeGreaterThan(0);
    }
  });
});
