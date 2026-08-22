// The home page's hand-written content sections.
//
// This module re-exports partnerLogos (built from a Vite import.meta.glob that
// Jest cannot transform), so the suite stubs that one dependency to keep the
// file importable and asserts the hand-written sections that the re-export does
// not affect. The sections are all fixed [name, detail] tuples or small lists,
// so the invariants worth pinning are counts, ordering and the shape the
// components render.

import {describe, it, expect, jest} from "@jest/globals";

jest.mock("../../../src/data/partnerLogos", () => ({partnerLogos: [{name: "Deloitte", logo: "/mock/deloitte.svg"}]}));

import {
  navItems,
  stats,
  programs,
  differentiators,
  supportTracks,
  careerSteps,
  partners,
  partnerLogos,
  achievers,
  reviews,
  ratings,
  faqs,
} from "../../../src/data/siteData";

describe("siteData — hand-written home-page sections", () => {
  it("lists the primary nav routes as [path, label] pairs", () => {
    expect(navItems).toHaveLength(6);
    for (const [path, label] of navItems) {
      expect(path).toMatch(/^\//);
      expect(label).toBeTruthy();
    }
  });

  it("keeps the headline stats as [value, label] pairs", () => {
    expect(stats).toHaveLength(5);
    for (const [value, label] of stats) {
      expect(value).toMatch(/\d/);
      expect(label).toBeTruthy();
    }
  });

  it("lists the seven programs the home page teaser advertises", () => {
    expect(programs).toHaveLength(7);
    for (const program of programs) {
      expect(program.title).toBeTruthy();
    }
  });

  it("describes every differentiator as a title and a body", () => {
    expect(differentiators.length).toBeGreaterThanOrEqual(8);
    for (const [title, body] of differentiators) {
      expect(title).toBeTruthy();
      expect(body.length).toBeGreaterThan(title.length);
    }
  });

  it("gives each support track a title and concrete points", () => {
    expect(supportTracks).toHaveLength(3);
    for (const track of supportTracks) {
      expect(track.title).toBeTruthy();
      expect(track.points.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("numbers the three career steps in order", () => {
    expect(careerSteps).toHaveLength(3);
    expect(careerSteps.map((step) => step.number)).toEqual(["01", "02", "03"]);
    for (const step of careerSteps) {
      expect(step.title).toBeTruthy();
      expect(step.body).toBeTruthy();
      expect(step.tags.length).toBeGreaterThan(0);
    }
  });

  it("lists distinct partner names", () => {
    expect(partners.length).toBeGreaterThanOrEqual(12);
    expect(new Set(partners).size).toBe(partners.length);
  });

  it("keeps the achiever stories as [hike, name, role, story]", () => {
    expect(achievers.length).toBeGreaterThanOrEqual(5);
    for (const entry of achievers) {
      expect(entry).toHaveLength(4);
      expect(entry[0]).toMatch(/%/);
      expect(entry[1]).toBeTruthy();
      expect(entry[2]).toBeTruthy();
      expect(entry[3].length).toBeGreaterThan(20);
    }
  });

  it("shapes every review as [name, role, quote, program, photo?]", () => {
    expect(reviews.length).toBeGreaterThanOrEqual(4);
    for (const review of reviews) {
      expect(review[0]).toBeTruthy();
      expect(review[1]).toBeTruthy();
      expect(review[2].length).toBeGreaterThan(20);
      expect(review[3]).toBeTruthy();
      if (review[4]) expect(review[4]).toMatch(/^https:\/\//);
    }
  });

  it("keeps the ratings as [score, source] for the rating row", () => {
    expect(ratings).toHaveLength(4);
    for (const [score, source] of ratings) {
      expect(score).toMatch(/^\d\.\d+$/);
      expect(source).toBeTruthy();
    }
  });

  it("re-exports the FAQ list without breaking its importers", () => {
    expect(Array.isArray(faqs)).toBe(true);
    expect(faqs.length).toBeGreaterThanOrEqual(10);
  });

  it("re-exports partnerLogos, stubbed here because Jest cannot transform its Vite glob", () => {
    expect(partnerLogos).toEqual([{name: "Deloitte", logo: "/mock/deloitte.svg"}]);
  });
});