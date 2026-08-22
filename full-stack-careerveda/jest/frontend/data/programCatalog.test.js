// The program catalog — single source of truth for the explorer cards, the
// /programs/:slug pages and the enrol form's picker.
//
// These records are rendered in three places, so the shape invariants matter:
// a missing skills array breaks the whatsapp message builder, a missing fee
// silently drops the price card, and a module sequence that skips a number
// shows up on the detail page as a missing section.

import {describe, it, expect} from "@jest/globals";

import {programCatalog, getProgram, programTitles} from "../../../src/data/programCatalog";

describe("programCatalog — the records", () => {
  it("covers the nine advertised programs, one record each", () => {
    expect(programCatalog).toHaveLength(9);
    const ids = programCatalog.map((program) => program.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(
      expect.arrayContaining([
        "product-management",
        "business-analytics",
        "data-analytics",
        "investment-banking",
        "data-science-ai",
        "gen-ai",
        "data-engineering",
        "backend-engineering",
        "cybersecurity",
      ]),
    );
  });

  it("gives every program the fields every surface renders", () => {
    for (const program of programCatalog) {
      expect(program.id).toMatch(/^[a-z0-9-]+$/);
      expect(program.title).toBeTruthy();
      expect(program.fullTitle).toBeTruthy();
      expect(program.category).toBeTruthy();
      expect(program.subtitle).toBeTruthy();
      expect(program.description).toBeTruthy();
      expect(program.duration).toMatch(/\d+ Months/);
      expect(program.format).toBeTruthy();
      expect(program.lead).toBeTruthy();
      expect(program.badges.length).toBeGreaterThan(0);
      expect(program.learners).toBeTruthy();
    }
  });

  it("keeps the card/CTA/image lists populated for every program", () => {
    for (const program of programCatalog) {
      expect(program.overview.length).toBeGreaterThan(0);
      expect(program.curriculum.length).toBeGreaterThan(0);
      expect(program.outcomes.length).toBeGreaterThan(0);
      expect(program.skills.length).toBeGreaterThan(0);
      expect(program.gains.length).toBeGreaterThan(0);
      expect(program.internship.length).toBeGreaterThan(0);
      expect(program.softSkills.length).toBeGreaterThan(0);
    }
  });

  it("serves images over https or not at all — never a broken or http source", () => {
    for (const program of programCatalog) {
      if (program.image === "") continue;
      expect(program.image).toMatch(/^https:\/\//);
      expect(program.image).not.toContain("http://");
    }
  });

  it("numbers each program's modules consecutively from 1, so the page never shows a gap", () => {
    for (const program of programCatalog) {
      expect(program.modules.length).toBeGreaterThanOrEqual(10);
      program.modules.forEach((module, index) => {
        expect(module.n).toBe(index + 1);
        expect(module.title).toBeTruthy();
        expect(module.points.length).toBeGreaterThan(0);
      });
    }
  });

  it("gives every program a complete fee block and EMI terms, so the price card never prints an undefined amount", () => {
    for (const program of programCatalog) {
      expect(program.fee).toBeDefined();
      expect(program.fee.label).toBeTruthy();
      expect(program.fee.amount).toMatch(/\d/);
      expect(program.fee.note).toBeTruthy();
      expect(program.emi).toBeTruthy();
      expect(program.startingPrice).toMatch(/\d/);
    }
  });

  it("announces a next batch and eligibility for the programs currently enrolling", () => {
    for (const program of programCatalog) {
      expect(program.nextBatch).toBeTruthy();
      expect(program.seats).toBeTruthy();
      expect(program.eligibility).toBeTruthy();
      expect(program.projects).toBeTruthy();
    }
  });
});

describe("catalog lookups", () => {
  it("resolves a known slug to its record", () => {
    const program = getProgram("data-science-ai");
    expect(program.title).toBe("PG Program in Data Science with Generative AI");
  });

  it("answers null for a slug that does not exist", () => {
    expect(getProgram("nope")).toBeNull();
  });

  it("lists the titles in catalog order for the enrol-form picker", () => {
    expect(programTitles).toEqual(programCatalog.map((program) => program.title));
    expect(new Set(programTitles).size).toBe(programTitles.length);
  });
});