import {describe, it, expect} from "vitest";
import request from "supertest";

import {createApp} from "../src/app.js";
import {Program} from "../src/models/Program.js";
import {Blog} from "../src/models/Blog.js";
import {Faculty} from "../src/models/Faculty.js";
import {Policy} from "../src/models/Policy.js";
import {ContentRevision} from "../src/models/ContentRevision.js";
import {AuditLog, AUDIT_ACTIONS} from "../src/models/AuditLog.js";
import {CONTENT_STATUS} from "../src/models/plugins/contentPlugin.js";
import {ROLES} from "../src/config/permissions.js";
import {createAdmin, login} from "./helpers/auth.js";

const app = createApp();

const asSuperAdmin = async () => {
  await createAdmin();
  const {accessToken} = await login(app);
  return accessToken;
};

// Everything config/publishRules.js requires before a program may go public.
// Most tests here publish what they create, so the default fixture has to be a
// program that is actually fit to publish — a minimal one is the subject of its
// own test below, not the baseline for every other one.
const PUBLISHABLE_PROGRAM = {
  title: "PG Program in Testing",
  category: "Product",
  subtitle: "Become a Tester",
  description: "A program about testing.",
  duration: "6 Months",
  mentorship: ["Expert Trainers"],
  format: "Live Online",
  image: {url: "https://example.com/program.jpg", alt: "Program"},
  overview: ["Overview point"],
  curriculum: ["Curriculum point"],
  outcomes: ["Outcome point"],
};

const makeProgram = (token, overrides = {}) =>
  request(app)
    .post("/api/v1/admin/programs")
    .set("Authorization", `Bearer ${token}`)
    .send({...PUBLISHABLE_PROGRAM, ...overrides});

// The public reader needs structured prose plus its final CTA. This fixture is
// what migrate-content.js writes for a post authored in src/data/blogPosts.js,
// so it proves the MongoDB -> public API shape BlogDetailPage consumes.
const PUBLISHABLE_BLOG = {
  title: "Code-authored blog post",
  slug: "code-authored-blog-post",
  category: "Product",
  tag: "Career guide",
  author: "CareerVeda Team",
  date: "July 2026",
  excerpt: "A post authored in the repo and rendered by the public site.",
  lead: "The opening paragraph for the reader.",
  sections: [{heading: "What changed", body: ["The body is stored in MongoDB."]}],
  highlights: ["Persisted key takeaway"],
  cta: {label: "Explore programs", url: "/programs"},
};

describe("content creation", () => {
  it("creates a record and derives a slug from the title", async () => {
    const token = await asSuperAdmin();
    const response = await makeProgram(token);

    expect(response.status).toBe(201);
    expect(response.body.data.slug).toBe("pg-program-in-testing");
    expect(response.body.data.revision).toBe(1);
  });

  it("never creates published, even when the payload says so", async () => {
    const token = await asSuperAdmin();
    const response = await makeProgram(token, {status: CONTENT_STATUS.PUBLISHED});

    // Publishing is a separate, separately-audited action.
    expect(response.body.data.status).toBe(CONTENT_STATUS.DRAFT);
  });

  it("refuses fields that are not in the schema (mass assignment)", async () => {
    const token = await asSuperAdmin();
    const response = await request(app)
      .post("/api/v1/admin/programs")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Injected",
        createdBy: "6a60580dc96e79d1ca43d058",
        revision: 999,
        deletedAt: new Date(),
      });

    expect(response.status).toBe(201);
    expect(response.body.data.revision).toBe(1);
    expect(response.body.data.deletedAt).toBeNull();
  });

  it("strips HTML from text fields", async () => {
    const token = await asSuperAdmin();
    const response = await makeProgram(token, {
      title: "Safe <script>alert(1)</script> Title",
      description: "<img src=x onerror=alert(1)>hello",
    });

    expect(response.body.data.title).not.toContain("<");
    expect(response.body.data.description).not.toContain("<");
    expect(response.body.data.description).toContain("hello");
  });

  it("rejects a javascript: image URL", async () => {
    const token = await asSuperAdmin();
    const response = await makeProgram(token, {
      image: {url: "javascript:alert(1)"},
    });

    expect(response.status).toBe(400);
  });

  it("makes a second record with the same title unique", async () => {
    const token = await asSuperAdmin();
    await makeProgram(token);
    const second = await makeProgram(token);

    expect(second.status).toBe(201);
    expect(second.body.data.slug).toBe("pg-program-in-testing-2");
  });
});

describe("publishing workflow", () => {
  // A program can be saved with almost nothing — a draft is a work in progress.
  // What it cannot do is reach a visitor in that state: the public page renders
  // its hero, its meta strip and its three tabs from these fields, so publishing
  // without them ships a heading over three empty lists.
  it("refuses to publish a record that is missing what its public page needs", async () => {
    const token = await asSuperAdmin();

    const created = await request(app)
      .post("/api/v1/admin/programs")
      .set("Authorization", `Bearer ${token}`)
      .send({title: "Half Written"});
    expect(created.status).toBe(201);

    const refused = await request(app)
      .post(`/api/v1/admin/programs/${created.body.data._id}/publish`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(refused.status).toBe(400);
    // The offending fields are named, so the panel can mark the inputs rather
    // than leaving an editor to hunt for what is missing.
    expect(Object.keys(refused.body.error.fields)).toEqual(
      expect.arrayContaining(["subtitle", "description", "duration", "overview"]),
    );

    // Refused means unchanged, not half-transitioned.
    const after = await Program.findById(created.body.data._id);
    expect(after.status).toBe(CONTENT_STATUS.DRAFT);
    expect(after.publishedAt).toBeNull();
    expect((await request(app).get("/api/v1/public/programs/half-written")).status).toBe(404);
  });

  // The bulk path is the obvious way round a single-record gate, so it enforces
  // the same bar — publishing the ready records and reporting the rest.
  it("skips records that are not publish-ready in a bulk publish", async () => {
    const token = await asSuperAdmin();

    const ready = await makeProgram(token, {title: "Ready Program"});
    const notReady = await request(app)
      .post("/api/v1/admin/programs")
      .set("Authorization", `Bearer ${token}`)
      .send({title: "Not Ready Program"});

    const result = await request(app)
      .post("/api/v1/admin/programs/bulk/status")
      .set("Authorization", `Bearer ${token}`)
      .send({ids: [ready.body.data._id, notReady.body.data._id], status: CONTENT_STATUS.PUBLISHED});

    expect(result.status).toBe(200);
    expect(result.body.data.modified).toBe(1);
    expect(result.body.data.blocked).toHaveLength(1);
    expect(result.body.data.blocked[0].title).toBe("Not Ready Program");

    expect((await Program.findById(ready.body.data._id)).status).toBe(CONTENT_STATUS.PUBLISHED);
    expect((await Program.findById(notReady.body.data._id)).status).toBe(CONTENT_STATUS.DRAFT);
  });

  it("publishes, appears publicly, then disappears when unpublished", async () => {
    const token = await asSuperAdmin();
    const {body} = await makeProgram(token);
    const id = body.data._id;

    // Draft is not public.
    const asDraft = await request(app).get("/api/v1/public/programs/pg-program-in-testing");
    expect(asDraft.status).toBe(404);

    const published = await request(app)
      .post(`/api/v1/admin/programs/${id}/publish`)
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect(published.status).toBe(200);
    expect(published.body.data.status).toBe(CONTENT_STATUS.PUBLISHED);

    const live = await request(app).get("/api/v1/public/programs/pg-program-in-testing");
    expect(live.status).toBe(200);
    expect(live.body.data.title).toBe("PG Program in Testing");

    await request(app)
      .post(`/api/v1/admin/programs/${id}/unpublish`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    const gone = await request(app).get("/api/v1/public/programs/pg-program-in-testing");
    expect(gone.status).toBe(404);
  });

  it("keeps the original publication date across a republish", async () => {
    const token = await asSuperAdmin();
    const {body} = await makeProgram(token);
    const id = body.data._id;

    const first = await request(app)
      .post(`/api/v1/admin/programs/${id}/publish`)
      .set("Authorization", `Bearer ${token}`)
      .send({});
    const originalDate = first.body.data.publishedAt;

    await request(app)
      .post(`/api/v1/admin/programs/${id}/unpublish`)
      .set("Authorization", `Bearer ${token}`)
      .send({});
    const second = await request(app)
      .post(`/api/v1/admin/programs/${id}/publish`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    // Otherwise fixing a typo would reshuffle the blog index.
    expect(second.body.data.publishedAt).toBe(originalDate);
  });

  it("refuses a scheduled date in the past", async () => {
    const token = await asSuperAdmin();
    const {body} = await makeProgram(token);

    const response = await request(app)
      .post(`/api/v1/admin/programs/${body.data._id}/publish`)
      .set("Authorization", `Bearer ${token}`)
      .send({scheduledAt: new Date(Date.now() - 60_000).toISOString()});

    expect(response.status).toBe(400);
  });

  it("treats a scheduled record whose time has passed as public, without the job running", async () => {
    const token = await asSuperAdmin();
    const {body} = await makeProgram(token);

    // Written directly, because the API refuses a past schedule date.
    await Program.updateOne(
      {_id: body.data._id},
      {$set: {status: CONTENT_STATUS.SCHEDULED, scheduledAt: new Date(Date.now() - 60_000)}},
    );

    const response = await request(app).get("/api/v1/public/programs/pg-program-in-testing");
    expect(response.status).toBe(200);
  });

  it("keeps a future-scheduled record private", async () => {
    const token = await asSuperAdmin();
    const {body} = await makeProgram(token);

    await request(app)
      .post(`/api/v1/admin/programs/${body.data._id}/publish`)
      .set("Authorization", `Bearer ${token}`)
      .send({scheduledAt: new Date(Date.now() + 3_600_000).toISOString()});

    const response = await request(app).get("/api/v1/public/programs/pg-program-in-testing");
    expect(response.status).toBe(404);
  });

  it("audits a publish", async () => {
    const token = await asSuperAdmin();
    const {body} = await makeProgram(token);

    await request(app)
      .post(`/api/v1/admin/programs/${body.data._id}/publish`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    const entry = await AuditLog.findOne({action: AUDIT_ACTIONS.CONTENT_PUBLISHED});
    expect(entry).not.toBeNull();
    expect(entry.targetType).toBe("programs");
  });
});

describe("blogs are authored in code, not the panel", () => {
  it("exposes no admin route for blogs, even to a super-admin holding blogs.manage", async () => {
    const token = await asSuperAdmin();
    const auth = (r) => r.set("Authorization", `Bearer ${token}`);

    // migrate-content.js writes through the model, which is the only way in.
    const post = await Blog.create({
      ...PUBLISHABLE_BLOG,
      status: CONTENT_STATUS.PUBLISHED,
      publishedAt: new Date(),
    });

    for (const call of [
      request(app).get("/api/v1/admin/blogs"),
      request(app).get(`/api/v1/admin/blogs/${post._id}`),
      request(app).post("/api/v1/admin/blogs").send(PUBLISHABLE_BLOG),
      request(app).patch(`/api/v1/admin/blogs/${post._id}`).send({revision: 1, excerpt: "edited"}),
      request(app).delete(`/api/v1/admin/blogs/${post._id}`),
      request(app).post(`/api/v1/admin/blogs/${post._id}/unpublish`).send({}),
      request(app).post(`/api/v1/admin/blogs/${post._id}/duplicate`).send({}),
      request(app).post("/api/v1/admin/blogs/bulk/delete").send({ids: [String(post._id)]}),
    ]) {
      expect((await auth(call)).status).toBe(404);
    }

    expect(await Blog.countDocuments()).toBe(1);
    const stored = await Blog.findById(post._id).lean();
    expect(stored.deletedAt).toBeNull();
    expect(stored.excerpt).toBe(PUBLISHABLE_BLOG.excerpt);
  });

  it("still serves the mirror publicly", async () => {
    await Blog.create({...PUBLISHABLE_BLOG, status: CONTENT_STATUS.PUBLISHED, publishedAt: new Date()});

    // The shape BlogDetailPage renders, straight out of MongoDB.
    const publicRead = await request(app).get(`/api/v1/public/blogs/${PUBLISHABLE_BLOG.slug}`);
    expect(publicRead.status).toBe(200);
    expect(publicRead.body.data).toMatchObject({
      title: PUBLISHABLE_BLOG.title,
      highlights: PUBLISHABLE_BLOG.highlights,
      cta: PUBLISHABLE_BLOG.cta,
    });
  });
});

describe("updates, revisions and concurrency", () => {
  it("updates and increments the revision", async () => {
    const token = await asSuperAdmin();
    const {body} = await makeProgram(token);

    const response = await request(app)
      .patch(`/api/v1/admin/programs/${body.data._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({title: "Renamed Program"});

    expect(response.status).toBe(200);
    expect(response.body.data.title).toBe("Renamed Program");
    expect(response.body.data.revision).toBe(2);
  });

  it("does not change the slug when the title changes", async () => {
    const token = await asSuperAdmin();
    const {body} = await makeProgram(token);

    const response = await request(app)
      .patch(`/api/v1/admin/programs/${body.data._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({title: "A Completely Different Name"});

    // Silently re-slugging would break every existing link to the page.
    expect(response.body.data.slug).toBe("pg-program-in-testing");
  });

  it("refuses a stale write (optimistic concurrency)", async () => {
    const token = await asSuperAdmin();
    const {body} = await makeProgram(token);
    const id = body.data._id;

    await request(app)
      .patch(`/api/v1/admin/programs/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({title: "First editor", revision: 1});

    const stale = await request(app)
      .patch(`/api/v1/admin/programs/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({title: "Second editor", revision: 1});

    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe("CONFLICT");
  });

  it("stores a revision snapshot and can roll back to it", async () => {
    const token = await asSuperAdmin();
    const {body} = await makeProgram(token, {description: "Original text"});
    const id = body.data._id;

    await request(app)
      .patch(`/api/v1/admin/programs/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({description: "Replacement text"});

    const revisions = await request(app)
      .get(`/api/v1/admin/programs/${id}/revisions`)
      .set("Authorization", `Bearer ${token}`);
    expect(revisions.body.data.length).toBeGreaterThan(0);

    const rolledBack = await request(app)
      .post(`/api/v1/admin/programs/${id}/rollback/1`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(rolledBack.status).toBe(200);
    expect(rolledBack.body.data.description).toBe("Original text");
  });

  it("does not restore publication state from a rollback", async () => {
    const token = await asSuperAdmin();
    const {body} = await makeProgram(token);
    const id = body.data._id;

    await request(app)
      .patch(`/api/v1/admin/programs/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({description: "edited"});
    await request(app)
      .post(`/api/v1/admin/programs/${id}/publish`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    const rolledBack = await request(app)
      .post(`/api/v1/admin/programs/${id}/rollback/1`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    // The snapshot was taken while it was a draft; rolling back content must
    // not take a live page offline.
    expect(rolledBack.body.data.status).toBe(CONTENT_STATUS.PUBLISHED);
  });
});

describe("soft delete, restore and purge", () => {
  it("soft-deletes, hides from lists, and restores as a draft", async () => {
    const token = await asSuperAdmin();
    const {body} = await makeProgram(token);
    const id = body.data._id;

    await request(app)
      .post(`/api/v1/admin/programs/${id}/publish`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    await request(app)
      .delete(`/api/v1/admin/programs/${id}`)
      .set("Authorization", `Bearer ${token}`);

    // Gone from the public site immediately.
    const publicView = await request(app).get("/api/v1/public/programs/pg-program-in-testing");
    expect(publicView.status).toBe(404);

    const list = await request(app)
      .get("/api/v1/admin/programs")
      .set("Authorization", `Bearer ${token}`);
    expect(list.body.data).toHaveLength(0);

    const restored = await request(app)
      .post(`/api/v1/admin/programs/${id}/restore`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    // A restore must not republish to the public site as a side effect.
    expect(restored.body.data.status).toBe(CONTENT_STATUS.DRAFT);
    expect(restored.body.data.deletedAt).toBeNull();
  });

  it("refuses to purge a record that has not been soft-deleted first", async () => {
    const token = await asSuperAdmin();
    const {body} = await makeProgram(token);

    const response = await request(app)
      .delete(`/api/v1/admin/programs/${body.data._id}/permanent`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
  });

  it("purges a soft-deleted record and its revisions", async () => {
    const token = await asSuperAdmin();
    const {body} = await makeProgram(token);
    const id = body.data._id;

    await request(app)
      .patch(`/api/v1/admin/programs/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({description: "creates a revision"});
    await request(app).delete(`/api/v1/admin/programs/${id}`).set("Authorization", `Bearer ${token}`);

    const response = await request(app)
      .delete(`/api/v1/admin/programs/${id}/permanent`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(await Program.countDocuments({_id: id})).toBe(0);
    expect(await ContentRevision.countDocuments({documentId: id})).toBe(0);
  });

  it("refuses a purge from an admin who is not a super-admin", async () => {
    await createAdmin();
    const superToken = (await login(app)).accessToken;
    const {body} = await makeProgram(superToken);
    await request(app)
      .delete(`/api/v1/admin/programs/${body.data._id}`)
      .set("Authorization", `Bearer ${superToken}`);

    await createAdmin({email: "admin@careerveda.test", role: ROLES.ADMIN});
    const adminToken = (await login(app, {email: "admin@careerveda.test"})).accessToken;

    const response = await request(app)
      .delete(`/api/v1/admin/programs/${body.data._id}/permanent`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(403);
    expect(await Program.countDocuments({_id: body.data._id})).toBe(1);
  });
});

describe("bulk operations, duplicate and reorder", () => {
  it("bulk-publishes", async () => {
    const token = await asSuperAdmin();
    const one = await makeProgram(token, {title: "Alpha"});
    const two = await makeProgram(token, {title: "Beta"});

    const response = await request(app)
      .post("/api/v1/admin/programs/bulk/status")
      .set("Authorization", `Bearer ${token}`)
      .send({ids: [one.body.data._id, two.body.data._id], status: CONTENT_STATUS.PUBLISHED});

    expect(response.body.data.modified).toBe(2);

    const list = await request(app).get("/api/v1/public/programs");
    expect(list.body.meta.total).toBe(2);
  });

  it("duplicates as an unpublished copy", async () => {
    const token = await asSuperAdmin();
    const {body} = await makeProgram(token);
    await request(app)
      .post(`/api/v1/admin/programs/${body.data._id}/publish`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    const copy = await request(app)
      .post(`/api/v1/admin/programs/${body.data._id}/duplicate`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(copy.status).toBe(201);
    expect(copy.body.data.status).toBe(CONTENT_STATUS.DRAFT);
    expect(copy.body.data.slug).not.toBe(body.data.slug);
    expect(copy.body.data.featured).toBe(false);
  });

  it("reorders in one request", async () => {
    const token = await asSuperAdmin();
    const one = await makeProgram(token, {title: "First"});
    const two = await makeProgram(token, {title: "Second"});

    const response = await request(app)
      .post("/api/v1/admin/programs/reorder")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [
          {id: one.body.data._id, displayOrder: 10},
          {id: two.body.data._id, displayOrder: 1},
        ],
      });

    expect(response.body.data.modified).toBe(2);

    const reordered = await Program.find().sort({displayOrder: 1}).lean();
    expect(reordered[0].title).toBe("Second");
  });
});

describe("public endpoint safety", () => {
  it("hides internal fields", async () => {
    const token = await asSuperAdmin();
    const {body} = await makeProgram(token);
    await request(app)
      .post(`/api/v1/admin/programs/${body.data._id}/publish`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    const response = await request(app).get("/api/v1/public/programs/pg-program-in-testing");
    const payload = JSON.stringify(response.body);

    for (const field of ["createdBy", "updatedBy", "deletedBy", "deletedAt", "revision"]) {
      expect(payload).not.toContain(`"${field}"`);
    }
  });

  it("ignores a status query parameter on the public listing", async () => {
    const token = await asSuperAdmin();
    await makeProgram(token); // stays a draft

    const response = await request(app).get("/api/v1/public/programs?status=draft");

    // Not 400 — the parameter is simply not part of the public schema and is
    // dropped, and the published filter still applies.
    expect(response.body.data).toHaveLength(0);
  });

  it("caps the page size", async () => {
    const response = await request(app).get("/api/v1/public/programs?limit=100000");

    expect(response.status).toBe(400);
  });

  it("does not let a search term act as a regex", async () => {
    const token = await asSuperAdmin();
    await makeProgram(token);

    // An unescaped ".*" would match everything; escaped, it matches nothing.
    const response = await request(app).get("/api/v1/public/programs?search=.*");

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(0);
  });

  it("returns 304 for a matching ETag", async () => {
    const first = await request(app).get("/api/v1/public/programs");
    const second = await request(app)
      .get("/api/v1/public/programs")
      .set("If-None-Match", first.headers.etag);

    expect(second.status).toBe(304);
  });
});

describe("authorization on content routes", () => {
  it("refuses every admin content route without a token", async () => {
    for (const resource of ["programs", "faculty", "alumni", "blogs", "jobs", "policies", "faqs"]) {
      const response = await request(app).get(`/api/v1/admin/${resource}`);
      expect(response.status).toBe(401);
    }
  });

  it("lets an editor create but not delete a program", async () => {
    await createAdmin({email: "editor@careerveda.test", role: ROLES.EDITOR});
    const token = (await login(app, {email: "editor@careerveda.test"})).accessToken;

    const created = await makeProgram(token);
    expect(created.status).toBe(201);

    const deleted = await request(app)
      .delete(`/api/v1/admin/programs/${created.body.data._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(deleted.status).toBe(403);
  });

  it("refuses a viewer any write", async () => {
    await createAdmin({email: "viewer@careerveda.test", role: ROLES.VIEWER});
    const token = (await login(app, {email: "viewer@careerveda.test"})).accessToken;

    const response = await makeProgram(token);
    expect(response.status).toBe(403);
  });
});

describe("every registered resource behaves the same way", () => {
  const cases = [
    ["faculty", {name: "Test Mentor", discipline: "Product", role: "PM at Example"}, Faculty],
    [
      "policies",
      {
        title: "Test Policy",
        lead: "What this policy covers.",
        updated: "20 February 2026",
        sections: [{heading: "1. Scope", body: ["This policy applies to everyone."]}],
      },
      Policy,
    ],
  ];

  for (const [resource, payload, Model] of cases) {
    it(`supports create → publish → public read for ${resource}`, async () => {
      const token = await asSuperAdmin();

      const created = await request(app)
        .post(`/api/v1/admin/${resource}`)
        .set("Authorization", `Bearer ${token}`)
        .send(payload);
      expect(created.status).toBe(201);

      const slug = created.body.data.slug;
      expect((await request(app).get(`/api/v1/public/${resource}/${slug}`)).status).toBe(404);

      await request(app)
        .post(`/api/v1/admin/${resource}/${created.body.data._id}/publish`)
        .set("Authorization", `Bearer ${token}`)
        .send({});

      const live = await request(app).get(`/api/v1/public/${resource}/${slug}`);
      expect(live.status).toBe(200);
      expect(await Model.countDocuments({slug})).toBe(1);
    });
  }
});

// ── Trash, ordering and the edit guard ──────────────────────────────────────
//
// The admin panel promised "you can restore it afterwards" while having no way
// to list a deleted record, and every new record was created at displayOrder 0
// so a hand-ordered collection tied on 0 and fell back to an arbitrary
// tiebreak. These cover both, plus the save that used to 404 on a record the
// editor could still open.

describe("trash and ordering", () => {
  it("lists only deleted records with ?deleted=true, and only live ones without", async () => {
    const token = await asSuperAdmin();

    const keep = await makeProgram(token, {title: "Stays put"});
    const bin = await makeProgram(token, {title: "Thrown away"});

    await request(app)
      .delete(`/api/v1/admin/programs/${bin.body.data._id}`)
      .set("Authorization", `Bearer ${token}`);

    const live = await request(app)
      .get("/api/v1/admin/programs")
      .set("Authorization", `Bearer ${token}`);
    expect(live.body.data.map((item) => item._id)).toEqual([keep.body.data._id]);

    const trash = await request(app)
      .get("/api/v1/admin/programs?deleted=true")
      .set("Authorization", `Bearer ${token}`);
    expect(trash.body.data.map((item) => item._id)).toEqual([bin.body.data._id]);
  });

  it("restores a deleted record as a draft", async () => {
    const token = await asSuperAdmin();
    const program = await makeProgram(token);
    const {_id} = program.body.data;

    await request(app).post(`/api/v1/admin/programs/${_id}/publish`).set("Authorization", `Bearer ${token}`).send({});
    await request(app).delete(`/api/v1/admin/programs/${_id}`).set("Authorization", `Bearer ${token}`);

    const restored = await request(app)
      .post(`/api/v1/admin/programs/${_id}/restore`)
      .set("Authorization", `Bearer ${token}`);

    expect(restored.status).toBe(200);
    expect(restored.body.data.deletedAt).toBeNull();
    // Never straight back to live — restoring must not republish as a side effect.
    expect(restored.body.data.status).toBe(CONTENT_STATUS.DRAFT);
  });

  // 1-based to line up with the public rail, which labels the first card "01".
  it("appends each new record to the end instead of piling them all on 0", async () => {
    const token = await asSuperAdmin();

    const first = await makeProgram(token, {title: "First"});
    const second = await makeProgram(token, {title: "Second"});
    const third = await makeProgram(token, {title: "Third"});

    expect(first.body.data.displayOrder).toBe(1);
    expect(second.body.data.displayOrder).toBe(2);
    expect(third.body.data.displayOrder).toBe(3);
  });

  it("renumbers a collection sequentially through the reorder endpoint", async () => {
    const token = await asSuperAdmin();

    const a = await makeProgram(token, {title: "A", displayOrder: 7});
    const b = await makeProgram(token, {title: "B", displayOrder: 7});
    const c = await makeProgram(token, {title: "C", displayOrder: 0});

    // What the panel's move buttons send: the whole visible page, renumbered.
    const reordered = await request(app)
      .post("/api/v1/admin/programs/reorder")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [
          {id: c.body.data._id, displayOrder: 1},
          {id: a.body.data._id, displayOrder: 2},
          {id: b.body.data._id, displayOrder: 3},
        ],
      });

    expect(reordered.status).toBe(200);
    expect(reordered.body.data.modified).toBe(3);

    const listed = await request(app)
      .get("/api/v1/admin/programs")
      .set("Authorization", `Bearer ${token}`);

    // The duplicate 7s are gone and the order is the one that was sent.
    expect(listed.body.data.map((item) => item.title)).toEqual(["C", "A", "B"]);
    expect(listed.body.data.map((item) => item.displayOrder)).toEqual([1, 2, 3]);
  });

  it("still honours an explicit displayOrder", async () => {
    const token = await asSuperAdmin();
    await makeProgram(token, {title: "First"});
    const pinned = await makeProgram(token, {title: "Pinned", displayOrder: 99});

    expect(pinned.body.data.displayOrder).toBe(99);
  });

  it("gives a duplicate its own place in the order", async () => {
    const token = await asSuperAdmin();
    const source = await makeProgram(token, {title: "Original", displayOrder: 3});

    const copy = await request(app)
      .post(`/api/v1/admin/programs/${source.body.data._id}/duplicate`)
      .set("Authorization", `Bearer ${token}`);

    expect(copy.status).toBe(201);
    expect(copy.body.data.displayOrder).not.toBe(3);
  });

  it("refuses to save a record that is in the trash, and says why", async () => {
    const token = await asSuperAdmin();
    const program = await makeProgram(token);
    const {_id, revision} = program.body.data;

    await request(app).delete(`/api/v1/admin/programs/${_id}`).set("Authorization", `Bearer ${token}`);

    const saved = await request(app)
      .patch(`/api/v1/admin/programs/${_id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({title: "Edited while deleted", revision});

    expect(saved.status).toBe(400);
    expect(saved.body.error.message).toMatch(/trash/i);
  });

  it("clears the rejection reason when a bulk publish goes through", async () => {
    const token = await asSuperAdmin();
    const program = await makeProgram(token);
    const {_id} = program.body.data;

    await request(app)
      .post(`/api/v1/admin/programs/${_id}/archive`)
      .set("Authorization", `Bearer ${token}`)
      .send({reason: "Duplicate"});

    await request(app)
      .post("/api/v1/admin/programs/bulk/status")
      .set("Authorization", `Bearer ${token}`)
      .send({ids: [_id], status: CONTENT_STATUS.PUBLISHED});

    const after = await Program.findById(_id);
    expect(after.status).toBe(CONTENT_STATUS.PUBLISHED);
    expect(after.rejectedReason).toBe("");
  });
});

// ── Saving a record straight back ───────────────────────────────────────────
//
// The panel loads a record, the author edits one field, and the whole record
// goes back. Every value in it therefore has to be something the API accepts —
// including the nulls Mongoose itself stored as defaults. It did not: .optional()
// rejects null, so an untouched hero image made the save fail with "Please check
// the highlighted fields" pointing at a field the author had never opened.

describe("editor round-trip", () => {
  const NULLABLE_FIELDS = [
    "heroMedia",
    "image",
    "seo",
    "fullTitle",
    "displayOrder",
    "mentorship",
    "gallery",
    "faqs",
    "modules",
    "startingPrice",
  ];

  it("accepts a null on any optional field as leaving it alone", async () => {
    const token = await asSuperAdmin();
    const program = await makeProgram(token);
    const {_id} = program.body.data;

    for (const field of NULLABLE_FIELDS) {
      const saved = await request(app)
        .patch(`/api/v1/admin/programs/${_id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({[field]: null});

      expect(saved.status, `${field}: ${JSON.stringify(saved.body.error)}`).toBe(200);
    }

    // Left alone, not blanked: the values the fixture set are still there.
    const after = await Program.findById(_id);
    expect(after.title).toBe(PUBLISHABLE_PROGRAM.title);
    expect(after.mentorship).toEqual(PUBLISHABLE_PROGRAM.mentorship);
    expect(after.image.url).toBe(PUBLISHABLE_PROGRAM.image.url);
  });

  it("still lets an empty object clear a media field", async () => {
    const token = await asSuperAdmin();
    const program = await makeProgram(token);

    // What the panel's "Remove" button sends — distinct from null, and it must
    // keep meaning "clear this".
    const cleared = await request(app)
      .patch(`/api/v1/admin/programs/${program.body.data._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({image: {}});

    expect(cleared.status).toBe(200);
    expect(cleared.body.data.image.url).toBe("");
  });

  it("saves an untouched record back exactly as it was loaded", async () => {
    const token = await asSuperAdmin();
    const program = await makeProgram(token);

    const loaded = await request(app)
      .get(`/api/v1/admin/programs/${program.body.data._id}`)
      .set("Authorization", `Bearer ${token}`);

    // The whole document back, nulls, _id, virtuals and all.
    const saved = await request(app)
      .patch(`/api/v1/admin/programs/${program.body.data._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({...loaded.body.data, revision: loaded.body.data.revision});

    expect(saved.status, JSON.stringify(saved.body.error)).toBe(200);
    expect(saved.body.data.title).toBe(PUBLISHABLE_PROGRAM.title);
  });
});

// ── Display order as a position ─────────────────────────────────────────────
//
// The number in the editor's "Display order" box is the position in the list,
// not an opaque sort key. Saving one moves the record there and renumbers the
// rest, so the stored values stay 1..n and the panel and the public rail count
// the same way.

describe("display order is a position", () => {
  const order = async (token) => {
    const listed = await request(app)
      .get("/api/v1/admin/programs?limit=100")
      .set("Authorization", `Bearer ${token}`);
    return listed.body.data.map((item) => `${item.title}:${item.displayOrder}`);
  };

  const seed = async (token) => {
    const made = [];
    for (const title of ["A", "B", "C", "D"]) {
      // eslint-disable-next-line no-await-in-loop
      made.push((await makeProgram(token, {title})).body.data);
    }
    return made;
  };

  it("moves a record to the position typed and pushes the rest down", async () => {
    const token = await asSuperAdmin();
    const [, , c] = await seed(token);
    expect(await order(token)).toEqual(["A:1", "B:2", "C:3", "D:4"]);

    // "Put C first."
    const saved = await request(app)
      .patch(`/api/v1/admin/programs/${c._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({displayOrder: 1, revision: c.revision});

    expect(saved.status).toBe(200);
    expect(saved.body.data.displayOrder).toBe(1);
    expect(await order(token)).toEqual(["C:1", "A:2", "B:3", "D:4"]);
  });

  it("leaves no gaps or duplicates behind", async () => {
    const token = await asSuperAdmin();
    const [a] = await seed(token);

    await request(app)
      .patch(`/api/v1/admin/programs/${a._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({displayOrder: 3, revision: a.revision});

    const values = (await order(token)).map((entry) => Number(entry.split(":")[1]));
    expect(values).toEqual([1, 2, 3, 4]);
  });

  it("pins a position past the end to last rather than refusing it", async () => {
    const token = await asSuperAdmin();
    const [a] = await seed(token);

    const saved = await request(app)
      .patch(`/api/v1/admin/programs/${a._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({displayOrder: 999, revision: a.revision});

    expect(saved.status).toBe(200);
    // Answers with where it landed, not with what was asked for.
    expect(saved.body.data.displayOrder).toBe(4);
    expect(await order(token)).toEqual(["B:1", "C:2", "D:3", "A:4"]);
  });

  it("does not renumber when the position was not part of the edit", async () => {
    const token = await asSuperAdmin();
    const [a] = await seed(token);

    await request(app)
      .patch(`/api/v1/admin/programs/${a._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({subtitle: "Just a text change", revision: a.revision});

    expect(await order(token)).toEqual(["A:1", "B:2", "C:3", "D:4"]);
  });
});

// The contract between the admin panel's "Site position" column and the order
// the public site renders. Everything above tests ordering through the *admin*
// list; nothing tested that the public listing honours it, and the public route
// is the only one a visitor ever sees.
//
// The gap that matters: buildSort falls back to `order: "desc"` when the caller
// sends nothing, and it is public.routes.js spreading `resource.defaultSort`
// that turns that into ascending. Drop that spread, or the defaultSort entry in
// resources.js, and every hand-ordered section on the site silently inverts —
// faculty 09 first — with no other test failing. Faculty is the subject because
// it is a pure display-order collection: no category rail, no featured flag, no
// publishedAt tiebreak to confuse what is being asserted.
describe("public listings honour the admin's site position", () => {
  const makeFaculty = (token, overrides = {}) =>
    request(app)
      .post("/api/v1/admin/faculty")
      .set("Authorization", `Bearer ${token}`)
      .send({name: "Mentor", discipline: "Product", role: "PM at Example", ...overrides});

  // Created deliberately out of order, so passing cannot mean "insertion order
  // happened to be right".
  const seedFaculty = async (token) => {
    const created = {};
    for (const [name, displayOrder] of [["Third", 3], ["First", 1], ["Fourth", 4], ["Second", 2]]) {
      const response = await makeFaculty(token, {name, displayOrder});
      expect(response.status).toBe(201);
      created[name] = response.body.data._id;

      await request(app)
        .post(`/api/v1/admin/faculty/${created[name]}/publish`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
    }
    return created;
  };

  const publicNames = async () => {
    const response = await request(app).get("/api/v1/public/faculty");
    expect(response.status).toBe(200);
    return response.body.data.map((entry) => entry.name);
  };

  it("returns published faculty in ascending site position, not creation order", async () => {
    const token = await asSuperAdmin();
    await seedFaculty(token);

    expect(await publicNames()).toEqual(["First", "Second", "Third", "Fourth"]);
  });

  it("keeps that order after the panel renumbers the collection", async () => {
    const token = await asSuperAdmin();
    const created = await seedFaculty(token);

    // Exactly what the move buttons send: the whole visible page, renumbered
    // 1..n, with two neighbours swapped.
    await request(app)
      .post("/api/v1/admin/faculty/reorder")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [
          {id: created.Second, displayOrder: 1},
          {id: created.First, displayOrder: 2},
          {id: created.Third, displayOrder: 3},
          {id: created.Fourth, displayOrder: 4},
        ],
      })
      .expect(200);

    expect(await publicNames()).toEqual(["Second", "First", "Third", "Fourth"]);
  });

  it("drops an unpublished member without disturbing the rest of the order", async () => {
    const token = await asSuperAdmin();
    const created = await seedFaculty(token);

    await request(app)
      .post(`/api/v1/admin/faculty/${created.Second}/unpublish`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(await publicNames()).toEqual(["First", "Third", "Fourth"]);
  });
});
