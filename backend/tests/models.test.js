// Schema-level tests for every model.
//
// The route suites prove the API answers correctly for the shapes they happen to
// send. What they cannot see is the schema itself: a `required` quietly dropped,
// an enum widened, an index renamed, a `select: false` removed from the password
// hash. Each of those is a one-word diff that no integration test fails on until
// the day it matters.

import {describe, it, expect, beforeAll} from "vitest";
import mongoose from "mongoose";

import {Admin, PASSWORD_HISTORY_LIMIT} from "../src/models/Admin.js";
import {Alumni} from "../src/models/Alumni.js";
import {Blog} from "../src/models/Blog.js";
import {ContentRevision, REVISION_LIMIT} from "../src/models/ContentRevision.js";
import {Faculty} from "../src/models/Faculty.js";
import {Faq} from "../src/models/Faq.js";
import {Job} from "../src/models/Job.js";
import {Lead, LEAD_TYPES, LEAD_STATUSES, MAX_ENROLLMENTS_PER_USER} from "../src/models/Lead.js";
import {Media} from "../src/models/Media.js";
import {Policy} from "../src/models/Policy.js";
import {Program} from "../src/models/Program.js";
import {RefreshToken} from "../src/models/RefreshToken.js";
import {AuditLog} from "../src/models/AuditLog.js";
import {CONTENT_STATUS, CONTENT_STATUSES, publishedFilter} from "../src/models/plugins/contentPlugin.js";
import {ROLES, ROLE_NAMES} from "../src/config/permissions.js";

// Every model that carries the content plugin, with the minimum a save needs.
const CONTENT_MODELS = [
  ["Program", Program, {title: "A Program"}, "title"],
  ["Blog", Blog, {title: "A Post"}, "title"],
  ["Alumni", Alumni, {name: "A Graduate"}, "name"],
  ["Faculty", Faculty, {name: "A Mentor"}, "name"],
  ["Faq", Faq, {question: "A question?", answer: "An answer."}, "question"],
  ["Job", Job, {title: "A Job"}, "title"],
  ["Policy", Policy, {title: "A Policy"}, "title"],
];

const ALL_MODELS = [
  Admin, Alumni, AuditLog, Blog, ContentRevision, Faculty, Faq, Job, Lead, Media,
  Policy, Program, RefreshToken,
];

// Unique and partial indexes are built asynchronously by Mongoose. Without this
// the duplicate-key assertions below would pass or fail on timing.
beforeAll(async () => {
  await Promise.all(ALL_MODELS.map((model) => model.init()));
}, 60_000);

const indexNames = (Model) => Model.schema.indexes().map(([keys]) => Object.keys(keys).join(","));

const hasIndexOn = (Model, ...fields) =>
  Model.schema.indexes().some(([keys]) => fields.every((field) => field in keys)) ||
  fields.every((field) => Model.schema.path(field)?.options?.index === true);

// ── The shared content lifecycle ────────────────────────────────────────────

describe.each(CONTENT_MODELS)("%s (content plugin)", (name, Model, minimal, slugSource) => {
  it("refuses to save without a slug — every content record has a public URL", async () => {
    await expect(new Model(minimal).save()).rejects.toThrow(/slug/i);
  });

  it("refuses to save without its own required field", async () => {
    await expect(new Model({slug: "x"}).save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it("lowercases and trims the slug, so /Programs/X and /programs/x are one record", async () => {
    const document = await Model.create({...minimal, slug: "  Mixed-Case-Slug  "});

    expect(document.slug).toBe("mixed-case-slug");
  });

  it("rejects a duplicate slug at the database, not just in application code", async () => {
    await Model.create({...minimal, slug: "taken"});

    await expect(Model.create({...minimal, slug: "taken"})).rejects.toThrow(/duplicate key/i);
  });

  it("caps the slug at 140 characters", async () => {
    await expect(Model.create({...minimal, slug: "a".repeat(141)})).rejects.toThrow(/slug/i);
  });

  it("starts as a draft, invisible and unpublished", async () => {
    const document = await Model.create({...minimal, slug: "fresh"});

    expect(document.status).toBe(CONTENT_STATUS.DRAFT);
    expect(document.publishedAt).toBeNull();
    expect(document.scheduledAt).toBeNull();
    expect(document.deletedAt).toBeNull();
    expect(document.revision).toBe(1);
    expect(document.featured).toBe(false);
    expect(document.isPublic).toBe(false);
  });

  it("refuses a status outside the shared vocabulary", async () => {
    await expect(
      Model.create({...minimal, slug: "bad-status", status: "live-ish"}),
    ).rejects.toThrow(/status/i);
  });

  it("declares its slug source and search fields for the content service to read", () => {
    expect(Model.slugSource).toBe(slugSource);
    expect(Array.isArray(Model.searchFields)).toBe(true);
  });

  it("indexes the public read path so a listing never sorts in memory", () => {
    expect(indexNames(Model)).toContain("deletedAt,status,displayOrder");
    expect(indexNames(Model)).toContain("deletedAt,status,publishedAt");
    expect(indexNames(Model)).toContain("status,scheduledAt");
  });

  it("serialises with virtuals and without the version key", async () => {
    const document = await Model.create({...minimal, slug: "serialised"});
    const json = document.toJSON();

    expect(json).toHaveProperty("isPublic");
    expect(json).toHaveProperty("id");
    expect(json).not.toHaveProperty("__v");
  });

  it("defaults its SEO block to an object rather than leaving it undefined", async () => {
    const document = await Model.create({...minimal, slug: "seo"});

    expect(document.seo.noIndex).toBe(false);
    expect(document.seo.keywords).toEqual([]);
  });

  it("caps rejectedReason so a reviewer cannot store an essay on the record", async () => {
    await expect(
      Model.create({...minimal, slug: "long-reason", rejectedReason: "x".repeat(501)}),
    ).rejects.toThrow(/rejectedReason/i);
  });
});

describe("isPublic virtual", () => {
  const publish = (extra) => new Program({title: "T", slug: "s", ...extra});

  it("is true for a published record with no date, which never had one set", () => {
    expect(publish({status: CONTENT_STATUS.PUBLISHED}).isPublic).toBe(true);
  });

  it("is true for a published record whose date has passed", () => {
    expect(publish({status: CONTENT_STATUS.PUBLISHED, publishedAt: new Date(Date.now() - 1000)}).isPublic).toBe(true);
  });

  it("is false for a published record dated in the future", () => {
    expect(publish({status: CONTENT_STATUS.PUBLISHED, publishedAt: new Date(Date.now() + 60_000)}).isPublic).toBe(false);
  });

  it("is true for a scheduled record whose time has arrived, without waiting for the sweep", () => {
    expect(publish({status: CONTENT_STATUS.SCHEDULED, scheduledAt: new Date(Date.now() - 1000)}).isPublic).toBe(true);
  });

  it("is false for a scheduled record still in the future", () => {
    expect(publish({status: CONTENT_STATUS.SCHEDULED, scheduledAt: new Date(Date.now() + 60_000)}).isPublic).toBe(false);
  });

  it("is false for a scheduled record with no date at all", () => {
    expect(publish({status: CONTENT_STATUS.SCHEDULED}).isPublic).toBe(false);
  });

  it("is false once deleted, whatever the status says", () => {
    expect(publish({status: CONTENT_STATUS.PUBLISHED, deletedAt: new Date()}).isPublic).toBe(false);
  });

  it.each([CONTENT_STATUS.DRAFT, CONTENT_STATUS.IN_REVIEW, CONTENT_STATUS.ARCHIVED])(
    "is false for %s",
    (status) => {
      expect(publish({status}).isPublic).toBe(false);
    },
  );
});

describe("publishedFilter", () => {
  it("always excludes deleted records", () => {
    expect(publishedFilter().deletedAt).toBeNull();
  });

  it("matches exactly the records isPublic calls public", async () => {
    const now = new Date();
    const past = new Date(now.getTime() - 60_000);
    const future = new Date(now.getTime() + 60_000);

    await Program.create([
      {title: "A", slug: "a", status: CONTENT_STATUS.PUBLISHED, publishedAt: past},
      {title: "B", slug: "b", status: CONTENT_STATUS.PUBLISHED, publishedAt: null},
      {title: "C", slug: "c", status: CONTENT_STATUS.PUBLISHED, publishedAt: future},
      {title: "D", slug: "d", status: CONTENT_STATUS.SCHEDULED, scheduledAt: past},
      {title: "E", slug: "e", status: CONTENT_STATUS.SCHEDULED, scheduledAt: future},
      {title: "F", slug: "f", status: CONTENT_STATUS.DRAFT},
      {title: "G", slug: "g", status: CONTENT_STATUS.PUBLISHED, publishedAt: past, deletedAt: new Date()},
    ]);

    const visible = await Program.find(publishedFilter(now)).select("slug").lean();

    expect(visible.map((entry) => entry.slug).sort()).toEqual(["a", "b", "d"]);
  });

  it("statuses list matches the frozen map, so the two cannot drift", () => {
    expect(CONTENT_STATUSES).toEqual(Object.values(CONTENT_STATUS));
    expect(Object.isFrozen(CONTENT_STATUS)).toBe(true);
  });
});

// ── Admin ───────────────────────────────────────────────────────────────────

const makeAdmin = (extra = {}) =>
  Admin.create({name: "Root", email: "root@careerveda.test", passwordHash: "argon2-hash", ...extra});

describe("Admin", () => {
  it("hides the password hash from a plain find — a stray query cannot leak it", async () => {
    await makeAdmin();

    const found = await Admin.findOne({email: "root@careerveda.test"});

    expect(found.passwordHash).toBeUndefined();
    expect((await Admin.findOne({}).select("+passwordHash")).passwordHash).toBe("argon2-hash");
  });

  it.each(["passwordHistory", "totpSecret"])("keeps %s out of a default read", (field) => {
    expect(Admin.schema.path(field).options.select).toBe(false);
  });

  it("strips every secret from toJSON, even when they were explicitly selected", async () => {
    await makeAdmin({totpSecret: "totp", passwordHistory: ["old"]});

    const found = await Admin.findOne({}).select("+passwordHash +passwordHistory +totpSecret");
    const json = found.toJSON();

    expect(json.passwordHash).toBeUndefined();
    expect(json.passwordHistory).toBeUndefined();
    expect(json.totpSecret).toBeUndefined();
    expect(json.__v).toBeUndefined();
    expect(json.email).toBe("root@careerveda.test");
  });

  it("lowercases the email, so Root@ and root@ cannot become two accounts", async () => {
    const admin = await makeAdmin({email: "  ROOT@Careerveda.test "});

    expect(admin.email).toBe("root@careerveda.test");
  });

  it("rejects a duplicate email at the database", async () => {
    await makeAdmin();

    await expect(makeAdmin()).rejects.toThrow(/duplicate key/i);
  });

  it("defaults a new account to the least privileged role", async () => {
    expect((await makeAdmin()).role).toBe(ROLES.VIEWER);
  });

  it("refuses a role outside the table", async () => {
    await expect(makeAdmin({role: "root"})).rejects.toThrow(/role/i);
    expect(ROLE_NAMES.length).toBeGreaterThan(0);
  });

  it("refuses a status outside active/suspended", async () => {
    await expect(makeAdmin({status: "deleted"})).rejects.toThrow(/status/i);
  });

  it("requires name, email and hash", async () => {
    const error = new Admin({}).validateSync();

    expect(Object.keys(error.errors).sort()).toEqual(["email", "name", "passwordHash"]);
  });

  describe("lockout", () => {
    it("reports an account unlocked when lockedUntil is null or in the past", async () => {
      const admin = await makeAdmin();

      expect(admin.isLocked()).toBe(false);
      admin.lockedUntil = new Date(Date.now() - 1000);
      expect(admin.isLocked()).toBe(false);
    });

    it("reports an account locked while the window is open", async () => {
      const admin = await makeAdmin({lockedUntil: new Date(Date.now() + 60_000)});

      expect(admin.isLocked()).toBe(true);
    });

    it("does not lock on the first few attempts — those are usually a real person", async () => {
      const admin = await makeAdmin();

      for (let attempt = 1; attempt <= 4; attempt += 1) {
        expect(await admin.registerFailedLogin()).toBeNull();
      }
      expect(admin.isLocked()).toBe(false);
      expect(admin.failedLoginAttempts).toBe(4);
    });

    it("escalates the penalty as the attempts pile up", async () => {
      const admin = await makeAdmin();
      const penalties = [];

      for (let attempt = 1; attempt <= 15; attempt += 1) {
        penalties.push(await admin.registerFailedLogin());
      }

      // 1-4 free, then 1 minute from the 5th, 5 from the 7th, 30 from the 10th,
      // 240 from the 15th.
      expect(penalties[4]).toBe(1);
      expect(penalties[6]).toBe(5);
      expect(penalties[9]).toBe(30);
      expect(penalties[14]).toBe(240);
      expect(admin.isLocked()).toBe(true);
    });

    it("clears the counter and the lock on a successful sign-in", async () => {
      const admin = await makeAdmin({failedLoginAttempts: 9, lockedUntil: new Date(Date.now() + 60_000)});

      await admin.registerSuccessfulLogin();

      expect(admin.failedLoginAttempts).toBe(0);
      expect(admin.lockedUntil).toBeNull();
      expect(admin.lastLoginAt).toBeInstanceOf(Date);
    });

    it("persists the failure, so restarting the process does not reset the count", async () => {
      const admin = await makeAdmin();
      await admin.registerFailedLogin();

      expect((await Admin.findById(admin._id)).failedLoginAttempts).toBe(1);
    });
  });

  describe("tokenVersion", () => {
    it("starts at zero", async () => {
      expect((await makeAdmin()).tokenVersion).toBe(0);
    });

    it("treats a matching version as current", async () => {
      const admin = await makeAdmin({tokenVersion: 3});

      expect(admin.tokenIsStale(3)).toBe(false);
    });

    it("treats any other version as stale, in both directions", async () => {
      const admin = await makeAdmin({tokenVersion: 3});

      expect(admin.tokenIsStale(2)).toBe(true);
      expect(admin.tokenIsStale(4)).toBe(true);
    });

    it("counts a token predating the field as version 0", async () => {
      const admin = await makeAdmin();

      expect(admin.tokenIsStale(undefined)).toBe(false);
      admin.tokenVersion = 1;
      expect(admin.tokenIsStale(undefined)).toBe(true);
    });
  });

  it("caps password history at a number, not an archive", () => {
    expect(PASSWORD_HISTORY_LIMIT).toBe(5);
  });

  it("indexes the admin list screen", () => {
    expect(indexNames(Admin)).toContain("status,role");
  });
});

// ── Blog ────────────────────────────────────────────────────────────────────

describe("Blog", () => {
  it("derives a read time from the body when the author did not set one", async () => {
    const blog = await Blog.create({
      title: "Long read",
      slug: "long-read",
      lead: "word ".repeat(220).trim(),
      sections: [{heading: "H", body: ["word ".repeat(220).trim()]}],
    });

    // ~440 words at 220 wpm.
    expect(blog.readTime).toBe("2 min read");
  });

  it("never claims zero minutes for a near-empty post", async () => {
    const blog = await Blog.create({title: "Short", slug: "short", lead: "Hi."});

    expect(blog.readTime).toBe("1 min read");
  });

  it("leaves a hand-written read time alone", async () => {
    const blog = await Blog.create({
      title: "Manual",
      slug: "manual",
      readTime: "45 min read",
      lead: "Two words",
    });

    expect(blog.readTime).toBe("45 min read");
  });

  it("defaults the author and the CTA so a post is never published headless", async () => {
    const blog = await Blog.create({title: "Defaults", slug: "defaults"});

    expect(blog.author).toBe("CareerVeda Team");
    expect(blog.cta.url).toBe("/programs");
    expect(blog.cta.label).toMatch(/CareerVeda/);
  });

  it("stores sections as structured blocks, which is why nothing here is HTML", async () => {
    const blog = await Blog.create({
      title: "Structured",
      slug: "structured",
      sections: [{heading: "Why", body: ["One.", "Two."]}],
    });

    expect(blog.sections[0].body).toEqual(["One.", "Two."]);
    // Value objects, not entities — an _id per paragraph block is noise.
    expect(blog.sections[0]._id).toBeUndefined();
  });
});

// ── Job ─────────────────────────────────────────────────────────────────────

describe("Job", () => {
  it("refuses a second listing with the same source and upstream id", async () => {
    const listing = {title: "Dev", slug: "dev", source: "linkedin", sourceJobId: "abc"};
    await Job.create(listing);

    await expect(Job.create({...listing, slug: "dev-2"})).rejects.toThrow(/duplicate key/i);
  });

  it("exempts hand-typed listings, which all carry a null upstream id", async () => {
    await Job.create({title: "Manual A", slug: "manual-a", source: "manual"});

    await expect(Job.create({title: "Manual B", slug: "manual-b", source: "manual"})).resolves.toBeTruthy();
  });

  it("allows two real openings that happen to share a dedupe key", async () => {
    await Job.create({title: "Dev", slug: "dev-a", dedupeKey: "dev|acme|pune"});

    await expect(Job.create({title: "Dev", slug: "dev-b", dedupeKey: "dev|acme|pune"})).resolves.toBeTruthy();
  });

  it("indexes the listing page's featured-then-newest sort", () => {
    expect(indexNames(Job)).toContain("deletedAt,status,featured,postedDate");
  });

  it("leaves sourceJobId null rather than empty, which is what makes the partial index work", async () => {
    const job = await Job.create({title: "Manual", slug: "manual", source: "manual"});

    expect(job.sourceJobId).toBeNull();
  });
});

// ── Lead ────────────────────────────────────────────────────────────────────

const makeLead = (extra = {}) =>
  Lead.create({
    type: "enrollment",
    name: "Asha",
    email: "asha@example.com",
    mobile: "+91 92178 01191",
    emailKey: "asha@example.com",
    mobileKey: "9217801191",
    ...extra,
  });

describe("Lead", () => {
  it("requires the identity fields and both lookup keys", () => {
    const error = new Lead({}).validateSync();

    expect(Object.keys(error.errors).sort()).toEqual(
      ["email", "emailKey", "mobile", "mobileKey", "name", "type"].sort(),
    );
  });

  it.each(LEAD_TYPES)("accepts the %s form type", async (type) => {
    await expect(makeLead({type})).resolves.toBeTruthy();
  });

  it("refuses a type outside the four forms", async () => {
    await expect(makeLead({type: "survey"})).rejects.toThrow(/type/i);
  });

  it("refuses a status outside the pipeline", async () => {
    await expect(makeLead({status: "maybe"})).rejects.toThrow(/status/i);
    expect(LEAD_STATUSES).toContain("new");
  });

  it("lands new, unarchived and unscored", async () => {
    const lead = await makeLead();

    expect(lead.status).toBe("new");
    expect(lead.archived).toBe(false);
    expect(lead.spamScore).toBe(0);
    expect(lead.consent).toBe(false);
  });

  it("keeps the spam score inside 0-100", async () => {
    await expect(makeLead({spamScore: 101})).rejects.toThrow(/spamScore/i);
    await expect(makeLead({spamScore: -1})).rejects.toThrow(/spamScore/i);
  });

  it("makes a retried submission idempotent at the database", async () => {
    await makeLead({idempotencyKey: "key-1"});

    await expect(makeLead({idempotencyKey: "key-1"})).rejects.toThrow(/duplicate key/i);
  });

  it("does not constrain submissions that supply no key", async () => {
    await makeLead();

    await expect(makeLead()).resolves.toBeTruthy();
  });

  it("timestamps a note without needing an author", async () => {
    const lead = await makeLead({notes: [{body: "Called, no answer."}]});

    expect(lead.notes[0].createdAt).toBeInstanceOf(Date);
    expect(lead.notes[0].author).toBeNull();
    // Notes are addressable — the panel deletes one by id.
    expect(lead.notes[0]._id).toBeTruthy();
  });

  it("requires a note to have a body", async () => {
    await expect(makeLead({notes: [{}]})).rejects.toThrow(/body/i);
  });

  it("indexes the inbox and the enrollment cap check", () => {
    const names = indexNames(Lead);

    expect(names).toContain("archived,createdAt");
    expect(names).toContain("type,status,createdAt");
    expect(names).toContain("emailKey,mobileKey");
  });

  it("allows a real applicant to correct one mistake before it counts as spam", () => {
    expect(MAX_ENROLLMENTS_PER_USER).toBe(2);
  });
});

// ── Media ───────────────────────────────────────────────────────────────────

const makeMedia = (extra = {}) =>
  Media.create({name: "Hero", fileName: "hero.jpg", url: "https://cdn/hero.jpg", fileId: "f1", ...extra});

describe("Media", () => {
  it("requires everything needed to render and to delete the remote object", () => {
    const error = new Media({}).validateSync();

    expect(Object.keys(error.errors).sort()).toEqual(["fileId", "fileName", "name", "url"]);
  });

  it("refuses to register the same remote file twice", async () => {
    await makeMedia();

    await expect(makeMedia({name: "Hero copy"})).rejects.toThrow(/duplicate key/i);
  });

  it("centres the focal point by default and keeps it inside the frame", async () => {
    const media = await makeMedia();

    expect(media.focalPoint.x).toBe(0.5);
    expect(media.focalPoint.y).toBe(0.5);
    await expect(makeMedia({fileId: "f2", focalPoint: {x: 1.2, y: 0.5}})).rejects.toThrow(/focalPoint/i);
    await expect(makeMedia({fileId: "f3", focalPoint: {x: -0.1, y: 0.5}})).rejects.toThrow(/focalPoint/i);
  });

  it("leaves dimensions null rather than zero, so a caller can tell 'unknown' from 'flat'", async () => {
    const media = await makeMedia();

    expect(media.width).toBeNull();
    expect(media.height).toBeNull();
  });

  it("treats an asset as manageable unless it is explicitly marked external", async () => {
    expect((await makeMedia()).external).toBe(false);
  });

  it("indexes the library screen and the reverse-lookup by hash", () => {
    expect(indexNames(Media)).toContain("deletedAt,createdAt");
    expect(Media.schema.path("contentHash").options.index).toBe(true);
  });
});

// ── RefreshToken ────────────────────────────────────────────────────────────

const makeToken = (extra = {}) =>
  RefreshToken.create({
    admin: new mongoose.Types.ObjectId(),
    tokenHash: "sha256-hash",
    family: "family-1",
    expiresAt: new Date(Date.now() + 60_000),
    ...extra,
  });

describe("RefreshToken", () => {
  it("requires the admin, the hash, the family and an expiry", () => {
    const error = new RefreshToken({}).validateSync();

    expect(Object.keys(error.errors).sort()).toEqual(["admin", "expiresAt", "family", "tokenHash"]);
  });

  it("counts a fresh, unused, unrevoked token as active", async () => {
    expect((await makeToken()).isActive()).toBe(true);
  });

  it("counts a used token as inactive — that is the reuse signal", async () => {
    expect((await makeToken({usedAt: new Date()})).isActive()).toBe(false);
  });

  it("counts a revoked token as inactive", async () => {
    expect((await makeToken({revokedAt: new Date()})).isActive()).toBe(false);
  });

  it("counts an expired token as inactive", async () => {
    expect((await makeToken({expiresAt: new Date(Date.now() - 1000)})).isActive()).toBe(false);
  });

  it("refuses to store the same hash twice", async () => {
    await makeToken();

    await expect(makeToken({family: "family-2"})).rejects.toThrow(/duplicate key/i);
  });

  it("refuses a revocation reason outside the known set", async () => {
    await expect(makeToken({revokedReason: "because"})).rejects.toThrow(/revokedReason/i);
  });

  it("expires rows automatically rather than growing without bound", () => {
    const ttl = RefreshToken.schema.indexes().find(([, options]) => options.expireAfterSeconds !== undefined);

    expect(ttl).toBeTruthy();
    expect(ttl[0]).toEqual({expiresAt: 1});
    expect(ttl[1].expireAfterSeconds).toBe(0);
  });

  it("indexes the family, so revoking a whole session chain is one query", () => {
    expect(indexNames(RefreshToken)).toContain("family,revokedAt");
  });
});

// ── ContentRevision ─────────────────────────────────────────────────────────

describe("ContentRevision", () => {
  it("requires the resource, the document, the number and the snapshot", () => {
    const error = new ContentRevision({}).validateSync();

    expect(Object.keys(error.errors).sort()).toEqual(["documentId", "resource", "revision", "snapshot"]);
  });

  it("stores the resource as a string, because one collection serves every type", async () => {
    const entry = await ContentRevision.create({
      resource: "programs",
      documentId: new mongoose.Types.ObjectId(),
      revision: 1,
      snapshot: {title: "Anything at all", nested: {deep: [1, 2]}},
    });

    expect(entry.snapshot.nested.deep).toEqual([1, 2]);
    expect(entry.updatedAt).toBeUndefined();
    expect(entry.createdAt).toBeInstanceOf(Date);
  });

  it("indexes newest-first history for one document, the only access pattern", () => {
    expect(indexNames(ContentRevision)).toContain("resource,documentId,revision");
  });

  it("caps history at a number that decays fast enough to be worth capping", () => {
    expect(REVISION_LIMIT).toBe(30);
  });
});

// ── AuditLog ────────────────────────────────────────────────────────────────

describe("AuditLog", () => {
  it("requires an action — a row that does not say what happened is not a trail", () => {
    expect(new AuditLog({}).validateSync().errors).toHaveProperty("action");
  });

  it("refuses an outcome outside success/failure", async () => {
    await expect(AuditLog.create({action: "x", outcome: "partial"})).rejects.toThrow(/outcome/i);
  });

  it("never records an updatedAt, because a row is never updated", async () => {
    const entry = await AuditLog.create({action: "auth.login.success"});

    expect(entry.updatedAt).toBeUndefined();
  });

  it("indexes newest-first, by actor and by action", () => {
    const names = indexNames(AuditLog);

    expect(names).toContain("createdAt");
    expect(names).toContain("actor,createdAt");
    expect(names).toContain("action,createdAt");
  });
});

// ── Shared subdocuments ─────────────────────────────────────────────────────

describe("shared subdocuments", () => {
  it("stores a media reference denormalised, so a card does not fan out nine lookups", async () => {
    const program = await Program.create({
      title: "P",
      slug: "p",
      image: {url: "https://cdn/x.jpg", alt: "X", width: 840, height: 630},
    });

    expect(program.image.url).toBe("https://cdn/x.jpg");
    expect(program.image.width).toBe(840);
    expect(program.image.media).toBeNull();
    expect(program.image._id).toBeUndefined();
  });

  it("requires both halves of an embedded FAQ, so a question never renders answerless", async () => {
    await expect(
      Program.create({title: "P", slug: "p-faq", faqs: [{question: "Why?"}]}),
    ).rejects.toThrow(/answer/i);
  });

  it("keeps a policy section's nested groups addressable by shape, not by id", async () => {
    const policy = await Policy.create({
      title: "Terms",
      slug: "terms",
      sections: [{id: "scope", heading: "Scope", body: ["A."], groups: [{title: "G", list: ["one"]}]}],
    });

    expect(policy.sections[0].groups[0].list).toEqual(["one"]);
    expect(policy.sections[0]._id).toBeUndefined();
  });

  it("defaults a policy's eyebrow and version so the page never renders a blank chip", async () => {
    const policy = await Policy.create({title: "Terms", slug: "terms-2"});

    expect(policy.eyebrow).toBe("Legal");
    expect(policy.version).toBe("1.0");
  });
});

// ── Resource-specific fields ────────────────────────────────────────────────

describe("Alumni", () => {
  it("keeps the alumni-page flag independent of the home-page one", async () => {
    const alumni = await Alumni.create({name: "A", slug: "a", showOnAlumniPage: true});

    expect(alumni.showOnAlumniPage).toBe(true);
    expect(alumni.featured).toBe(false);
    expect(Alumni.schema.path("showOnAlumniPage").options.index).toBe(true);
  });

  it("keeps salary figures as strings, because the source carries ranges and 'confidential'", async () => {
    const alumni = await Alumni.create({
      name: "B", slug: "b", salaryBefore: "confidential", salaryAfter: "₹18-22 LPA", percentageHike: "120%",
    });

    expect(alumni.salaryAfter).toBe("₹18-22 LPA");
  });

  it("keeps the program title alongside the reference, so a story survives a rename", async () => {
    const program = await Program.create({title: "PGP", slug: "pgp"});
    const alumni = await Alumni.create({name: "C", slug: "c", program: program._id, programTitle: "PGP"});

    await Program.updateOne({_id: program._id}, {$set: {title: "PGP (retired)"}});

    expect((await Alumni.findById(alumni._id)).programTitle).toBe("PGP");
  });
});

describe("Faculty", () => {
  it("allows a mentor with no photo, so a list can go live before the headshots arrive", async () => {
    const faculty = await Faculty.create({name: "M", slug: "m"});

    expect(faculty.photo.url).toBe("");
    expect(faculty.expertise).toEqual([]);
    expect(faculty.socialLinks.linkedin).toBe("");
  });

  it("indexes discipline, which is what the chip above the name filters on", () => {
    expect(Faculty.schema.path("discipline").options.index).toBe(true);
  });
});

describe("Faq", () => {
  it("requires both halves", () => {
    const error = new Faq({slug: "q"}).validateSync();

    expect(Object.keys(error.errors).sort()).toEqual(["answer", "question"]);
  });

  it("defaults to the General category the page groups under", async () => {
    expect((await Faq.create({question: "Q?", answer: "A.", slug: "q"})).category).toBe("General");
  });

  it("refuses a related entity type it could never resolve", async () => {
    await expect(
      Faq.create({question: "Q?", answer: "A.", slug: "q2", relatedEntityType: "Widget"}),
    ).rejects.toThrow(/relatedEntityType/i);
  });

  it("allows an unattached FAQ, which is the site-wide case", async () => {
    const faq = await Faq.create({question: "Q?", answer: "A.", slug: "q3"});

    expect(faq.relatedEntityType).toBeNull();
    expect(faq.relatedEntityId).toBeNull();
  });
});

describe("Program", () => {
  it("keeps prices as formatted strings rather than numbers to reformat on the way out", async () => {
    const program = await Program.create({
      title: "P", slug: "priced", startingPrice: "₹1,45,000", fee: {label: "Full", amount: "₹1,45,000"},
    });

    expect(program.startingPrice).toBe("₹1,45,000");
    expect(program.fee.amount).toBe("₹1,45,000");
  });

  it("leaves the fee null so an unpriced program drops the panel rather than rendering an empty one", async () => {
    expect((await Program.create({title: "P", slug: "unpriced"})).fee).toBeNull();
  });

  it("keeps module field names matching the static catalogue, so the page needs no mapping layer", async () => {
    const program = await Program.create({
      title: "P", slug: "modular", modules: [{n: 1, title: "Foundations", duration: "2 weeks", points: ["a"]}],
    });

    expect(program.modules[0].n).toBe(1);
    expect(program.modules[0].points).toEqual(["a"]);
  });

  it("indexes the category the explorer filters on", () => {
    expect(Program.schema.path("category").options.index).toBe(true);
  });
});

// ── Cross-cutting ───────────────────────────────────────────────────────────

describe("every model", () => {
  it("is registered exactly once, so a stray re-import cannot fork the schema", () => {
    const names = ALL_MODELS.map((model) => model.modelName);

    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(mongoose.models[name]).toBeTruthy();
  });

  it.each(ALL_MODELS.map((model) => [model.modelName, model]))(
    "%s records when it was created",
    (_name, Model) => {
      expect(Model.schema.path("createdAt")).toBeTruthy();
    },
  );

  it.each(CONTENT_MODELS.map(([name, Model]) => [name, Model]))(
    "%s records who touched it, for the audit trail to line up against",
    (_name, Model) => {
      expect(Model.schema.path("createdBy")).toBeTruthy();
      expect(Model.schema.path("updatedBy")).toBeTruthy();
      expect(Model.schema.path("deletedBy")).toBeTruthy();
    },
  );

  it.each(CONTENT_MODELS.map(([name, Model]) => [name, Model]))(
    "%s bounds every string field, so no single record can be unbounded",
    (_name, Model) => {
      const unbounded = [];

      Model.schema.eachPath((path, type) => {
        if (type.instance !== "String") return;
        if (path === "_id" || path === "__v") return;
        // enum-constrained fields are bounded by their vocabulary.
        if (type.options?.enum) return;
        if (type.options?.maxlength === undefined) unbounded.push(path);
      });

      expect(unbounded).toEqual([]);
    },
  );
});
