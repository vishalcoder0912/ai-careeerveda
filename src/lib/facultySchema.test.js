import {describe, expect, it} from "vitest";
import {facultySchema} from "./structuredData";

describe("facultySchema", () => {
  it("describes each shown mentor as a Person, using only fields that exist", () => {
    const schema = facultySchema([
      {name: "A Mentor", role: "Sr. PM at Example", photo: "https://img/a.jpg", bio: "  Ten years\n in product. ", expertise: ["SQL", "Roadmaps"]},
      {name: "B Mentor"},
      {role: "no name — skipped"},
    ]);
    const people = schema.itemListElement.map((entry) => entry.item);
    expect(people).toHaveLength(2);
    expect(people[0]).toMatchObject({"@type": "Person", name: "A Mentor", jobTitle: "Sr. PM at Example", description: "Ten years in product.", knowsAbout: ["SQL", "Roadmaps"]});
    expect(people[1]).toEqual({"@type": "Person", name: "B Mentor", affiliation: people[0].affiliation});
    expect(schema.itemListElement.map((entry) => entry.position)).toEqual([1, 2]);
  });

  it("emits nothing for an empty list", () => {
    expect(facultySchema([])).toBeNull();
  });
});
