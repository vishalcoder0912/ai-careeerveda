import {describe, it, expect} from "vitest";
import request from "supertest";

import {createApp} from "../src/app.js";
import {env} from "../src/config/env.js";
import {Job} from "../src/models/Job.js";
import {JobApplication} from "../src/models/JobApplication.js";
import {ROLES} from "../src/config/permissions.js";
import {createAdmin, login} from "./helpers/auth.js";

const app = createApp();

const VALID = {name: "Asha Menon", mobile: "9217801191", email: "asha@example.com", consent: true};

const openJob = (overrides = {}) =>
  Job.create({
    title: "Data Analyst",
    slug: "data-analyst",
    company: "CareerVeda Partner",
    status: "published",
    publishedAt: new Date(),
    acceptsApplications: true,
    ...overrides,
  });

const apply = (payload = {}) =>
  request(app)
    .post("/api/v1/public/job-applications")
    .send({job: "data-analyst", ...VALID, ...payload});

describe("public job applications", () => {
  it("stores name, mobile and email against the job", async () => {
    const job = await openJob();
    const response = await apply();

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ok: true});

    const stored = await JobApplication.findOne({});
    expect(stored.job.equals(job._id)).toBe(true);
    expect(stored.jobTitle).toBe("Data Analyst");
    expect(stored.mobileKey).toBe("9217801191");
    expect(stored.email).toBe("asha@example.com");
    expect(stored.status).toBe("new");
    expect(stored.createdAt).toBeInstanceOf(Date);
  });

  it.each([
    ["is a draft", {status: "draft", publishedAt: null}],
    ["is past its deadline", {deadline: new Date(Date.now() - 60_000)}],
    ["is deleted", {deletedAt: new Date()}],
    ["does not accept applications", {acceptsApplications: false}],
  ])("refuses a job that %s", async (_, overrides) => {
    await openJob(overrides);
    const response = await apply();
    expect(response.status).toBe(400);
    expect(await JobApplication.countDocuments({})).toBe(0);
  });

  it("refuses an unknown job", async () => {
    expect((await apply({job: "no-such-job"})).status).toBe(400);
  });

  it.each([
    ["no consent", {consent: undefined}],
    ["a bad mobile", {mobile: "12345"}],
    ["a bad email", {email: "not-an-email"}],
    ["an empty name", {name: "   "}],
    ["a job that is not a slug", {job: {$ne: null}}],
  ])("rejects %s", async (_, overrides) => {
    await openJob();
    expect((await apply(overrides)).status).toBe(400);
    expect(await JobApplication.countDocuments({})).toBe(0);
  });

  it("rejects a second application for the same phone and job", async () => {
    await openJob();
    const first = await apply();
    const second = await apply({mobile: "+91 92178 01191", name: "Someone Else"});

    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("DUPLICATE_APPLICATION");
    expect(first.status).toBe(201);
    expect(await JobApplication.countDocuments({})).toBe(1);
  });

  it("still records one application when the unique index is missing", async () => {
    // Production runs Firestore, where indexes are created by a manual script.
    // The write path must stay idempotent even if that script was never run
    // (which is exactly how three rows for one submission appeared once).
    await openJob();
    await JobApplication.init();
    const indexes = await JobApplication.collection.indexes();
    const unique = indexes.find((index) => index.key?.job === 1 && index.key?.mobileKey === 1);
    expect(unique).toBeTruthy();
    await JobApplication.collection.dropIndex(unique.name);

    try {
      expect((await apply()).status).toBe(201);
      expect((await apply({name: "Someone Else"})).status).toBe(409);
      expect((await apply({mobile: "+91 92178 01191"})).status).toBe(409);
      expect(await JobApplication.countDocuments({})).toBe(1);
    } finally {
      await JobApplication.collection.createIndex({job: 1, mobileKey: 1}, {unique: true});
    }
  });

  it("lets the same person apply to a different job", async () => {
    await openJob();
    await openJob({title: "BI Developer", slug: "bi-developer"});

    await apply();
    expect((await apply({job: "bi-developer"})).status).toBe(201);
    expect(await JobApplication.countDocuments({})).toBe(2);
  });

  it("stores nothing for a bot that fills the honeypot", async () => {
    await openJob();
    expect((await apply({company: "Spam Inc"})).status).toBe(201);
    expect(await JobApplication.countDocuments({})).toBe(0);
  });

  it("keeps its own hourly budget instead of spending the lead form's", async () => {
    await openJob();
    const realIsTest = env.isTest;
    env.isTest = false;

    try {
      // Exhaust the lead form's five-per-hour budget...
      for (let i = 0; i < 5; i += 1) {
        const lead = await request(app)
          .post("/api/v1/public/leads")
          .send({name: "Lead Check", email: `lead${i}@example.com`, mobile: `98765432${10 + i}`, consent: true});
        expect(lead.status).toBe(201);
      }
      expect(
        (
          await request(app)
            .post("/api/v1/public/leads")
            .send({name: "Lead Check", email: "lead-blocked@example.com", mobile: "9876543215", consent: true})
        ).status,
      ).toBe(429);

      // ...and the job form still accepts: the two forms no longer share a key.
      expect((await apply({mobile: "9217801199"})).status).toBe(201);
      expect(await JobApplication.countDocuments({})).toBe(1);
    } finally {
      env.isTest = realIsTest;
    }
  });

  // Finding 2: a bare ImageKit file id is no longer enough to attach a file to
  // an application; the signed upload token from upload-auth is required.
  it("refuses a resume file id without the signed upload token", async () => {
    await openJob();
    const response = await apply({resumeFileId: "file_from_someone_else"});

    expect(response.status).toBe(400);
    expect(response.body.error.fields.resume).toMatch(/upload your resume again/i);
  });

  it("refuses a forged resume upload token", async () => {
    await openJob();
    const response = await apply({
      resumeFileId: "file_from_someone_else",
      resumeUploadToken: "forged.token",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.fields.resume).toMatch(/upload has expired/i);
  });
});

describe("resume upload route", () => {
  const authFor = () =>
    request(app)
      .post("/api/v1/public/job-applications/data-analyst/resume-upload-auth")
      .send({});

  it("issues an opaque folder token and no ImageKit credentials", async () => {
    await openJob();
    const response = await authFor();

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({jobSlug: "data-analyst", uploadToken: expect.any(String)});
    for (const key of ["token", "signature", "publicKey", "privateKey", "expire"]) {
      expect(response.body.data).not.toHaveProperty(key);
    }
  });

  it("refuses an upload with no file", async () => {
    await openJob();
    const auth = await authFor();
    const response = await request(app)
      .post("/api/v1/public/job-applications/data-analyst/resume")
      .field("uploadToken", auth.body.data.uploadToken);

    expect(response.status).toBe(400);
    expect(response.body.error.fields.resume).toMatch(/choose a resume/i);
  });

  it("refuses an upload with no signed token", async () => {
    await openJob();
    const response = await request(app)
      .post("/api/v1/public/job-applications/data-analyst/resume")
      .attach("resume", Buffer.from("%PDF-1.4\nreal resume"), "resume.pdf");

    expect(response.status).toBe(400);
  });
});

describe("admin job applications", () => {
  const asRole = async (role) => {
    await createAdmin({email: `${role}@careerveda.test`, role});
    return (await login(app, {email: `${role}@careerveda.test`})).accessToken;
  };

  it("lists applications to a signed-in admin, without internal fields", async () => {
    await openJob();
    await apply();
    const token = await asRole(ROLES.ADMIN);

    const response = await request(app).get("/api/v1/admin/job-applications").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      name: "Asha Menon",
      email: "asha@example.com",
      jobTitle: "Data Analyst",
    });
    expect(response.body.data[0].ipHash).toBeUndefined();
  });

  it("refuses the list without a token", async () => {
    expect((await request(app).get("/api/v1/admin/job-applications")).status).toBe(401);
  });

  it("lets an admin change status, but not a viewer", async () => {
    await openJob();
    await apply();
    const {_id} = await JobApplication.findOne({}).lean();

    const viewer = await asRole(ROLES.VIEWER);
    const denied = await request(app)
      .patch(`/api/v1/admin/job-applications/${_id}`)
      .set("Authorization", `Bearer ${viewer}`)
      .send({status: "shortlisted"});
    expect(denied.status).toBe(403);

    const admin = await asRole(ROLES.ADMIN);
    const allowed = await request(app)
      .patch(`/api/v1/admin/job-applications/${_id}`)
      .set("Authorization", `Bearer ${admin}`)
      .send({status: "shortlisted"});
    expect(allowed.status).toBe(200);
    expect((await JobApplication.findById(_id)).status).toBe("shortlisted");
  });

  it("exports CSV with formula cells neutralised", async () => {
    await openJob();
    await apply({name: "=HYPERLINK(\"http://evil\")"});
    const token = await asRole(ROLES.ADMIN);

    const response = await request(app)
      .get("/api/v1/admin/job-applications/export")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/csv");
    expect(response.text).not.toMatch(/,=HYPERLINK/);
  });

  // Finding 3: a stored resumeUrl is data, not a redirect target. A legacy row
  // holding an attacker-controlled URL must not turn "View resume" into an open
  // redirect, while a genuine ImageKit URL still works.
  it("does not redirect to an arbitrary stored resume URL", async () => {
    await openJob();
    await apply();
    const stored = await JobApplication.findOne({});
    await JobApplication.updateOne(
      {_id: stored._id},
      {$set: {resumeUrl: "https://evil.example/phish"}},
    );
    const token = await asRole(ROLES.ADMIN);

    const response = await request(app)
      .get(`/api/v1/admin/job-applications/${stored._id}/resume`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.headers.location).toBeUndefined();
  });

  it("redirects to a genuine ImageKit resume URL", async () => {
    await openJob();
    await apply();
    const stored = await JobApplication.findOne({});
    const resumeUrl = "https://ik.imagekit.io/careerveda/resumes/data-analyst/file.pdf";
    await JobApplication.updateOne({_id: stored._id}, {$set: {resumeUrl}});
    const token = await asRole(ROLES.ADMIN);

    const response = await request(app)
      .get(`/api/v1/admin/job-applications/${stored._id}/resume`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(resumeUrl);
  });

  // The admin panel asks for ?format=json so fetch() does not follow a
  // cross-origin redirect. It must still hand back only trusted ImageKit URLs.
  it("returns the resume URL as JSON when format=json is requested", async () => {
    await openJob();
    await apply();
    const stored = await JobApplication.findOne({});
    const resumeUrl = "https://ik.imagekit.io/careerveda/resumes/data-analyst/file.pdf";
    await JobApplication.updateOne({_id: stored._id}, {$set: {resumeUrl}});
    const token = await asRole(ROLES.ADMIN);

    const response = await request(app)
      .get(`/api/v1/admin/job-applications/${stored._id}/resume`)
      .query({format: "json"})
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.headers.location).toBeUndefined();
    expect(response.body.success).toBe(true);
    expect(response.body.data.url).toBe(resumeUrl);
  });

  it("does not return an arbitrary stored resume URL as JSON", async () => {
    await openJob();
    await apply();
    const stored = await JobApplication.findOne({});
    await JobApplication.updateOne(
      {_id: stored._id},
      {$set: {resumeUrl: "https://evil.example/phish"}},
    );
    const token = await asRole(ROLES.ADMIN);

    const response = await request(app)
      .get(`/api/v1/admin/job-applications/${stored._id}/resume`)
      .query({format: "json"})
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body.data?.url).toBeUndefined();
  });
});
