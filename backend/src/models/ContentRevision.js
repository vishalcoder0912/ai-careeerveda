import mongoose from "mongoose";

// A snapshot of a content document taken before each update.
//
// Kept in its own collection rather than as an array on the document: a program
// record is already large, and 40 revisions inline would push it toward Mongo's
// 16 MB ceiling while making every read of the current version drag the whole
// history along with it.

const contentRevisionSchema = new mongoose.Schema(
  {
    // Stored as a string rather than a ref, because one collection holds
    // revisions for every content type and a single ref can only point at one.
    resource: {type: String, required: true},
    documentId: {type: mongoose.Schema.Types.ObjectId, required: true},

    revision: {type: Number, required: true},

    // The full document as it was. Mixed because the shape differs per
    // resource, and this is an archive — nothing queries inside it.
    snapshot: {type: mongoose.Schema.Types.Mixed, required: true},

    changedBy: {type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null},
    changeNote: {type: String, default: "", maxlength: 500},
  },
  {timestamps: {createdAt: true, updatedAt: false}},
);

// "History for this document, newest first" is the only access pattern.
contentRevisionSchema.index({resource: 1, documentId: 1, revision: -1});

export const ContentRevision = mongoose.model("ContentRevision", contentRevisionSchema);

// Revisions are capped per document. Unbounded history on a frequently-edited
// page would grow without limit for value that decays fast — nobody rolls back
// to the fiftieth-previous version.
export const REVISION_LIMIT = 30;
