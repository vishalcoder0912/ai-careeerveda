import {describe, expect, it} from "@jest/globals";

import {
  addNoteSchema,
  exportQuery,
  leadListQuery,
  submitLeadSchema,
  updateLeadSchema,
} from "../../../src/validators/lead.validators.js";

// Field rules are copied from api/_db.js so the browser's instant feedback and
// the server's gate agree; these tests pin the server side of that contract.

const parse = (schema, value) => schema.parse(value);

const VALID_OBJECT_ID = "64b7f9d2e4b0a1b2c3d4e5f6";

const validLead = {
  name: "Priya Sharma",
  email: "priya@example.com",
  mobile: "9217801191",
};

describe("submitLeadSchema", () => {
  it("accepts a complete lead", () => {
    const parsed = parse(submitLeadSchema, {
      ...validLead,
      userType: "Student",
      program: "Data Analyst",
      message: "Interested in the next batch",
      consent: true,
    });

    expect(parsed).toMatchObject({
      ...validLead,
      userType: "Student",
      program: "Data Analyst",
      consent: true,
    });
  });

  it("defaults type, text fields and consent, so the form can send a minimal body", () => {
    const parsed = parse(submitLeadSchema, validLead);

    expect(parsed).toMatchObject({
      type: "consultation",
      program: "",
      message: "",
      source: "",
      sourcePage: "",
      consent: false,
    });
  });

  it("trims and lowercases the email the way the dedup key expects", () => {
    expect(parse(submitLeadSchema, {...validLead, email: "  Priya@Example.com "}).email).toBe(
      "priya@example.com",
    );
  });

  it("rejects a malformed email", () => {
    expect(() => parse(submitLeadSchema, {...validLead, email: "not-an-email"})).toThrow();
  });

  it("accepts Indian mobiles with and without the +91 prefix and separators", () => {
    for (const mobile of ["9217801191", "+91 92178 01191", "+919217801191", "92178-01191"]) {
      expect(() => parse(submitLeadSchema, {...validLead, mobile})).not.toThrow();
    }
  });

  it("rejects a mobile that cannot be an Indian number", () => {
    for (const mobile of ["1234567890", "92178", "0217801191", "abcdefghij"]) {
      expect(() => parse(submitLeadSchema, {...validLead, mobile})).toThrow();
    }
  });

  it("strips markup from the free-text fields", () => {
    const parsed = parse(submitLeadSchema, {...validLead, name: "<b>Priya</b> Sharma"});

    expect(parsed.name).toBe("Priya Sharma");
  });

  it("requires a non-blank name", () => {
    expect(() => parse(submitLeadSchema, {...validLead, name: ""})).toThrow();
    expect(() => parse(submitLeadSchema, {...validLead, name: "   "})).toThrow();
  });

  it("accepts only the documented user types", () => {
    expect(() => parse(submitLeadSchema, {...validLead, userType: "Career Switcher"})).not.toThrow();
    expect(() => parse(submitLeadSchema, {...validLead, userType: "Student"})).not.toThrow();
    expect(() => parse(submitLeadSchema, {...validLead, userType: "Other"})).toThrow();
  });

  it("keeps the honeypot field as a plain optional string", () => {
    const parsed = parse(submitLeadSchema, {...validLead, company: "a bot filled this in"});

    expect(parsed.company).toBe("a bot filled this in");
  });

  it("requires consent to be a boolean when present", () => {
    expect(() => parse(submitLeadSchema, {...validLead, consent: "yes"})).toThrow();
  });
});

describe("leadListQuery", () => {
  it("defaults to the first page of twenty-five", () => {
    expect(parse(leadListQuery, {})).toMatchObject({page: 1, limit: 25});
  });

  it("coerces filters, dates and the archived flag", () => {
    const parsed = parse(leadListQuery, {
      page: "2",
      type: "enrollment",
      status: "qualified",
      archived: "true",
      from: "2026-01-01",
      to: "2026-06-30",
    });

    expect(parsed).toMatchObject({
      page: 2,
      type: "enrollment",
      status: "qualified",
      archived: true,
    });
    expect(parsed.from).toBeInstanceOf(Date);
    expect(parsed.to).toBeInstanceOf(Date);
  });

  it("rejects unknown types, statuses and out-of-range paging", () => {
    expect(() => parse(leadListQuery, {type: "spam"})).toThrow();
    expect(() => parse(leadListQuery, {status: "won"})).toThrow();
    expect(() => parse(leadListQuery, {limit: 0})).toThrow();
  });
});

describe("updateLeadSchema", () => {
  it("accepts status, a nullable assignment and the archived flag", () => {
    const parsed = parse(updateLeadSchema, {
      status: "converted",
      assignedTo: VALID_OBJECT_ID,
      archived: true,
    });

    expect(parsed).toEqual({status: "converted", assignedTo: VALID_OBJECT_ID, archived: true});
    expect(() => parse(updateLeadSchema, {assignedTo: null})).not.toThrow();
  });

  it("rejects an invalid status or a malformed assignee id", () => {
    expect(() => parse(updateLeadSchema, {status: "finished"})).toThrow();
    expect(() => parse(updateLeadSchema, {assignedTo: "nope"})).toThrow();
  });
});

describe("addNoteSchema", () => {
  it("requires a non-blank note and strips markup from it", () => {
    expect(parse(addNoteSchema, {body: "<b>Called</b> back"})).toEqual({body: "Called back"});
    expect(() => parse(addNoteSchema, {body: ""})).toThrow();
    expect(() => parse(addNoteSchema, {body: "   "})).toThrow();
    expect(() => parse(addNoteSchema, {})).toThrow();
  });
});

describe("exportQuery", () => {
  it("inherits the list filters, including the default page size", () => {
    expect(parse(exportQuery, {})).toMatchObject({page: 1, limit: 25});
  });

  it("splits a comma list of ids and keeps only the valid ones", () => {
    const parsed = parse(exportQuery, {
      ids: `junk,${VALID_OBJECT_ID}, also-junk, ${VALID_OBJECT_ID.toUpperCase()}`,
    });

    expect(parsed.ids).toEqual([VALID_OBJECT_ID, VALID_OBJECT_ID.toUpperCase()]);
  });

  it("leaves ids undefined when none are supplied", () => {
    expect(parse(exportQuery, {}).ids).toBeUndefined();
  });
});