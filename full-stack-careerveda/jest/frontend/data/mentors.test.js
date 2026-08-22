// The faculty/mentor roster and the initials fallback for a mentor with no photo.
//
// The roster is rendered by the faculty page, which shows name, discipline,
// role, photo and bio; the initials helper powers the monogram that appears
// when a mentor has no photo. The publishing rule lives in the data too: a
// mentor with a `draft` flag must not be visible, so the suite pins that the
// exported, renderable list and the full list are the same today.

import {describe, it, expect} from "@jest/globals";

import {mentors, publishedMentors, initialsOf} from "../../../src/data/mentors";

describe("mentors — the roster", () => {
  it("holds a populated list with every card's required fields", () => {
    expect(mentors.length).toBeGreaterThanOrEqual(9);
    for (const mentor of mentors) {
      expect(mentor.id).toBeTruthy();
      expect(mentor.name).toBeTruthy();
      expect(mentor.discipline).toBeTruthy();
      expect(mentor.role).toBeTruthy();
      expect(mentor.bio).toBeTruthy();
      expect(mentor.photo).toMatch(/^https:\/\/ik\.imagekit\.io\//);
    }
  });

  it("gives every mentor a unique id, so a card is never keyed twice", () => {
    const ids = mentors.map((mentor) => mentor.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers the disciplines the faculty page promises", () => {
    const disciplines = new Set(mentors.map((mentor) => mentor.discipline));
    for (const expected of ["Product Management", "Data Science", "Analytics", "Business Analytics"]) {
      expect(disciplines.has(expected)).toBe(true);
    }
  });

  it("publishes the same list it renders — no mentor is hiding behind a draft flag", () => {
    expect(publishedMentors.map((mentor) => mentor.id)).toEqual(mentors.map((mentor) => mentor.id));
  });
});

describe("initialsOf — the no-photo monogram", () => {
  it("takes the first letter of the first and last word", () => {
    expect(initialsOf("Priya Raghavan")).toBe("PR");
  });

  it("uses the whole single word when there is no family name", () => {
    expect(initialsOf("Priya")).toBe("P");
  });

  it("uppercases the result regardless of input case", () => {
    expect(initialsOf("priya raghavan")).toBe("PR");
  });

  it("answers a safe placeholder when the name is empty", () => {
    expect(initialsOf("")).toBe("?");
    expect(initialsOf("   ")).toBe("?");
  });
});