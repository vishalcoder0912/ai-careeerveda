import {describe, expect, it} from "@jest/globals";

import {
  alumniBody,
  archiveBody,
  blogBody,
  bulkBody,
  bulkStatusBody,
  contentBody,
  facultyBody,
  faqBody,
  idParam,
  jobBody,
  listQuery,
  policyBody,
  programBody,
  publicListQuery,
  publishBody,
  reorderBody,
  rollbackParam,
  slugParam,
  updateBody,
} from "../../../src/validators/content.validators.js";

// These schemas are the mass-assignment boundary: validate() replaces the body
// with the parsed result, so what these accept is exactly what can reach a
// model. The interesting behaviours are the transforms (tag stripping, null
// dropping, coercion) and the defaults controllers rely on.

const parse = (schema, value) => schema.parse(value);

const VALID_OBJECT_ID = "64b7f9d2e4b0a1b2c3d4e5f6";

describe("programBody", () => {
  it("accepts a minimal body with only the title", () => {
    const parsed = parse(programBody, {title: "Data Analyst Program"});

    expect(parsed).toMatchObject({
      title: "Data Analyst Program",
      subtitle: "",
      mentorship: [],
      modules: [],
      faqs: [],
      gallery: [],
      brochureUrl: "",
    });
  });

  it("strips markup from free text, since content is never HTML", () => {
    expect(parse(programBody, {title: "<b>Cohort 12</b>"}).title).toBe("Cohort 12");
    expect(parse(programBody, {title: "<<script>alert(1)</script>"}).title).toBe("alert(1)");
  });

  it("rejects a non-text title and an over-length one", () => {
    expect(() => parse(programBody, {title: 42})).toThrow();
    expect(() => parse(programBody, {title: "a".repeat(301)})).toThrow();
  });

  it("rejects a slug outside the safe lowercase vocabulary", () => {
    expect(() => parse(programBody, {title: "x", slug: "Not A Slug"})).toThrow();
    expect(() => parse(programBody, {title: "x", slug: "a".repeat(141)})).toThrow();
  });

  it("bounds displayOrder so a single value cannot break the ordering", () => {
    expect(() => parse(programBody, {title: "x", displayOrder: 10001})).toThrow();
    expect(() => parse(programBody, {title: "x", displayOrder: -10001})).toThrow();
    expect(() => parse(programBody, {title: "x", displayOrder: 0})).not.toThrow();
  });

  it("accepts the full document shape: modules, faqs, fee, media and references", () => {
    const body = {
      title: "Program",
      mentorship: ["Mentor 1"],
      modules: [{n: 1, title: "Intro", points: ["point one"]}],
      faqs: [{question: "Q?", answer: "A."}],
      fee: {label: "Fees", amount: "₹1,45,000"},
      image: {url: "https://img.example/x.jpg", width: 800},
      gallery: [{url: "/images/a.jpg"}],
      mentors: [VALID_OBJECT_ID],
      nextBatchMode: "custom",
    };

    expect(() => parse(programBody, body)).not.toThrow();
    expect(parse(programBody, body).modules[0].points).toEqual(["point one"]);
  });

  it("refuses a media url that is not http(s) or site-relative", () => {
    expect(() => parse(programBody, {title: "x", image: {url: "javascript:alert(1)"}})).toThrow();
  });

  it("refuses a nextBatchMode outside auto/custom", () => {
    expect(() => parse(programBody, {title: "x", nextBatchMode: "manual"})).toThrow();
  });
});

describe("facultyBody", () => {
  it("accepts a minimal profile and defaults the optional prose", () => {
    const parsed = parse(facultyBody, {name: "Dr. Anjali Rao"});

    expect(parsed.name).toBe("Dr. Anjali Rao");
    expect(parsed.discipline).toBe("");
    expect(parsed.socialLinks).toBeUndefined();
  });

  it("rejects a missing name", () => {
    expect(() => parse(facultyBody, {})).toThrow();
  });

  it("defaults every social link to an empty string once the block is given", () => {
    const parsed = parse(facultyBody, {name: "x", socialLinks: {linkedin: "https://in/x"}});

    expect(parsed.socialLinks).toEqual({linkedin: "https://in/x", twitter: "", github: "", website: ""});
  });
});

describe("alumniBody", () => {
  it("accepts a minimal story", () => {
    const parsed = parse(alumniBody, {name: "Rahul Verma"});

    expect(parsed.currentRole).toBe("");
  });

  it("validates object-id references and accepts null for the optional ones", () => {
    expect(() => parse(alumniBody, {name: "x", program: "not-an-id"})).toThrow();
    expect(() => parse(alumniBody, {name: "x", program: null})).not.toThrow();
    expect(() => parse(alumniBody, {name: "x", program: VALID_OBJECT_ID})).not.toThrow();
  });
});

describe("blogBody", () => {
  it("accepts a minimal post and rejects a body with no title", () => {
    expect(() => parse(blogBody, {title: "Why SQL still matters"})).not.toThrow();
    expect(() => parse(blogBody, {})).toThrow();
  });

  it("refuses a CTA that would become a javascript: link", () => {
    expect(() => parse(blogBody, {title: "x", cta: {label: "Go", url: "javascript:alert(1)"}})).toThrow();
  });

  it("validates section bodies are arrays of strings", () => {
    expect(() => parse(blogBody, {title: "x", sections: [{heading: "H", body: "not an array"}]})).toThrow();
  });
});

describe("jobBody", () => {
  it("coerces date fields and accepts null", () => {
    const parsed = parse(jobBody, {title: "x", postedDate: "2026-08-01", deadline: null});

    expect(parsed.postedDate).toBeInstanceOf(Date);
    expect(parsed.postedDate.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(parsed.deadline).toBeNull();
  });

  it("rejects an unparseable date", () => {
    expect(() => parse(jobBody, {title: "x", postedDate: "not-a-date"})).toThrow();
  });
});

describe("policyBody", () => {
  it("accepts a minimal policy and defaults its sections and stats", () => {
    const parsed = parse(policyBody, {title: "Refund Policy"});

    expect(parsed.sections).toEqual([]);
    expect(parsed.stats).toEqual([]);
  });

  it("validates nested section groups", () => {
    const body = {
      title: "x",
      sections: [{heading: "H", groups: [{title: "G", list: ["one"]}], closing: "done"}],
    };

    expect(() => parse(policyBody, body)).not.toThrow();
    expect(() => parse(policyBody, {title: "x", sections: [{groups: "not-an-array"}]})).toThrow();
  });
});

describe("faqBody", () => {
  it("requires both question and answer", () => {
    expect(() => parse(faqBody, {question: "Q?", answer: "A."})).not.toThrow();
    expect(() => parse(faqBody, {question: "Q?"})).toThrow();
    expect(() => parse(faqBody, {answer: "A."})).toThrow();
  });

  it("accepts only known related entity types", () => {
    const valid = {question: "Q?", answer: "A.", relatedEntityType: "Program"};
    expect(() => parse(faqBody, valid)).not.toThrow();
    expect(() => parse(faqBody, {...valid, relatedEntityType: "Programme"})).toThrow();
  });
});

describe("listQuery", () => {
  it("defaults to the first page of twenty", () => {
    expect(parse(listQuery, {})).toMatchObject({page: 1, limit: 20});
  });

  it("coerces string page and limit values", () => {
    expect(parse(listQuery, {page: "3", limit: "50"})).toMatchObject({page: 3, limit: 50});
  });

  it("bounds page and limit", () => {
    expect(() => parse(listQuery, {page: 0})).toThrow();
    expect(() => parse(listQuery, {limit: 101})).toThrow();
    expect(() => parse(listQuery, {page: 10001})).toThrow();
  });

  it("validates the status against the content lifecycle", () => {
    expect(() => parse(listQuery, {status: "published"})).not.toThrow();
    expect(() => parse(listQuery, {status: "deleted"})).toThrow();
  });

  it("turns featured/includeDeleted/deleted strings into booleans", () => {
    expect(parse(listQuery, {featured: "true"}).featured).toBe(true);
    expect(parse(listQuery, {includeDeleted: "false"}).includeDeleted).toBe(false);
    expect(parse(listQuery, {deleted: "true"}).deleted).toBe(true);
  });
});

describe("publicListQuery", () => {
  it("defaults exactly like the admin list", () => {
    expect(parse(publicListQuery, {})).toMatchObject({page: 1, limit: 20});
  });

  it("strips admin-only filters instead of honouring them", () => {
    const parsed = parse(publicListQuery, {status: "published", includeDeleted: "true", deleted: "true"});

    expect(parsed.status).toBeUndefined();
    expect(parsed.includeDeleted).toBeUndefined();
    expect(parsed.deleted).toBeUndefined();
  });

  it("keeps the alumni-grid switch", () => {
    expect(parse(publicListQuery, {showOnAlumniPage: "true"}).showOnAlumniPage).toBe(true);
  });
});

describe("idParam / slugParam / rollbackParam", () => {
  it("accepts a valid ObjectId and rejects anything else", () => {
    expect(() => parse(idParam, {id: VALID_OBJECT_ID})).not.toThrow();
    expect(() => parse(idParam, {id: "nope"})).toThrow();
  });

  it("accepts only safe slugs in the path", () => {
    expect(() => parse(slugParam, {slug: "data-analyst"})).not.toThrow();
    expect(() => parse(slugParam, {slug: "Data Analyst"})).toThrow();
  });

  it("coerces the revision number in the rollback path", () => {
    expect(parse(rollbackParam, {id: VALID_OBJECT_ID, revision: "7"})).toMatchObject({
      id: VALID_OBJECT_ID,
      revision: 7,
    });
    expect(() => parse(rollbackParam, {id: VALID_OBJECT_ID, revision: 0})).toThrow();
  });
});

describe("publishBody / archiveBody", () => {
  it("coerces the scheduled date and accepts an immediate publish", () => {
    expect(parse(publishBody, {scheduledAt: "2026-09-01T10:00:00.000Z"}).scheduledAt).toBeInstanceOf(Date);
    expect(() => parse(publishBody, {})).not.toThrow();
  });

  it("makes the archive reason optional but still strips markup", () => {
    expect(parse(archiveBody, {}).reason).toBeUndefined();
    expect(parse(archiveBody, {reason: "<p>duplicate</p>"}).reason).toBe("duplicate");
  });
});

describe("contentBody / updateBody", () => {
  it("drops nulls so a round-tripped record is not refused", () => {
    const parsed = parse(contentBody(programBody), {title: "x", subtitle: null, image: null});

    expect(parsed.subtitle).toBe("");
    expect(parsed.image).toBeUndefined();
  });

  it("accepts a one-field PATCH and coerces the revision", () => {
    const parsed = parse(updateBody(programBody), {title: "Renamed", revision: "3"});

    expect(parsed).toMatchObject({title: "Renamed", revision: 3});
    // A PATCH body is a partial: fields it does not mention are left absent
    // rather than defaulted, so a partial update cannot reset what it skips.
    expect(parsed.subtitle).toBeUndefined();
  });

  it("rejects a PATCH of a field that fails its own rules", () => {
    expect(() => parse(updateBody(programBody), {title: 42})).toThrow();
  });
});

describe("bulk operations", () => {
  it("requires between 1 and 100 valid ids", () => {
    expect(() => parse(bulkBody, {ids: [VALID_OBJECT_ID]})).not.toThrow();
    expect(() => parse(bulkBody, {ids: []})).toThrow();
    expect(() => parse(bulkBody, {ids: Array(101).fill(VALID_OBJECT_ID)})).toThrow();
    expect(() => parse(bulkBody, {ids: ["junk"]})).toThrow();
  });

  it("validates the status alongside the ids", () => {
    expect(() => parse(bulkStatusBody, {ids: [VALID_OBJECT_ID], status: "published"})).not.toThrow();
    expect(() => parse(bulkStatusBody, {ids: [VALID_OBJECT_ID], status: "on-fire"})).toThrow();
  });

  it("validates reorder items and their displayOrder bounds", () => {
    const items = [{id: VALID_OBJECT_ID, displayOrder: 3}];
    expect(() => parse(reorderBody, {items})).not.toThrow();
    expect(() => parse(reorderBody, {items: []})).toThrow();
    expect(() => parse(reorderBody, {items: [{id: VALID_OBJECT_ID, displayOrder: 20000}]})).toThrow();
  });
});