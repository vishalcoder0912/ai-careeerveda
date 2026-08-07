import {describe, it, expect} from "vitest";

import {RESOURCES, initialValues, prefilledFields} from "./resources";
import {missingForPublish} from "./publishRules";

describe("new-record defaults", () => {
  it("prefills a new program with the values every program repeats", () => {
    const form = initialValues(RESOURCES.programs);

    expect(form.format).toBe("Live Online");
    expect(form.eligibility).toBe("Freshers, Graduates, Experienced");
    expect(form.guarantee).toBe("7-Day Money Back Guarantee");
    expect(form.badges).toContain("Industry-Aligned");
  });

  it("leaves the fields that must differ per program empty", () => {
    const form = initialValues(RESOURCES.programs);

    // A price inherited from another program is a wrong number on a live page,
    // and a title or description inherited from one is nonsense.
    for (const field of ["title", "subtitle", "description", "startingPrice", "nextBatch"]) {
      expect(form[field]).toBeUndefined();
    }
  });

  it("gives each new record its own copy of an array default", () => {
    const first = initialValues(RESOURCES.programs);
    const second = initialValues(RESOURCES.programs);

    expect(first.badges).not.toBe(second.badges);

    // The failure this guards against: editing one program's badges reaching
    // into the config and changing what every later program starts with.
    first.badges.push("Only on this one");
    expect(second.badges).not.toContain("Only on this one");
    expect(initialValues(RESOURCES.programs).badges).not.toContain("Only on this one");
  });

  it("reduces what is still outstanding at publish time", () => {
    const blank = missingForPublish(RESOURCES.programs, {});
    const prefilled = missingForPublish(RESOURCES.programs, initialValues(RESOURCES.programs));

    expect(prefilled.length).toBeLessThan(blank.length);
    // Duration and format are publish-required and now arrive filled in.
    expect(prefilled.map((entry) => entry.name)).not.toContain("format");
    expect(prefilled.map((entry) => entry.name)).not.toContain("duration");
  });

  it("reports which fields carry a default, for the editor's note", () => {
    expect(prefilledFields(RESOURCES.programs)).toContain("format");
    expect(prefilledFields(RESOURCES.programs)).not.toContain("title");
  });

  it("does not prefill anything a resource has not opted into", () => {
    // Faculty declares no defaults — a mentor's name, role and discipline are
    // theirs alone, so a new faculty form is deliberately blank.
    expect(initialValues(RESOURCES.faculty)).toEqual({});
  });
});
