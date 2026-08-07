import mongoose from "mongoose";

import {seoSchema} from "../shared/schemas.js";

// Everything every content type shares: publishing lifecycle, soft delete,
// ordering, SEO, authorship and optimistic concurrency.
//
// Applied as a plugin rather than copied into each schema so that a change to
// the lifecycle — a new status, a different visibility rule — happens once and
// cannot drift between collections.

export const CONTENT_STATUS = Object.freeze({
  DRAFT: "draft",
  IN_REVIEW: "in-review",
  SCHEDULED: "scheduled",
  PUBLISHED: "published",
  ARCHIVED: "archived",
});

export const CONTENT_STATUSES = Object.values(CONTENT_STATUS);

// The one definition of "the public may see this".
//
// A scheduled item whose time has passed counts as published here, so
// publication does not depend on a background job having run. The job in
// jobs/publishScheduled.js only normalises the stored status afterwards, so the
// admin list reads correctly — if it never runs, the public site is still right.
export const publishedFilter = (now = new Date()) => ({
  deletedAt: null,
  $or: [
    {status: CONTENT_STATUS.PUBLISHED, publishedAt: {$lte: now}},
    {status: CONTENT_STATUS.PUBLISHED, publishedAt: null},
    {status: CONTENT_STATUS.SCHEDULED, scheduledAt: {$lte: now}},
  ],
});

export const contentPlugin = (schema, {slugSource = "title", searchFields = []} = {}) => {
  schema.add({
    slug: {type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 140},

    status: {type: String, enum: CONTENT_STATUSES, default: CONTENT_STATUS.DRAFT, index: true},

    // When it became (or becomes) public. Set on the transition, not on save,
    // so re-editing a live record does not silently reorder the blog.
    publishedAt: {type: Date, default: null},
    scheduledAt: {type: Date, default: null},

    featured: {type: Boolean, default: false},
    displayOrder: {type: Number, default: 0},

    // Why a reviewer sent this back. Lives here rather than on Job alone
    // because the review lifecycle itself is shared — every resource already
    // has submit-review, so every resource can be rejected from it. Cleared on
    // publish, so a listing that was fixed and approved does not keep showing
    // the objection that was already dealt with.
    rejectedReason: {type: String, default: "", maxlength: 500},

    seo: {type: seoSchema, default: () => ({})},

    // Soft delete. Every query in content.service.js adds `deletedAt: null`,
    // so a deleted record is invisible without being destroyed — an admin
    // mis-click should be undoable.
    deletedAt: {type: Date, default: null},
    deletedBy: {type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null},

    createdBy: {type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null},
    updatedBy: {type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null},

    // Optimistic concurrency. A client sends the revision it loaded; the update
    // is refused if it no longer matches, so two editors on the same record
    // cannot silently overwrite each other — the second one is told to reload.
    revision: {type: Number, default: 1},
  });

  // The public read path: filter by status + deletedAt, sort by order. This
  // compound index covers all three, so a listing never sorts in memory.
  schema.index({deletedAt: 1, status: 1, displayOrder: 1});
  schema.index({deletedAt: 1, status: 1, publishedAt: -1});
  // Serves the scheduled-publishing sweep without scanning.
  schema.index({status: 1, scheduledAt: 1});

  if (searchFields.length > 0) {
    // One text index per collection is the Mongo limit, so all searchable
    // fields go into this one.
    schema.index(
      Object.fromEntries(searchFields.map((field) => [field, "text"])),
      {name: "content_text_search"},
    );
  }

  schema.virtual("isPublic").get(function isPublic() {
    if (this.deletedAt) return false;
    if (this.status === CONTENT_STATUS.PUBLISHED) {
      return !this.publishedAt || this.publishedAt.getTime() <= Date.now();
    }
    if (this.status === CONTENT_STATUS.SCHEDULED) {
      return Boolean(this.scheduledAt && this.scheduledAt.getTime() <= Date.now());
    }
    return false;
  });

  schema.statics.slugSource = slugSource;
  schema.statics.searchFields = searchFields;

  schema.set("toJSON", {virtuals: true, versionKey: false});
  schema.set("toObject", {virtuals: true, versionKey: false});
};
