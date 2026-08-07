// content.service.js at the unit level.
//
// Every content route in the app funnels through these functions, and until now
// they were exercised only through HTTP — so a broken publish rule, a lost
// revision or a resequence that renumbers the wrong record showed up as a failing
// route test with no indication which of the sixteen functions was at fault.
// These call them directly, against real models, so a failure names the defect.

import {describe, it, expect, beforeEach} from "vitest";
import mongoose from "mongoose";

import * as content from "../src/services/content.service.js";
import {Program} from "../src/models/Program.js";
import {Faq} from "../src/models/Faq.js";
import {Blog} from "../src/models/Blog.js";
// Registered so listRevisions can populate changedBy — without the import the
// populate throws MissingSchemaError rather than returning an unresolved ref.
import "../src/models/Admin.js";
import {ContentRevision, REVISION_LIMIT} from "../src/models/ContentRevision.js";
import {CONTENT_STATUS} from "../src/models/plugins/contentPlugin.js";

const actor = {_id: new mongoose.Types.ObjectId(), email: "editor@careerveda.test", role: "editor"};
const other = {_id: new mongoose.Types.ObjectId(), email: "other@careerveda.test", role: "admin"};

// Everything config/publishRules.js demands of a Program, so publishing is
// allowed and a test about something else is not blocked by a missing subtitle.
const publishable = (overrides = {}) => ({
  title: "Publishable Program",
  subtitle: "A subtitle",
  category: "Product",
  description: "A description.",
  duration: "6 Months",
  mentorship: ["Expert Trainers"],
  format: "Live Online",
  image: {url: "https://cdn/x.jpg"},
  overview: ["Overview point"],
  curriculum: ["Curriculum point"],
  outcomes: ["Outcome point"],
  ...overrides,
});

const createFaq = (overrides = {}) =>
  content.createContent(Faq, {question: "Why?", answer: "Because.", ...overrides}, {actor});

const slugsOf = (items) => items.map((item) => item.slug);

// ── buildSort ───────────────────────────────────────────────────────────────

describe("buildSort", () => {
  it("sorts by the requested field", () => {
    expect(content.buildSort("title", "asc")).toEqual({title: 1, _id: -1});
  });

  it("defaults to descending", () => {
    expect(content.buildSort("title")).toEqual({title: -1, _id: -1});
  });

  it("falls back to displayOrder for an unlisted field, so no request forces a collection scan", () => {
    expect(content.buildSort("secretUnindexedField", "asc")).toEqual({displayOrder: 1, _id: -1});
    expect(content.buildSort(undefined)).toEqual({displayOrder: -1, _id: -1});
  });

  it("always breaks ties on _id, so pagination cannot show a record twice", () => {
    for (const field of ["createdAt", "updatedAt", "publishedAt", "displayOrder", "title", "name", "status", "featured"]) {
      expect(content.buildSort(field)._id).toBe(-1);
    }
  });

  it("treats anything that is not 'asc' as descending", () => {
    expect(content.buildSort("title", "ASC").title).toBe(-1);
    expect(content.buildSort("title", "nonsense").title).toBe(-1);
  });
});

// ── mergeSort ───────────────────────────────────────────────────────────────

describe("mergeSort", () => {
  it("keeps the resource default when the query says nothing", () => {
    expect(content.mergeSort({sort: "displayOrder", order: "asc"}, {})).toEqual({
      sort: "displayOrder",
      order: "asc",
    });
  });

  it("does NOT let an absent query parameter overwrite the default with undefined", () => {
    // The bug this function exists for: a plain spread made every request carry
    // an implicit order:"desc" and rendered the hand-ordered catalog backwards.
    expect(content.mergeSort({sort: "displayOrder", order: "asc"}, {sort: undefined, order: undefined})).toEqual({
      sort: "displayOrder",
      order: "asc",
    });
  });

  it("lets an explicit query parameter win", () => {
    expect(content.mergeSort({sort: "displayOrder", order: "asc"}, {order: "desc"})).toEqual({
      sort: "displayOrder",
      order: "desc",
    });
  });

  it("copes with both arguments missing", () => {
    expect(content.mergeSort()).toEqual({sort: undefined, order: undefined});
  });
});

// ── listContent ─────────────────────────────────────────────────────────────

describe("listContent", () => {
  beforeEach(async () => {
    await Program.create([
      {title: "Alpha", slug: "alpha", displayOrder: 1, category: "Product", status: CONTENT_STATUS.PUBLISHED},
      {title: "Beta", slug: "beta", displayOrder: 2, category: "Data", status: CONTENT_STATUS.DRAFT, featured: true},
      {title: "Gamma", slug: "gamma", displayOrder: 3, category: "Product", status: CONTENT_STATUS.DRAFT},
      {title: "Deleted", slug: "deleted", displayOrder: 4, deletedAt: new Date()},
    ]);
  });

  it("hides soft-deleted records by default — the filter nobody can forget", async () => {
    const {items, total} = await content.listContent(Program);

    expect(slugsOf(items).sort()).toEqual(["alpha", "beta", "gamma"]);
    expect(total).toBe(3);
  });

  it("serves the trash when asked, and only the trash", async () => {
    const {items} = await content.listContent(Program, {deleted: true});

    expect(slugsOf(items)).toEqual(["deleted"]);
  });

  it("serves everything when includeDeleted is set", async () => {
    expect((await content.listContent(Program, {includeDeleted: true})).total).toBe(4);
  });

  it("filters by status, category and featured", async () => {
    expect(slugsOf((await content.listContent(Program, {status: CONTENT_STATUS.PUBLISHED})).items)).toEqual(["alpha"]);
    expect((await content.listContent(Program, {category: "Product"})).total).toBe(2);
    expect(slugsOf((await content.listContent(Program, {featured: true})).items)).toEqual(["beta"]);
  });

  it("ignores a featured filter that is not a boolean, rather than matching nothing", async () => {
    expect((await content.listContent(Program, {featured: "true"})).total).toBe(3);
  });

  it("searches the model's declared fields with a prefix match", async () => {
    const {items} = await content.listContent(Program, {search: "alp"});

    expect(slugsOf(items)).toEqual(["alpha"]);
  });

  it("treats the search term as text, not as a pattern", async () => {
    // Unescaped, ".*" would match every record. escapeRegex is the whole point.
    expect((await content.listContent(Program, {search: ".*"})).total).toBe(0);
    expect((await content.listContent(Program, {search: "Alpha|Beta"})).total).toBe(0);
  });

  it("returns nothing rather than everything for a model with no searchable fields", async () => {
    // Model.searchFields is [] — an $or of zero clauses is invalid, so the
    // clause must be omitted entirely, not built empty.
    const {items} = await content.listContent(Program, {search: "alpha", extra: {}});

    expect(items).toHaveLength(1);
  });

  it("paginates, and reports the unpaginated total", async () => {
    const page = await content.listContent(Program, {limit: 2, page: 1, sort: "displayOrder", order: "asc"});

    expect(slugsOf(page.items)).toEqual(["alpha", "beta"]);
    expect(page.total).toBe(3);
    expect(page.limit).toBe(2);

    const second = await content.listContent(Program, {limit: 2, page: 2, sort: "displayOrder", order: "asc"});
    expect(slugsOf(second.items)).toEqual(["gamma"]);
  });

  it("caps the page size, so ?limit=100000 cannot pull a whole collection", async () => {
    expect((await content.listContent(Program, {limit: 100_000})).limit).toBe(100);
  });

  it("floors a nonsensical page size and page number at 1", async () => {
    expect((await content.listContent(Program, {limit: 0})).limit).toBe(20);
    expect((await content.listContent(Program, {limit: -5})).limit).toBe(1);
    expect((await content.listContent(Program, {page: 0})).page).toBe(1);
    expect((await content.listContent(Program, {page: -3})).page).toBe(1);
  });

  it("survives a non-numeric limit and page", async () => {
    const result = await content.listContent(Program, {limit: "abc", page: "xyz"});

    expect(result.limit).toBe(20);
    expect(result.page).toBe(1);
  });

  it("returns lean objects, not hydrated documents — this is the hottest read path", async () => {
    const {items} = await content.listContent(Program);

    expect(items[0].save).toBeUndefined();
    expect(items[0].slug).toBeTruthy();
  });

  it("does NOT carry the isPublic virtual, despite the lean({virtuals}) option", async () => {
    // Stock Mongoose ignores `virtuals` on lean() — it needs the
    // mongoose-lean-virtuals plugin. Nothing reads isPublic off a list today, so
    // the option is dead rather than broken; this test is here so that if a
    // caller ever starts relying on it, the reason it is undefined is already
    // written down instead of being rediscovered from a blank column.
    const {items} = await content.listContent(Program);

    expect(items[0].isPublic).toBeUndefined();
  });

  it("honours a projection", async () => {
    const {items} = await content.listContent(Program, {projection: "slug"});

    expect(items[0].title).toBeUndefined();
    expect(items[0].slug).toBeTruthy();
  });

  it("merges an extra filter on top of everything else", async () => {
    const {items} = await content.listContent(Program, {extra: {category: "Data"}});

    expect(slugsOf(items)).toEqual(["beta"]);
  });
});

// ── listPublic ──────────────────────────────────────────────────────────────

describe("listPublic", () => {
  beforeEach(async () => {
    await Program.create([
      {title: "Live", slug: "live", status: CONTENT_STATUS.PUBLISHED, publishedAt: new Date(Date.now() - 1000)},
      {title: "Draft", slug: "draft", status: CONTENT_STATUS.DRAFT},
      {title: "Due", slug: "due", status: CONTENT_STATUS.SCHEDULED, scheduledAt: new Date(Date.now() - 1000)},
      {title: "Pending", slug: "pending", status: CONTENT_STATUS.SCHEDULED, scheduledAt: new Date(Date.now() + 60_000)},
      {title: "Binned", slug: "binned", status: CONTENT_STATUS.PUBLISHED, deletedAt: new Date()},
    ]);
  });

  it("serves published and due-scheduled records only", async () => {
    const {items} = await content.listPublic(Program);

    expect(slugsOf(items).sort()).toEqual(["due", "live"]);
  });

  it("cannot be talked into serving drafts with ?status=draft", async () => {
    const {items} = await content.listPublic(Program, {status: CONTENT_STATUS.DRAFT});

    expect(slugsOf(items).sort()).toEqual(["due", "live"]);
  });

  it("cannot be talked into serving the trash with ?deleted=true", async () => {
    const {items} = await content.listPublic(Program, {deleted: true});

    expect(slugsOf(items)).not.toContain("binned");
  });

  it("cannot be talked into including deleted records", async () => {
    const {items} = await content.listPublic(Program, {includeDeleted: true});

    expect(slugsOf(items)).not.toContain("binned");
  });

  it("still applies a caller's own extra filter alongside the published one", async () => {
    const {items} = await content.listPublic(Program, {extra: {slug: "live"}});

    expect(slugsOf(items)).toEqual(["live"]);
  });
});

// ── findBySlug / findById ───────────────────────────────────────────────────

describe("findBySlug", () => {
  it("finds a draft for the panel", async () => {
    await Program.create({title: "T", slug: "t"});

    expect((await content.findBySlug(Program, "t")).title).toBe("T");
  });

  it("refuses a deleted record even to the panel", async () => {
    await Program.create({title: "T", slug: "t", deletedAt: new Date()});

    await expect(content.findBySlug(Program, "t")).rejects.toMatchObject({status: 404});
  });

  it("refuses an unpublished record on the public path", async () => {
    await Program.create({title: "T", slug: "t"});

    await expect(content.findBySlug(Program, "t", {publicOnly: true})).rejects.toMatchObject({status: 404});
  });

  it("serves a published record on the public path", async () => {
    await Program.create({title: "T", slug: "t", status: CONTENT_STATUS.PUBLISHED, publishedAt: new Date()});

    expect((await content.findBySlug(Program, "t", {publicOnly: true})).slug).toBe("t");
  });
});

describe("findById", () => {
  it("returns a hydrated document, not a lean object — callers save it", async () => {
    const created = await Program.create({title: "T", slug: "t"});
    const found = await content.findById(Program, created._id);

    expect(typeof found.save).toBe("function");
  });

  it("hides a deleted record by default", async () => {
    const created = await Program.create({title: "T", slug: "t", deletedAt: new Date()});

    await expect(content.findById(Program, created._id)).rejects.toMatchObject({status: 404});
    expect(await content.findById(Program, created._id, {includeDeleted: true})).toBeTruthy();
  });

  it("404s for an id that matches nothing", async () => {
    await expect(content.findById(Program, new mongoose.Types.ObjectId())).rejects.toMatchObject({status: 404});
  });
});

// ── generateUniqueSlug ──────────────────────────────────────────────────────

describe("generateUniqueSlug", () => {
  it("slugifies the source", async () => {
    expect(await content.generateUniqueSlug(Program, "PG in Product Management")).toBe("pg-in-product-management");
  });

  it("appends -2, -3 … until free", async () => {
    await Program.create({title: "T", slug: "taken"});
    expect(await content.generateUniqueSlug(Program, "Taken")).toBe("taken-2");

    await Program.create({title: "T", slug: "taken-2"});
    expect(await content.generateUniqueSlug(Program, "Taken")).toBe("taken-3");
  });

  it("ignores the record being edited, so re-saving does not bump its own slug", async () => {
    const program = await Program.create({title: "T", slug: "taken"});

    expect(await content.generateUniqueSlug(Program, "Taken", {excludeId: program._id})).toBe("taken");
  });

  it("falls back to 'item' when the source slugifies to nothing", async () => {
    expect(await content.generateUniqueSlug(Program, "!!!")).toBe("item");
    expect(await content.generateUniqueSlug(Program, undefined)).toBe("item");
  });

  it("checks against deleted records too — a slug in the trash is still taken", async () => {
    await Program.create({title: "T", slug: "taken", deletedAt: new Date()});

    expect(await content.generateUniqueSlug(Program, "Taken")).toBe("taken-2");
  });
});

// ── createContent ───────────────────────────────────────────────────────────

describe("createContent", () => {
  it("derives the slug from the model's declared source field", async () => {
    const faq = await createFaq({question: "How long is the program?"});

    expect(faq.slug).toBe("how-long-is-the-program");
  });

  it("uses an explicit slug when one is supplied, de-duplicating it", async () => {
    await createFaq({slug: "chosen"});
    const second = await createFaq({slug: "chosen"});

    expect(second.slug).toBe("chosen-2");
  });

  it("NEVER publishes on create, whatever the payload asks for", async () => {
    const faq = await createFaq({status: CONTENT_STATUS.PUBLISHED});

    expect(faq.status).toBe(CONTENT_STATUS.DRAFT);
    expect(faq.publishedAt).toBeNull();
  });

  it("allows a non-published status through, so 'in-review' on create still works", async () => {
    expect((await createFaq({status: CONTENT_STATUS.IN_REVIEW})).status).toBe(CONTENT_STATUS.IN_REVIEW);
  });

  it("stamps the actor on both authorship fields and starts at revision 1", async () => {
    const faq = await createFaq();

    expect(String(faq.createdBy)).toBe(String(actor._id));
    expect(String(faq.updatedBy)).toBe(String(actor._id));
    expect(faq.revision).toBe(1);
  });

  it("copes with no actor at all, for a record created by a script", async () => {
    const faq = await content.createContent(Faq, {question: "Q?", answer: "A."}, {actor: null});

    expect(faq.createdBy).toBeNull();
  });

  it("appends to the end of a hand-ordered collection, 1-based", async () => {
    expect((await createFaq({question: "First"})).displayOrder).toBe(1);
    expect((await createFaq({question: "Second"})).displayOrder).toBe(2);
    expect((await createFaq({question: "Third"})).displayOrder).toBe(3);
  });

  it("numbers from 1, matching the '01' the public rail prints", async () => {
    // Numbering from 0 made the panel say 7 for the card the site called 08.
    expect((await createFaq()).displayOrder).toBe(1);
  });

  it("honours an explicit position rather than appending", async () => {
    await createFaq({question: "First"});

    expect((await createFaq({question: "Placed", displayOrder: 9})).displayOrder).toBe(9);
  });

  it("honours an explicit position of 0, which ?? must not treat as absent", async () => {
    await createFaq({question: "First"});

    expect((await createFaq({question: "Zeroth", displayOrder: 0})).displayOrder).toBe(0);
  });

  it("counts only live records when appending, so the trash does not push new records down", async () => {
    const first = await createFaq({question: "First"});
    await content.softDelete(Faq, first._id, {actor});

    expect((await createFaq({question: "Second"})).displayOrder).toBe(1);
  });
});

// ── updateContent ───────────────────────────────────────────────────────────

describe("updateContent", () => {
  const update = (id, data, options = {}) =>
    content.updateContent(Faq, id, data, {actor, resource: "faqs", ...options});

  it("applies the change and bumps the revision", async () => {
    const faq = await createFaq();
    const updated = await update(faq._id, {answer: "A better answer."});

    expect(updated.answer).toBe("A better answer.");
    expect(updated.revision).toBe(2);
  });

  it("snapshots the PREVIOUS state before mutating, so history is the old text", async () => {
    const faq = await createFaq({answer: "Original."});
    await update(faq._id, {answer: "Replacement."});

    const revisions = await ContentRevision.find({resource: "faqs", documentId: faq._id}).lean();

    expect(revisions).toHaveLength(1);
    expect(revisions[0].snapshot.answer).toBe("Original.");
    expect(revisions[0].revision).toBe(1);
  });

  it("stamps who made the change", async () => {
    const faq = await createFaq();
    const updated = await update(faq._id, {answer: "x"}, {actor: other});

    expect(String(updated.updatedBy)).toBe(String(other._id));
  });

  it("refuses a stale write rather than discarding a colleague's edit", async () => {
    const faq = await createFaq();
    await update(faq._id, {answer: "Theirs."});

    await expect(update(faq._id, {answer: "Mine."}, {expectedRevision: 1})).rejects.toMatchObject({status: 409});
    expect((await Faq.findById(faq._id)).answer).toBe("Theirs.");
  });

  it("accepts a matching revision, including as a string from a query parameter", async () => {
    const faq = await createFaq();

    await expect(update(faq._id, {answer: "x"}, {expectedRevision: "1"})).resolves.toBeTruthy();
  });

  it("skips the check entirely when no revision is supplied", async () => {
    const faq = await createFaq();
    await update(faq._id, {answer: "one"});

    await expect(update(faq._id, {answer: "two"})).resolves.toBeTruthy();
  });

  it("explains that a trashed record must be restored, rather than 404ing on a record on screen", async () => {
    const faq = await createFaq();
    await content.softDelete(Faq, faq._id, {actor});

    await expect(update(faq._id, {answer: "x"})).rejects.toMatchObject({
      status: 400,
      message: expect.stringMatching(/trash/i),
    });
  });

  it("leaves the slug alone on an ordinary edit, so existing links keep working", async () => {
    const faq = await createFaq({question: "Original question?"});
    const updated = await update(faq._id, {question: "Completely different question?"});

    expect(updated.slug).toBe("original-question");
  });

  it("re-slugs only when a new slug is explicitly supplied, and de-duplicates it", async () => {
    await createFaq({slug: "taken"});
    const faq = await createFaq({slug: "mine"});

    expect((await update(faq._id, {slug: "taken"})).slug).toBe("taken-2");
  });

  it("is a no-op when the supplied slug is the one already stored", async () => {
    const faq = await createFaq({slug: "mine"});

    expect((await update(faq._id, {slug: "mine"})).slug).toBe("mine");
  });

  it("refuses to change status or publishedAt — those go through publish/unpublish and audit separately", async () => {
    const faq = await createFaq();
    const when = new Date("2020-01-01");
    const updated = await update(faq._id, {status: CONTENT_STATUS.PUBLISHED, publishedAt: when});

    expect(updated.status).toBe(CONTENT_STATUS.DRAFT);
    expect(updated.publishedAt).toBeNull();
  });

  it("404s for a record that does not exist", async () => {
    await expect(update(new mongoose.Types.ObjectId(), {answer: "x"})).rejects.toMatchObject({status: 404});
  });

  it("trims history to the cap, dropping the oldest first", async () => {
    const faq = await createFaq();

    for (let edit = 0; edit < REVISION_LIMIT + 5; edit += 1) {
      await update(faq._id, {answer: `Answer ${edit}`});
    }

    const revisions = await ContentRevision.find({resource: "faqs", documentId: faq._id})
      .sort({revision: 1})
      .lean();

    expect(revisions).toHaveLength(REVISION_LIMIT);
    // The oldest surviving revision is not revision 1 — the early ones were dropped.
    expect(revisions[0].revision).toBeGreaterThan(1);
  });
});

// ── resequencing (through updateContent's displayOrder) ─────────────────────

describe("display order resequencing", () => {
  const positions = async () => {
    const items = await Faq.find({deletedAt: null}).sort({displayOrder: 1}).select("question displayOrder").lean();
    return items.map((item) => [item.question, item.displayOrder]);
  };

  const move = (id, displayOrder) =>
    content.updateContent(Faq, id, {displayOrder}, {actor, resource: "faqs"});

  let a; let b; let c; let d;

  beforeEach(async () => {
    a = await createFaq({question: "A"});
    b = await createFaq({question: "B"});
    c = await createFaq({question: "C"});
    d = await createFaq({question: "D"});
  });

  it("starts out numbered 1..n", async () => {
    expect(await positions()).toEqual([["A", 1], ["B", 2], ["C", 3], ["D", 4]]);
  });

  it("moves a record to the requested position and pushes the rest along", async () => {
    await move(d._id, 2);

    expect(await positions()).toEqual([["A", 1], ["D", 2], ["B", 3], ["C", 4]]);
  });

  it("moves a record backwards too", async () => {
    await move(a._id, 3);

    expect(await positions()).toEqual([["B", 1], ["C", 2], ["A", 3], ["D", 4]]);
  });

  it("leaves the collection numbered exactly 1..n, with no gaps or duplicates", async () => {
    await move(c._id, 1);

    const orders = (await positions()).map(([, order]) => order);
    expect(orders).toEqual([1, 2, 3, 4]);
  });

  it("pins a position past the end to last rather than refusing it", async () => {
    await move(a._id, 999);

    expect(await positions()).toEqual([["B", 1], ["C", 2], ["D", 3], ["A", 4]]);
  });

  it("pins a position below 1 to first", async () => {
    await move(d._id, 0);

    expect(await positions()).toEqual([["D", 1], ["A", 2], ["B", 3], ["C", 4]]);
  });

  it("returns the position the record actually landed on, not the one asked for", async () => {
    const moved = await move(a._id, 999);

    expect(moved.displayOrder).toBe(4);
  });

  it("does not resequence when the position is unchanged", async () => {
    await move(b._id, 2);

    expect(await positions()).toEqual([["A", 1], ["B", 2], ["C", 3], ["D", 4]]);
  });

  it("excludes trashed records from the renumbering", async () => {
    await content.softDelete(Faq, c._id, {actor});
    await move(d._id, 1);

    expect(await positions()).toEqual([["D", 1], ["A", 2], ["B", 3]]);
  });
});

// ── setStatus ───────────────────────────────────────────────────────────────

describe("setStatus", () => {
  const publishProgram = async (overrides) => {
    const program = await content.createContent(Program, publishable(overrides), {actor});
    return program;
  };

  it("publishes a complete record and stamps publishedAt", async () => {
    const program = await publishProgram();
    const published = await content.setStatus(Program, program._id, CONTENT_STATUS.PUBLISHED, {actor});

    expect(published.status).toBe(CONTENT_STATUS.PUBLISHED);
    expect(published.publishedAt).toBeInstanceOf(Date);
    expect(published.isPublic).toBe(true);
  });

  it("refuses to publish a record the public page would render half-empty", async () => {
    const program = await content.createContent(Program, {title: "Bare"}, {actor});

    await expect(content.setStatus(Program, program._id, CONTENT_STATUS.PUBLISHED, {actor})).rejects.toMatchObject({
      status: 400,
    });
  });

  it("names every missing field at once, so an editor fixes them in one pass", async () => {
    const program = await content.createContent(Program, publishable({curriculum: [], outcomes: []}), {actor});

    await expect(
      content.setStatus(Program, program._id, CONTENT_STATUS.PUBLISHED, {actor}),
    ).rejects.toMatchObject({fields: {curriculum: expect.any(String), outcomes: expect.any(String)}});
  });

  it("leaves a refused publish exactly as it was, not half-transitioned", async () => {
    const program = await content.createContent(Program, {title: "Bare"}, {actor});

    await content.setStatus(Program, program._id, CONTENT_STATUS.PUBLISHED, {actor}).catch(() => {});

    const stored = await Program.findById(program._id);
    expect(stored.status).toBe(CONTENT_STATUS.DRAFT);
    expect(stored.publishedAt).toBeNull();
  });

  it("holds scheduling to the same bar as publishing — it goes public either way", async () => {
    const program = await content.createContent(Program, {title: "Bare"}, {actor});

    await expect(
      content.setStatus(Program, program._id, CONTENT_STATUS.SCHEDULED, {
        actor,
        scheduledAt: new Date(Date.now() + 60_000),
      }),
    ).rejects.toMatchObject({status: 400});
  });

  it("requires a date to schedule", async () => {
    const program = await publishProgram();

    await expect(content.setStatus(Program, program._id, CONTENT_STATUS.SCHEDULED, {actor})).rejects.toMatchObject({
      message: expect.stringMatching(/scheduled date is required/i),
    });
  });

  it("refuses a schedule in the past", async () => {
    const program = await publishProgram();

    await expect(
      content.setStatus(Program, program._id, CONTENT_STATUS.SCHEDULED, {
        actor,
        scheduledAt: new Date(Date.now() - 1000),
      }),
    ).rejects.toMatchObject({message: expect.stringMatching(/future/i)});
  });

  it("schedules a complete record for a future date", async () => {
    const program = await publishProgram();
    const when = new Date(Date.now() + 60_000);
    const scheduled = await content.setStatus(Program, program._id, CONTENT_STATUS.SCHEDULED, {actor, scheduledAt: when});

    expect(scheduled.status).toBe(CONTENT_STATUS.SCHEDULED);
    expect(scheduled.scheduledAt.getTime()).toBe(when.getTime());
    expect(scheduled.isPublic).toBe(false);
  });

  it("keeps the original publish date when a live record is republished after an edit", async () => {
    const program = await publishProgram();
    const first = await content.setStatus(Program, program._id, CONTENT_STATUS.PUBLISHED, {actor});
    const originallyAt = first.publishedAt.getTime();

    await content.setStatus(Program, program._id, CONTENT_STATUS.DRAFT, {actor});
    const again = await content.setStatus(Program, program._id, CONTENT_STATUS.PUBLISHED, {actor});

    expect(again.publishedAt.getTime()).toBe(originallyAt);
  });

  it("clears a pending schedule on publish, so it cannot fire again later", async () => {
    const program = await publishProgram();
    await content.setStatus(Program, program._id, CONTENT_STATUS.SCHEDULED, {
      actor,
      scheduledAt: new Date(Date.now() + 60_000),
    });

    expect((await content.setStatus(Program, program._id, CONTENT_STATUS.PUBLISHED, {actor})).scheduledAt).toBeNull();
  });

  it("clears the rejection reason on publish — the objection has been dealt with", async () => {
    const program = await publishProgram();
    await content.setStatus(Program, program._id, CONTENT_STATUS.ARCHIVED, {actor, reason: "Needs a better subtitle"});

    expect((await content.setStatus(Program, program._id, CONTENT_STATUS.PUBLISHED, {actor})).rejectedReason).toBe("");
  });

  it("records a rejection reason when one is given", async () => {
    const program = await publishProgram();
    const archived = await content.setStatus(Program, program._id, CONTENT_STATUS.ARCHIVED, {
      actor,
      reason: "Needs a better subtitle",
    });

    expect(archived.rejectedReason).toBe("Needs a better subtitle");
  });

  it("leaves an existing reason untouched on a transition that does not supply one", async () => {
    const program = await publishProgram();
    await content.setStatus(Program, program._id, CONTENT_STATUS.ARCHIVED, {actor, reason: "Objection"});

    expect((await content.setStatus(Program, program._id, CONTENT_STATUS.IN_REVIEW, {actor})).rejectedReason).toBe("Objection");
  });

  it("stamps the actor on the transition", async () => {
    const program = await publishProgram();
    const published = await content.setStatus(Program, program._id, CONTENT_STATUS.PUBLISHED, {actor: other});

    expect(String(published.updatedBy)).toBe(String(other._id));
  });

  it("does not apply publish rules to an unpublishing transition", async () => {
    const program = await content.createContent(Program, {title: "Bare"}, {actor});

    await expect(content.setStatus(Program, program._id, CONTENT_STATUS.ARCHIVED, {actor})).resolves.toBeTruthy();
  });
});

// ── softDelete / restore / purge ────────────────────────────────────────────

describe("softDelete", () => {
  it("stamps the deletion and drops the record out of public view", async () => {
    const program = await content.createContent(Program, publishable(), {actor});
    await content.setStatus(Program, program._id, CONTENT_STATUS.PUBLISHED, {actor});

    const deleted = await content.softDelete(Program, program._id, {actor});

    expect(deleted.deletedAt).toBeInstanceOf(Date);
    expect(String(deleted.deletedBy)).toBe(String(actor._id));
    expect(deleted.status).toBe(CONTENT_STATUS.ARCHIVED);
    expect(deleted.isPublic).toBe(false);
  });

  it("keeps the record in the database, so the mis-click is undoable", async () => {
    const faq = await createFaq();
    await content.softDelete(Faq, faq._id, {actor});

    expect(await Faq.findById(faq._id)).toBeTruthy();
  });

  it("404s for an already-deleted record rather than deleting it twice", async () => {
    const faq = await createFaq();
    await content.softDelete(Faq, faq._id, {actor});

    await expect(content.softDelete(Faq, faq._id, {actor})).rejects.toMatchObject({status: 404});
  });
});

describe("restore", () => {
  it("brings a record back as a draft, never straight to live", async () => {
    const program = await content.createContent(Program, publishable(), {actor});
    await content.setStatus(Program, program._id, CONTENT_STATUS.PUBLISHED, {actor});
    await content.softDelete(Program, program._id, {actor});

    const restored = await content.restore(Program, program._id, {actor});

    expect(restored.deletedAt).toBeNull();
    expect(restored.deletedBy).toBeNull();
    expect(restored.status).toBe(CONTENT_STATUS.DRAFT);
    expect(restored.isPublic).toBe(false);
  });

  it("refuses a record that is not in the trash", async () => {
    const faq = await createFaq();

    await expect(content.restore(Faq, faq._id, {actor})).rejects.toMatchObject({
      status: 400,
      message: expect.stringMatching(/not deleted/i),
    });
  });
});

describe("purge", () => {
  it("requires a soft delete first, so one mistaken click cannot destroy a record", async () => {
    const faq = await createFaq();

    await expect(content.purge(Faq, faq._id, {resource: "faqs"})).rejects.toMatchObject({
      status: 400,
      message: expect.stringMatching(/soft-delete/i),
    });
  });

  it("removes the record and its whole revision history", async () => {
    const faq = await createFaq();
    await content.updateContent(Faq, faq._id, {answer: "Edited."}, {actor, resource: "faqs"});
    await content.softDelete(Faq, faq._id, {actor});

    const result = await content.purge(Faq, faq._id, {resource: "faqs"});

    expect(result).toEqual({purged: true, id: String(faq._id)});
    expect(await Faq.findById(faq._id)).toBeNull();
    expect(await ContentRevision.countDocuments({documentId: faq._id})).toBe(0);
  });

  it("leaves another record's revisions alone", async () => {
    const keep = await createFaq({question: "Keep"});
    await content.updateContent(Faq, keep._id, {answer: "Edited."}, {actor, resource: "faqs"});

    const drop = await createFaq({question: "Drop"});
    await content.updateContent(Faq, drop._id, {answer: "Edited."}, {actor, resource: "faqs"});
    await content.softDelete(Faq, drop._id, {actor});
    await content.purge(Faq, drop._id, {resource: "faqs"});

    expect(await ContentRevision.countDocuments({documentId: keep._id})).toBe(1);
  });
});

// ── duplicateContent ────────────────────────────────────────────────────────

describe("duplicateContent", () => {
  it("copies the content but not the identity", async () => {
    const source = await content.createContent(Program, publishable(), {actor});
    const copy = await content.duplicateContent(Program, source._id, {actor, resource: "programs"});

    expect(String(copy._id)).not.toBe(String(source._id));
    expect(copy.title).toBe("Publishable Program (copy)");
    expect(copy.slug).toBe("publishable-program-copy");
    expect(copy.curriculum).toEqual(source.curriculum);
  });

  it("lands the copy as an unpublished, unfeatured draft", async () => {
    const source = await content.createContent(Program, publishable(), {actor});
    await content.setStatus(Program, source._id, CONTENT_STATUS.PUBLISHED, {actor});
    await Program.updateOne({_id: source._id}, {$set: {featured: true, rejectedReason: "Old objection"}});

    const copy = await content.duplicateContent(Program, source._id, {actor, resource: "programs"});

    expect(copy.status).toBe(CONTENT_STATUS.DRAFT);
    expect(copy.publishedAt).toBeNull();
    expect(copy.scheduledAt).toBeNull();
    expect(copy.featured).toBe(false);
    expect(copy.rejectedReason).toBe("");
  });

  it("appends the copy rather than tying it with its source", async () => {
    const first = await createFaq({question: "First"});
    await createFaq({question: "Second"});

    const copy = await content.duplicateContent(Faq, first._id, {actor, resource: "faqs"});

    expect(copy.displayOrder).toBe(3);
  });

  it("marks the copy on whichever title field the resource uses", async () => {
    const faq = await createFaq({question: "Why?"});
    const copy = await content.duplicateContent(Faq, faq._id, {actor, resource: "faqs"});

    expect(copy.question).toBe("Why? (copy)");
  });

  it("de-duplicates the copy's slug when duplicating twice", async () => {
    const faq = await createFaq({slug: "source"});
    await content.duplicateContent(Faq, faq._id, {actor, resource: "faqs"});
    const second = await content.duplicateContent(Faq, faq._id, {actor, resource: "faqs"});

    expect(second.slug).toBe("source-copy-2");
  });

  it("refuses to duplicate a trashed record", async () => {
    const faq = await createFaq();
    await content.softDelete(Faq, faq._id, {actor});

    await expect(content.duplicateContent(Faq, faq._id, {actor, resource: "faqs"})).rejects.toMatchObject({
      status: 404,
    });
  });
});

// ── revisions and rollback ──────────────────────────────────────────────────

describe("listRevisions", () => {
  it("returns history newest-first with the author resolved", async () => {
    const faq = await createFaq({answer: "One."});
    await content.updateContent(Faq, faq._id, {answer: "Two."}, {actor, resource: "faqs"});
    await content.updateContent(Faq, faq._id, {answer: "Three."}, {actor, resource: "faqs"});

    const revisions = await content.listRevisions("faqs", faq._id);

    expect(revisions.map((entry) => entry.revision)).toEqual([2, 1]);
    // Snapshots are not sent to the list screen — they are the whole document.
    expect(revisions[0].snapshot).toBeUndefined();
  });

  it("returns an empty list for a record that has never been edited", async () => {
    const faq = await createFaq();

    expect(await content.listRevisions("faqs", faq._id)).toEqual([]);
  });
});

describe("rollback", () => {
  it("restores the content of the chosen revision", async () => {
    const faq = await createFaq({answer: "Original."});
    await content.updateContent(Faq, faq._id, {answer: "Replacement."}, {actor, resource: "faqs"});

    const rolled = await content.rollback(Faq, faq._id, 1, {actor, resource: "faqs"});

    expect(rolled.answer).toBe("Original.");
  });

  it("snapshots the current state first, so a rollback is itself undoable", async () => {
    const faq = await createFaq({answer: "Original."});
    await content.updateContent(Faq, faq._id, {answer: "Replacement."}, {actor, resource: "faqs"});
    await content.rollback(Faq, faq._id, 1, {actor, resource: "faqs"});

    const revisions = await content.listRevisions("faqs", faq._id);

    expect(revisions[0].changeNote).toMatch(/before rollback to revision 1/i);
  });

  it("does not resurrect the publication state the record had at the time", async () => {
    const program = await content.createContent(Program, publishable(), {actor});
    await content.updateContent(Program, program._id, {description: "Edited."}, {actor, resource: "programs"});
    await content.setStatus(Program, program._id, CONTENT_STATUS.PUBLISHED, {actor});

    const rolled = await content.rollback(Program, program._id, 1, {actor, resource: "programs"});

    // Content came back; live-ness did not change.
    expect(rolled.description).toBe("A description.");
    expect(rolled.status).toBe(CONTENT_STATUS.PUBLISHED);
  });

  it("does not rewrite the slug, so a rollback cannot break existing links", async () => {
    const faq = await createFaq({slug: "original"});
    await content.updateContent(Faq, faq._id, {slug: "renamed", answer: "x"}, {actor, resource: "faqs"});

    expect((await content.rollback(Faq, faq._id, 1, {actor, resource: "faqs"})).slug).toBe("renamed");
  });

  it("does not rewrite who created the record", async () => {
    const faq = await createFaq();
    await content.updateContent(Faq, faq._id, {answer: "x"}, {actor: other, resource: "faqs"});

    const rolled = await content.rollback(Faq, faq._id, 1, {actor: other, resource: "faqs"});

    expect(String(rolled.createdBy)).toBe(String(actor._id));
    expect(String(rolled.updatedBy)).toBe(String(other._id));
  });

  it("moves the revision counter forward, never backward", async () => {
    const faq = await createFaq();
    await content.updateContent(Faq, faq._id, {answer: "x"}, {actor, resource: "faqs"});

    expect((await content.rollback(Faq, faq._id, 1, {actor, resource: "faqs"})).revision).toBe(3);
  });

  it("404s for a revision that does not exist", async () => {
    const faq = await createFaq();

    await expect(content.rollback(Faq, faq._id, 99, {actor, resource: "faqs"})).rejects.toMatchObject({
      status: 404,
    });
  });

  it("404s for a record in the trash", async () => {
    const faq = await createFaq();
    await content.updateContent(Faq, faq._id, {answer: "x"}, {actor, resource: "faqs"});
    await content.softDelete(Faq, faq._id, {actor});

    await expect(content.rollback(Faq, faq._id, 1, {actor, resource: "faqs"})).rejects.toMatchObject({status: 404});
  });
});

// ── reorder ─────────────────────────────────────────────────────────────────

describe("reorder", () => {
  it("applies every position in one write", async () => {
    const a = await createFaq({question: "A"});
    const b = await createFaq({question: "B"});

    const result = await content.reorder(Faq, [
      {id: a._id, displayOrder: 5},
      {id: b._id, displayOrder: 1},
    ], {actor});

    expect(result.modified).toBe(2);
    expect((await Faq.findById(a._id)).displayOrder).toBe(5);
    expect((await Faq.findById(b._id)).displayOrder).toBe(1);
  });

  it("stamps the actor on every record it moved", async () => {
    const a = await createFaq({question: "A"});
    await content.reorder(Faq, [{id: a._id, displayOrder: 2}], {actor: other});

    expect(String((await Faq.findById(a._id)).updatedBy)).toBe(String(other._id));
  });

  it("skips trashed records", async () => {
    const a = await createFaq({question: "A"});
    await content.softDelete(Faq, a._id, {actor});

    expect((await content.reorder(Faq, [{id: a._id, displayOrder: 9}], {actor})).modified).toBe(0);
  });

  it("short-circuits an empty list rather than issuing an empty bulk write", async () => {
    expect(await content.reorder(Faq, [], {actor})).toEqual({modified: 0});
  });
});

// ── bulk operations ─────────────────────────────────────────────────────────

describe("bulkSetStatus", () => {
  it("publishes every ready record and stamps a date on each", async () => {
    const one = await content.createContent(Program, publishable({title: "One"}), {actor});
    const two = await content.createContent(Program, publishable({title: "Two"}), {actor});

    const result = await content.bulkSetStatus(Program, [one._id, two._id], CONTENT_STATUS.PUBLISHED, {actor});

    expect(result.modified).toBe(2);
    expect(result.blocked).toEqual([]);
    for (const id of [one._id, two._id]) {
      const stored = await Program.findById(id);
      expect(stored.status).toBe(CONTENT_STATUS.PUBLISHED);
      expect(stored.publishedAt).toBeInstanceOf(Date);
    }
  });

  it("applies the same readiness bar as a single publish — ticking every row is not the way round it", async () => {
    const ready = await content.createContent(Program, publishable({title: "Ready"}), {actor});
    const bare = await content.createContent(Program, {title: "Bare"}, {actor});

    const result = await content.bulkSetStatus(Program, [ready._id, bare._id], CONTENT_STATUS.PUBLISHED, {actor});

    expect(result.modified).toBe(1);
    expect((await Program.findById(bare._id)).status).toBe(CONTENT_STATUS.DRAFT);
  });

  it("reports which record was blocked and why, rather than failing the whole batch", async () => {
    const ready = await content.createContent(Program, publishable({title: "Ready"}), {actor});
    const bare = await content.createContent(Program, publishable({title: "Bare", curriculum: []}), {actor});

    const {blocked} = await content.bulkSetStatus(Program, [ready._id, bare._id], CONTENT_STATUS.PUBLISHED, {actor});

    expect(blocked).toEqual([
      {id: String(bare._id), title: "Bare", missing: ["curriculum"]},
    ]);
  });

  it("holds a bulk schedule to the same bar", async () => {
    const bare = await content.createContent(Program, {title: "Bare"}, {actor});

    const result = await content.bulkSetStatus(Program, [bare._id], CONTENT_STATUS.SCHEDULED, {actor});

    expect(result.modified).toBe(0);
    expect(result.blocked).toHaveLength(1);
  });

  it("preserves a first-published date on a record that has been live before", async () => {
    const program = await content.createContent(Program, publishable(), {actor});
    const first = await content.setStatus(Program, program._id, CONTENT_STATUS.PUBLISHED, {actor});
    const originallyAt = first.publishedAt.getTime();
    await content.setStatus(Program, program._id, CONTENT_STATUS.DRAFT, {actor});

    await content.bulkSetStatus(Program, [program._id], CONTENT_STATUS.PUBLISHED, {actor});

    expect((await Program.findById(program._id)).publishedAt.getTime()).toBe(originallyAt);
  });

  it("clears the schedule and the rejection reason, exactly as a single publish does", async () => {
    const program = await content.createContent(Program, publishable(), {actor});
    await content.setStatus(Program, program._id, CONTENT_STATUS.SCHEDULED, {
      actor,
      scheduledAt: new Date(Date.now() + 60_000),
    });
    await Program.updateOne({_id: program._id}, {$set: {rejectedReason: "Old objection"}});

    await content.bulkSetStatus(Program, [program._id], CONTENT_STATUS.PUBLISHED, {actor});

    const stored = await Program.findById(program._id);
    expect(stored.scheduledAt).toBeNull();
    expect(stored.rejectedReason).toBe("");
  });

  it("does not apply publish rules to a non-public status", async () => {
    const bare = await content.createContent(Program, {title: "Bare"}, {actor});

    const result = await content.bulkSetStatus(Program, [bare._id], CONTENT_STATUS.ARCHIVED, {actor});

    expect(result.modified).toBe(1);
    expect(result.blocked).toEqual([]);
  });

  it("skips trashed records", async () => {
    const program = await content.createContent(Program, publishable(), {actor});
    await content.softDelete(Program, program._id, {actor});

    expect((await content.bulkSetStatus(Program, [program._id], CONTENT_STATUS.PUBLISHED, {actor})).modified).toBe(0);
  });

  it("returns cleanly for an empty id list", async () => {
    expect(await content.bulkSetStatus(Program, [], CONTENT_STATUS.ARCHIVED, {actor})).toEqual({
      modified: 0,
      blocked: [],
    });
  });

  it("falls back through title, name and question for the blocked record's label", async () => {
    const blog = await content.createContent(Blog, {title: "Titled"}, {actor});
    const {blocked} = await content.bulkSetStatus(Blog, [blog._id], CONTENT_STATUS.PUBLISHED, {actor});

    expect(blocked[0].title).toBe("Titled");
  });
});

describe("bulkSoftDelete", () => {
  it("trashes every live record it was given and archives them", async () => {
    const a = await createFaq({question: "A"});
    const b = await createFaq({question: "B"});

    expect((await content.bulkSoftDelete(Faq, [a._id, b._id], {actor})).modified).toBe(2);

    const stored = await Faq.findById(a._id);
    expect(stored.deletedAt).toBeInstanceOf(Date);
    expect(String(stored.deletedBy)).toBe(String(actor._id));
    expect(stored.status).toBe(CONTENT_STATUS.ARCHIVED);
  });

  it("does not re-delete something already in the trash", async () => {
    const a = await createFaq();
    await content.softDelete(Faq, a._id, {actor});

    expect((await content.bulkSoftDelete(Faq, [a._id], {actor})).modified).toBe(0);
  });
});

describe("bulkRestore", () => {
  it("brings trashed records back as drafts", async () => {
    const a = await createFaq({question: "A"});
    await content.softDelete(Faq, a._id, {actor});

    expect((await content.bulkRestore(Faq, [a._id], {actor})).modified).toBe(1);

    const stored = await Faq.findById(a._id);
    expect(stored.deletedAt).toBeNull();
    expect(stored.deletedBy).toBeNull();
    expect(stored.status).toBe(CONTENT_STATUS.DRAFT);
    expect(String(stored.updatedBy)).toBe(String(actor._id));
  });

  it("ignores records that are not in the trash", async () => {
    const a = await createFaq();

    expect((await content.bulkRestore(Faq, [a._id], {actor})).modified).toBe(0);
  });
});
