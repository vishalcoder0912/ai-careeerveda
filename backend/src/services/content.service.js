import {ContentRevision, REVISION_LIMIT} from "../models/ContentRevision.js";
import {CONTENT_STATUS, publishedFilter} from "../models/plugins/contentPlugin.js";
import {toSlug, escapeRegex} from "../utils/sanitize.js";
import {missingForPublish} from "../config/publishRules.js";
import {notFound, conflict, badRequest} from "../utils/apiError.js";
import {syncBatchDateToAll, formatBatchDate, nextSaturdayDate} from "../jobs/updateBatchDates.js";

// One CRUD implementation for every content type.
//
// Six near-identical controllers would mean six places for a soft-delete filter
// to be forgotten — and the one that forgets it leaks deleted records. Here the
// filter is applied once, in buildFilter, and every caller inherits it.

// A hard ceiling on page size. Without it, `?limit=100000` is a free way to
// pull an entire collection and to make the server assemble it in memory.
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

// Only these may be sorted on. An unrestricted sort field lets a caller sort by
// an unindexed path and force a collection scan on every request.
const SORTABLE = new Set([
  "createdAt",
  "updatedAt",
  "publishedAt",
  "displayOrder",
  "title",
  "name",
  "status",
  "featured",
]);

export const buildSort = (sort, order = "desc") => {
  const field = SORTABLE.has(sort) ? sort : "displayOrder";
  const direction = order === "asc" ? 1 : -1;
  // _id breaks ties, so pagination is stable: without it two records with the
  // same displayOrder can swap places between page 1 and page 2 and a record
  // is shown twice or not at all.
  return {[field]: direction, _id: -1};
};

const buildFilter = (
  Model,
  {search, status, category, featured, showOnAlumniPage, includeDeleted = false, deleted = false, extra = {}},
) => {
  const filter = {...extra};

  // Three states, not two: the live list (deletedAt null), the trash (deletedAt
  // set), and includeDeleted for the rare "show me everything". The default that
  // must never be forgotten is still the first one.
  if (deleted) filter.deletedAt = {$ne: null};
  else if (!includeDeleted) filter.deletedAt = null;

  if (status) filter.status = status;
  if (category) filter.category = category;
  if (typeof featured === "boolean") filter.featured = featured;
  if (typeof showOnAlumniPage === "boolean") filter.showOnAlumniPage = showOnAlumniPage;

  if (search) {
    // A regex OR across the model's declared searchable fields rather than
    // $text: $text cannot do prefix matching, and an admin typing "prod"
    // expects to see "Product Management" before finishing the word.
    // escapeRegex is what stops the input being a pattern in its own right.
    const pattern = new RegExp(escapeRegex(search), "i");
    const fields = Model.searchFields || [];
    if (fields.length > 0) filter.$or = fields.map((field) => ({[field]: pattern}));
  }

  return filter;
};

// Merges a resource's default sort with whatever the caller asked for.
//
// A plain spread does not work here: an absent query parameter is `undefined`,
// and `{...defaults, ...{order: undefined}}` overwrites the default with
// undefined rather than falling back to it. That bug shipped once already — it
// made the hand-ordered program catalog render backwards, because every
// request carried an implicit order:"desc".
export const mergeSort = (defaults = {}, query = {}) => ({
  sort: query.sort || defaults.sort,
  order: query.order || defaults.order,
});

export const listContent = async (Model, options = {}) => {
  const limit = Math.min(Math.max(Number(options.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const page = Math.max(Number(options.page) || 1, 1);

  const filter = buildFilter(Model, options);
  const sort = buildSort(options.sort, options.order);

  // countDocuments and find run together — the count is not a dependency of the
  // query, and serialising them doubles the latency of every list screen.
  const [items, total] = await Promise.all([
    Model.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      // lean() for reads: hydrating full Mongoose documents to immediately
      // serialise them is pure overhead on the hottest path in the app.
      .lean({virtuals: true})
      .select(options.projection || "")
      .exec(),
    Model.countDocuments(filter),
  ]);

  return {items, total, page, limit};
};

export const listPublic = async (Model, options = {}) => {
  // The published filter is merged as `extra` so it cannot be overridden by a
  // caller-supplied status — a public request asking for ?status=draft gets the
  // published filter anyway. `deleted` is stripped for the same reason: the
  // public listing must never be talked into serving the trash.
  const {status, includeDeleted, deleted, ...safe} = options;
  return listContent(Model, {...safe, extra: {...publishedFilter(), ...(options.extra || {})}});
};

export const findBySlug = async (Model, slug, {publicOnly = false} = {}) => {
  const filter = publicOnly ? {slug, ...publishedFilter()} : {slug, deletedAt: null};
  const document = await Model.findOne(filter);
  if (!document) throw notFound("Not found");
  return document;
};

// Every read, update, publish, delete and rollback for every content type
// funnels through here, so this is the one place the id has to be proven to be
// an id. Doing it here rather than in each route's validator means a route
// added without one cannot reach Mongo with an arbitrary value — and the
// CastError path this used to lean on only fired for strings, not for a shape
// that happened to parse as something else.
const OBJECT_ID = /^[a-f0-9]{24}$/i;

export const findById = async (Model, id, {includeDeleted = false} = {}) => {
  // String(id) rather than a typeof check: internal callers pass a real
  // ObjectId, whose string form is the same 24 hex digits. Anything else —
  // an object, an array — stringifies to something the pattern rejects.
  if (!OBJECT_ID.test(String(id))) throw notFound("Not found");

  const filter = includeDeleted ? {_id: id} : {_id: id, deletedAt: null};
  const document = await Model.findOne(filter);
  if (!document) throw notFound("Not found");
  return document;
};

// Slugs must be unique, and an admin editing a title should not have to invent
// one. Appends -2, -3 … until free, ignoring the document being edited.
export const generateUniqueSlug = async (Model, source, {excludeId = null} = {}) => {
  const base = toSlug(source) || "item";
  let candidate = base;
  let suffix = 2;

  // Bounded: an unbounded loop here would spin forever against a pathological
  // collection, and 200 collisions on one title means something else is wrong.
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const clash = await Model.findOne({
      slug: candidate,
      ...(excludeId ? {_id: {$ne: excludeId}} : {}),
    }).select("_id");

    if (!clash) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  throw conflict("Could not generate a unique slug");
};

// Where a new record lands in a hand-ordered collection.
//
// The schema defaults displayOrder to 0, which means every record created
// without one ties at 0 and the order between them falls to the _id tiebreak —
// arbitrary, and it silently shuffles the public program rail. Appending to the
// end gives each new record a place of its own; an explicit value still wins.
//
// 1-based, because the public rail labels the first program "01". Numbering
// from 0 here meant the panel said 7 for the card the site called 08, and an
// editor had no way to tell which of the two was wrong.
const nextDisplayOrder = async (Model) => {
  const last = await Model.findOne({deletedAt: null})
    .sort({displayOrder: -1})
    .select("displayOrder")
    .lean();

  return last ? (last.displayOrder || 0) + 1 : 1;
};

export const createContent = async (Model, data, {actor}) => {
  const slug = data.slug
    ? await generateUniqueSlug(Model, data.slug)
    : await generateUniqueSlug(Model, data[Model.slugSource] || data.title || data.name);

  const document = await Model.create({
    ...data,
    displayOrder: data.displayOrder ?? (await nextDisplayOrder(Model)),
    slug,
    createdBy: actor ? actor._id : null,
    updatedBy: actor ? actor._id : null,
    revision: 1,
    // Creation never publishes, whatever the payload says. Publishing is an
    // explicit, separately-audited action.
    status: data.status === CONTENT_STATUS.PUBLISHED ? CONTENT_STATUS.DRAFT : data.status,
  });

  return document;
};

const saveRevision = async (resource, document, actor, changeNote = "") => {
  await ContentRevision.create({
    resource,
    documentId: document._id,
    revision: document.revision,
    snapshot: document.toObject(),
    changedBy: actor ? actor._id : null,
    changeNote,
  });

  // Trim beyond the cap. Old revisions are dropped oldest-first.
  const stale = await ContentRevision.find({
    resource: {$eq: resource},
    documentId: {$eq: document._id},
  })
    .sort({revision: -1})
    .skip(REVISION_LIMIT)
    .select("_id")
    .lean();

  if (stale.length > 0) {
    await ContentRevision.deleteMany({_id: {$in: stale.map((entry) => entry._id)}});
  }
};

// Put one record at a given position and renumber the collection 1..n around it.
//
// This is what makes the "Display order" box mean what an editor thinks it
// means. Before, the value was only a sort key: typing 3 sorted the record
// third-ish but left the stored numbers full of gaps and duplicates, so the
// number in the box ("0") and the number on the site ("02") were different
// things and neither explained the other.
//
// Now typing a position moves the record there and pushes the rest along, the
// way reordering a list actually behaves. Afterwards the stored numbers are
// exactly 1..n, so the box and the site agree.
const resequence = async (Model, movedId, target) => {
  const all = await Model.find({deletedAt: null})
    .select("_id")
    // Same order the lists use, so "position 3" counts the rows an editor sees.
    .sort({displayOrder: 1, _id: -1})
    .lean();

  const others = all.filter((entry) => String(entry._id) !== String(movedId));
  // Out-of-range values are pinned to the ends rather than refused: "999" plainly
  // means last, and erroring on it would be pedantry.
  const slot = Math.min(Math.max(Number(target) || 1, 1), others.length + 1);

  others.splice(slot - 1, 0, {_id: movedId});

  await Model.bulkWrite(
    others.map((entry, index) => ({
      updateOne: {filter: {_id: entry._id}, update: {$set: {displayOrder: index + 1}}},
    })),
  );
};

export const updateContent = async (Model, id, data, {actor, resource, expectedRevision}) => {
  // includeDeleted, so a deleted record produces "restore it first" rather than
  // the bare 404 findById would raise. The editor can open a deleted record
  // (getById allows it), and a save that came back "Not found" for a record
  // plainly on screen read as the panel being broken.
  const document = await findById(Model, id, {includeDeleted: true});

  if (document.deletedAt) {
    throw badRequest("This record is in the trash. Restore it before editing.");
  }

  // Optimistic concurrency. If the client loaded revision 4 and someone else
  // has since saved revision 5, this refuses rather than silently discarding
  // their colleague's edit. The admin UI turns this into "reload and reapply".
  if (expectedRevision !== undefined && Number(expectedRevision) !== document.revision) {
    throw conflict(
      "This record was changed by someone else. Reload and reapply your edit.",
      {revision: `Expected ${expectedRevision}, current is ${document.revision}`},
    );
  }

  // Snapshot BEFORE mutating, so the revision holds the previous state.
  await saveRevision(resource, document, actor);

  // The batch date is one site-wide value. Whether this save changed it is
  // judged against the snapshot above, not against the payload: the editor
  // posts every rendered field, so a title-only save must not count as a
  // batch-date edit.
  const previousBatch = {date: document.nextBatch, mode: document.nextBatchMode};

  // Renaming re-slugs only when asked. Changing a published URL silently would
  // break every existing link to it and is never what an editor meant by
  // fixing a typo in a title.
  if (data.slug && data.slug !== document.slug) {
    data.slug = await generateUniqueSlug(Model, data.slug, {excludeId: document._id});
  } else {
    delete data.slug;
  }

  // Status transitions go through publish/unpublish, which audit separately.
  delete data.status;
  delete data.publishedAt;

  // Held back from the plain assign: a position is a statement about the whole
  // collection, not a value on one record, so it is applied by resequencing
  // everything once this record has been saved.
  const requestedPosition =
    data.displayOrder !== undefined && Number(data.displayOrder) !== document.displayOrder
      ? Number(data.displayOrder)
      : null;
  delete data.displayOrder;

  Object.assign(document, data);
  document.updatedBy = actor ? actor._id : null;
  document.revision += 1;

  // Auto mode means "the next Saturday", whatever was typed. Canonicalised
  // before the save so the stored value, the API response and the propagated
  // value all agree — otherwise the editor would show a date the sweep will
  // replace within the hour.
  const batchChanged =
    resource === "programs" &&
    (document.nextBatch !== previousBatch.date || document.nextBatchMode !== previousBatch.mode);
  if (batchChanged && document.nextBatchMode !== "custom") {
    document.nextBatch = formatBatchDate(nextSaturdayDate());
  }

  await document.save();

  // One program's batch date is every program's batch date: push the saved
  // date and mode to the rest of the catalogue immediately, so an editor who
  // types a date once never has to repeat it across nine forms.
  if (batchChanged) {
    await syncBatchDateToAll(document);
  }

  if (requestedPosition !== null) {
    await resequence(Model, document._id, requestedPosition);
    // Re-read so the response carries the position the record actually landed
    // on — which is not always the one asked for, if it was past the end.
    return findById(Model, id);
  }

  return document;
};

// Both statuses put the record in front of visitors — a scheduled one just does
// it later — so both have to clear the same bar.
const GOES_PUBLIC = new Set([CONTENT_STATUS.PUBLISHED, CONTENT_STATUS.SCHEDULED]);

export const setStatus = async (Model, id, status, {actor, scheduledAt, reason} = {}) => {
  const document = await findById(Model, id);

  // Checked before anything is written, so a refused publish leaves the record
  // exactly as it was rather than half-transitioned.
  if (GOES_PUBLIC.has(status)) {
    const missing = missingForPublish(document);

    if (Object.keys(missing).length > 0) {
      throw badRequest(
        "This record is missing information the public page needs. Fill in the highlighted fields, then publish.",
        missing,
      );
    }
  }

  if (status === CONTENT_STATUS.SCHEDULED) {
    if (!scheduledAt) throw badRequest("A scheduled date is required.");
    if (new Date(scheduledAt).getTime() <= Date.now()) {
      throw badRequest("The scheduled date must be in the future.");
    }
    document.scheduledAt = new Date(scheduledAt);
  }

  if (status === CONTENT_STATUS.PUBLISHED) {
    // Set once, on first publication. Re-publishing after an edit keeps the
    // original date so the blog does not reshuffle every time a typo is fixed.
    if (!document.publishedAt) document.publishedAt = new Date();
    document.scheduledAt = null;
    // The objection has been dealt with — a live record must not still carry
    // the reason it was once sent back.
    document.rejectedReason = "";
  }

  // Only ever set alongside a rejection. `reason` is undefined on every other
  // transition, which leaves any existing value untouched rather than wiping it.
  if (reason !== undefined) document.rejectedReason = reason;

  document.status = status;
  document.updatedBy = actor ? actor._id : null;
  await document.save();

  return document;
};

export const softDelete = async (Model, id, {actor}) => {
  const document = await findById(Model, id);

  document.deletedAt = new Date();
  document.deletedBy = actor ? actor._id : null;
  // A deleted record must not stay publicly visible while it waits to be
  // restored or purged.
  document.status = CONTENT_STATUS.ARCHIVED;
  await document.save();

  return document;
};

export const restore = async (Model, id, {actor}) => {
  const document = await findById(Model, id, {includeDeleted: true});

  if (!document.deletedAt) throw badRequest("That record is not deleted.");

  document.deletedAt = null;
  document.deletedBy = null;
  // Comes back as a draft, never straight to live: restoring should not
  // republish something to the public site as a side effect.
  document.status = CONTENT_STATUS.DRAFT;
  document.updatedBy = actor ? actor._id : null;
  await document.save();

  return document;
};

// Irreversible. Guarded by a super-admin-only permission at the route.
export const purge = async (Model, id, {resource}) => {
  const document = await findById(Model, id, {includeDeleted: true});

  if (!document.deletedAt) {
    // Forcing delete-then-purge means a single mistaken click cannot destroy a
    // record; it takes two deliberate actions.
    throw badRequest("Soft-delete this record before permanently deleting it.");
  }

  await ContentRevision.deleteMany({resource, documentId: document._id});
  await Model.deleteOne({_id: document._id});

  return {purged: true, id: String(document._id)};
};

export const duplicateContent = async (Model, id, {actor, resource}) => {
  const source = await findById(Model, id);

  const copy = source.toObject();
  delete copy._id;
  delete copy.createdAt;
  delete copy.updatedAt;
  delete copy.id;
  // Not carried over: the copy would otherwise sit at the exact position of its
  // source and the two would tie, which is how a hand-ordered list starts
  // shuffling. Left undefined so createContent appends it to the end.
  delete copy.displayOrder;

  return createContent(
    Model,
    {
      ...copy,
      title: copy.title ? `${copy.title} (copy)` : undefined,
      name: copy.name ? `${copy.name} (copy)` : undefined,
      question: copy.question ? `${copy.question} (copy)` : undefined,
      slug: `${source.slug}-copy`,
      status: CONTENT_STATUS.DRAFT,
      publishedAt: null,
      scheduledAt: null,
      featured: false,
      // A fresh draft has not been rejected by anyone. Inheriting the source's
      // objection would show a reviewer a reason that was never about this copy.
      rejectedReason: "",
    },
    {actor, resource},
  );
};

export const listRevisions = async (resource, documentId) =>
  ContentRevision.find({resource, documentId})
    .sort({revision: -1})
    .select("revision changedBy changeNote createdAt")
    .populate("changedBy", "name email")
    .lean();

export const rollback = async (Model, id, revisionNumber, {actor, resource}) => {
  const document = await findById(Model, id);
  const target = await ContentRevision.findOne({resource, documentId: id, revision: revisionNumber});

  if (!target) throw notFound("That revision does not exist");

  // The current state is itself snapshotted first, so a rollback is undoable.
  await saveRevision(resource, document, actor, `Before rollback to revision ${revisionNumber}`);

  const snapshot = {...target.snapshot};
  // Identity, lifecycle and audit fields are never restored from a snapshot —
  // rolling back content must not also resurrect an old publication state or
  // rewrite who created the record.
  for (const field of [
    "_id", "id", "slug", "status", "publishedAt", "scheduledAt", "deletedAt", "deletedBy",
    "createdBy", "createdAt", "updatedAt", "revision", "__v",
  ]) {
    delete snapshot[field];
  }

  Object.assign(document, snapshot);
  document.updatedBy = actor ? actor._id : null;
  document.revision += 1;
  await document.save();

  return document;
};

export const reorder = async (Model, entries, {actor}) => {
  // One bulk write rather than N saves: reordering a 40-item list should be one
  // round trip, not forty.
  const operations = entries.map(({id, displayOrder}) => ({
    updateOne: {
      filter: {_id: id, deletedAt: null},
      update: {$set: {displayOrder, updatedBy: actor ? actor._id : null}},
    },
  }));

  if (operations.length === 0) return {modified: 0};

  const result = await Model.bulkWrite(operations);
  return {modified: result.modifiedCount};
};

export const bulkSetStatus = async (Model, ids, status, {actor}) => {
  const update = {status, updatedBy: actor ? actor._id : null};

  // The same readiness bar as a single publish — otherwise ticking every row and
  // pressing Publish would be the way round it. Records that are not ready are
  // left as drafts and reported back, rather than failing the whole batch: an
  // editor publishing twenty posts should not be blocked by one incomplete
  // draft among them, but they do need to be told which one it was.
  const blocked = [];

  if (GOES_PUBLIC.has(status)) {
    const candidates = await Model.find({_id: {$in: ids}, deletedAt: null});
    const ready = [];

    for (const document of candidates) {
      const missing = missingForPublish(document);

      if (Object.keys(missing).length > 0) {
        blocked.push({
          id: String(document._id),
          title: document.title || document.name || document.question || document.slug,
          missing: Object.keys(missing),
        });
      } else {
        ready.push(document._id);
      }
    }

    // eslint-disable-next-line no-param-reassign
    ids = ready;
  }

  if (ids.length === 0) return {modified: 0, blocked};

  if (status === CONTENT_STATUS.PUBLISHED) {
    // Only fills publishedAt where it is still empty, preserving first-published
    // dates on records that have been live before.
    await Model.updateMany(
      {_id: {$in: ids}, deletedAt: null, publishedAt: null},
      {$set: {publishedAt: new Date()}},
    );

    // The same two clean-ups a single publish does. Without them a record
    // published from the list keeps the schedule it was already going to go live
    // on, and keeps showing the rejection reason that publishing just resolved —
    // so the same action gives a different result depending on which button
    // reached it.
    update.scheduledAt = null;
    update.rejectedReason = "";
  }

  const result = await Model.updateMany({_id: {$in: ids}, deletedAt: null}, {$set: update});
  return {modified: result.modifiedCount, blocked};
};

export const bulkSoftDelete = async (Model, ids, {actor}) => {
  const result = await Model.updateMany(
    {_id: {$in: ids}, deletedAt: null},
    {$set: {deletedAt: new Date(), deletedBy: actor ? actor._id : null, status: CONTENT_STATUS.ARCHIVED}},
  );
  return {modified: result.modifiedCount};
};

export const bulkRestore = async (Model, ids, {actor}) => {
  const result = await Model.updateMany(
    {_id: {$in: ids}, deletedAt: {$ne: null}},
    {$set: {deletedAt: null, deletedBy: null, status: CONTENT_STATUS.DRAFT, updatedBy: actor ? actor._id : null}},
  );
  return {modified: result.modifiedCount};
};
