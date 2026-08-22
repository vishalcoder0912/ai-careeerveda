// The FAQ pairs the home page renders as an accordion: [question, answer].
//
// The invariant that matters here is that every entry is exactly a question and
// an answer — a reversed pair renders a nonsense accordion — and that each
// question is distinct so the accordion keys stay unique.

import {describe, it, expect} from "@jest/globals";

import {faqs} from "../../../src/data/faqs";

describe("faqs", () => {
  it("ships a populated list of [question, answer] pairs", () => {
    expect(faqs.length).toBeGreaterThanOrEqual(10);
    for (const entry of faqs) {
      expect(entry).toHaveLength(2);
      expect(entry[0]).toMatch(/\?$/);
      expect(entry[1].length).toBeGreaterThan(entry[0].length);
    }
  });

  it("keeps every question distinct so accordion keys never collide", () => {
    const questions = faqs.map(([question]) => question);
    expect(new Set(questions).size).toBe(questions.length);
  });

  it("answers the questions a prospective learner actually asks", () => {
    const text = faqs.flat().join(" ");
    for (const phrase of ["placement", "certification", "live", "eligibility"]) {
      expect(text.toLowerCase()).toContain(phrase);
    }
  });
});