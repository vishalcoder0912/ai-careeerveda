import {describe, expect, it} from "@jest/globals";

import {RESOURCES, RESOURCE_NAMES} from "../../../src/config/resources.js";
import {PERMISSIONS} from "../../../src/config/permissions.js";

// resources.js is the registry that drives both the admin CRUD routes and the
// public read routes. The contract worth pinning down is the registry itself:
// every entry must carry a model, a Zod body, a full read/create/update/delete
// grant from the permission vocabulary, and the projection/sort every route
// relies on — a missing column fails loudly here instead of as a 500 on the
// first real request.

const VOCABULARY = Object.values(PERMISSIONS);

describe("RESOURCE_NAMES", () => {
  it("lists exactly the resources the routes serve", () => {
    expect(RESOURCE_NAMES).toEqual(["programs", "faculty", "alumni", "blogs", "jobs", "policies", "faqs"]);
  });

  it("mirrors the keys of RESOURCES, so the two cannot drift", () => {
    expect(RESOURCE_NAMES).toEqual(Object.keys(RESOURCES));
  });
});

describe("RESOURCES registry", () => {
  it("gives every resource a name, model, label, body schema and projection", () => {
    for (const name of RESOURCE_NAMES) {
      const resource = RESOURCES[name];

      expect(resource.name).toBe(name);
      expect(typeof resource.model).toBe("function");
      expect(typeof resource.body).toBe("object");
      expect(typeof resource.body.parse).toBe("function");
      expect(resource.label).toEqual(expect.any(String));
      expect(resource.publicProjection).toEqual(expect.any(String));
      expect(resource.defaultSort).toEqual({sort: expect.any(String), order: expect.any(String)});
    }
  });

  it("wires each resource to the Mongoose model of the same name", () => {
    const expected = {
      programs: "Program",
      faculty: "Faculty",
      alumni: "Alumni",
      blogs: "Blog",
      jobs: "Job",
      policies: "Policy",
      faqs: "Faq",
    };

    for (const [name, modelName] of Object.entries(expected)) {
      expect(RESOURCES[name].model.modelName).toBe(modelName);
    }
  });

  it("keeps every permission grant inside the vocabulary defined in permissions.js", () => {
    for (const name of RESOURCE_NAMES) {
      for (const verb of ["read", "create", "update", "delete"]) {
        expect(VOCABULARY).toContain(RESOURCES[name].permissions[verb]);
      }
    }
  });

  it("gives programs the granular read/create/update/delete grants", () => {
    expect(RESOURCES.programs.permissions).toEqual({
      read: PERMISSIONS.PROGRAMS_READ,
      create: PERMISSIONS.PROGRAMS_CREATE,
      update: PERMISSIONS.PROGRAMS_UPDATE,
      delete: PERMISSIONS.PROGRAMS_DELETE,
    });
  });

  it("gates each managed collection with a single *.manage grant for all four verbs", () => {
    const singleGrant = {
      faculty: PERMISSIONS.FACULTY_MANAGE,
      alumni: PERMISSIONS.ALUMNI_MANAGE,
      blogs: PERMISSIONS.BLOGS_MANAGE,
      jobs: PERMISSIONS.JOBS_MANAGE,
      policies: PERMISSIONS.POLICIES_MANAGE,
    };

    for (const [name, grant] of Object.entries(singleGrant)) {
      expect(RESOURCES[name].permissions).toEqual({read: grant, create: grant, update: grant, delete: grant});
    }
  });

  it("gates faqs by pages.manage, which is the grant the FAQ editor holds", () => {
    expect(RESOURCES.faqs.permissions).toEqual({
      read: PERMISSIONS.PAGES_MANAGE,
      create: PERMISSIONS.PAGES_MANAGE,
      update: PERMISSIONS.PAGES_MANAGE,
      delete: PERMISSIONS.PAGES_MANAGE,
    });
  });

  it("excludes every authorship and lifecycle field from the public projection", () => {
    for (const name of RESOURCE_NAMES) {
      const projection = RESOURCES[name].publicProjection;

      for (const field of ["-createdBy", "-updatedBy", "-deletedBy", "-deletedAt", "-revision", "-__v", "-nextBatchMode"]) {
        expect(projection).toContain(field);
      }
    }
  });

  it("hand-orders the curated collections by displayOrder", () => {
    for (const name of ["programs", "faculty", "alumni", "policies", "faqs"]) {
      expect(RESOURCES[name].defaultSort).toEqual({sort: "displayOrder", order: "asc"});
    }
  });

  it("lists the blogs and jobs newest-first publicly", () => {
    expect(RESOURCES.blogs.defaultSort).toEqual({sort: "publishedAt", order: "desc"});
    expect(RESOURCES.jobs.defaultSort).toEqual({sort: "publishedAt", order: "desc"});
  });

  it("sorts the admin list by updatedAt for blogs and jobs, so a fresh draft surfaces", () => {
    expect(RESOURCES.blogs.adminSort).toEqual({sort: "updatedAt", order: "desc"});
    expect(RESOURCES.jobs.adminSort).toEqual({sort: "updatedAt", order: "desc"});
  });

  it("reserves adminSort for exactly the resources that need it", () => {
    for (const name of ["programs", "faculty", "alumni", "policies", "faqs"]) {
      expect(RESOURCES[name].adminSort).toBeUndefined();
    }
  });

  it("marks blogs as code-authored, the one collection the admin panel does not serve", () => {
    expect(RESOURCES.blogs.codeAuthored).toBe(true);
    for (const name of RESOURCE_NAMES.filter((name) => name !== "blogs")) {
      expect(RESOURCES[name].codeAuthored).toBeUndefined();
    }
  });
});

describe("resource body schemas", () => {
  it("accepts the minimal document each content type requires", () => {
    expect(() => RESOURCES.programs.body.parse({title: "Data Analyst Program"})).not.toThrow();
    expect(() => RESOURCES.faculty.body.parse({name: "Dr. Anjali Rao"})).not.toThrow();
    expect(() => RESOURCES.alumni.body.parse({name: "Rahul Verma"})).not.toThrow();
    expect(() => RESOURCES.blogs.body.parse({title: "Why SQL still matters"})).not.toThrow();
    expect(() => RESOURCES.jobs.body.parse({title: "Senior Frontend Engineer"})).not.toThrow();
    expect(() => RESOURCES.policies.body.parse({title: "Refund Policy"})).not.toThrow();
    expect(() => RESOURCES.faqs.body.parse({question: "What?", answer: "This."})).not.toThrow();
  });

  it("refuses the same minimal body when the required field is missing", () => {
    expect(() => RESOURCES.programs.body.parse({})).toThrow();
    expect(() => RESOURCES.faculty.body.parse({})).toThrow();
    expect(() => RESOURCES.alumni.body.parse({})).toThrow();
    expect(() => RESOURCES.blogs.body.parse({})).toThrow();
    expect(() => RESOURCES.jobs.body.parse({})).toThrow();
    expect(() => RESOURCES.policies.body.parse({})).toThrow();
    expect(() => RESOURCES.faqs.body.parse({})).toThrow();
  });
});