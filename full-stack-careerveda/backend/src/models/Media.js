import mongoose from "mongoose";

// Metadata only. The bytes live in ImageKit — MongoDB stores the URL, the
// ImageKit file id, dimensions and the descriptive fields an editor fills in.
//
// Dimensions are stored rather than measured in the browser because that is
// what lets the frontend reserve the box before the image arrives; without them
// every image is a layout shift.

const mediaSchema = new mongoose.Schema(
  {
    // What the editor sees in the library. Separate from fileName, which is
    // what ImageKit stored and must not change when someone renames the asset.
    name: {type: String, required: true, trim: true, maxlength: 300},
    fileName: {type: String, required: true, maxlength: 300},

    url: {type: String, required: true, maxlength: 1000},
    thumbnailUrl: {type: String, default: "", maxlength: 1000},

    // ImageKit's identifier, and the only handle we have for deleting the
    // remote object. Unique so the same remote file cannot be registered twice.
    fileId: {type: String, required: true, unique: true, maxlength: 120},
    filePath: {type: String, default: "", maxlength: 1000},
    folder: {type: String, default: "/careerveda", maxlength: 300, index: true},

    mimeType: {type: String, default: "", maxlength: 100},
    extension: {type: String, default: "", maxlength: 20},
    size: {type: Number, default: 0},
    width: {type: Number, default: null},
    height: {type: Number, default: null},

    alt: {type: String, default: "", maxlength: 300},
    caption: {type: String, default: "", maxlength: 500},
    tags: {type: [String], default: []},

    // Where the subject sits, so a crop to a different aspect ratio keeps the
    // face in frame instead of centring on an armpit. 0-1 in each axis.
    focalPoint: {
      x: {type: Number, default: 0.5, min: 0, max: 1},
      y: {type: Number, default: 0.5, min: 0, max: 1},
    },

    // SHA-256 of the uploaded bytes. Lets a re-upload of the same picture be
    // recognised and offered as the existing asset rather than silently
    // creating a duplicate that then has to be deduplicated by eye.
    contentHash: {type: String, default: "", index: true, maxlength: 64},

    uploadedBy: {type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null},

    deletedAt: {type: Date, default: null},
    deletedBy: {type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null},

    // Set only for assets we cannot manage — no API key for the account that
    // hosts them. The admin UI reads this to hide a delete button that would
    // fail rather than offering one that does nothing.
    external: {type: Boolean, default: false},

    // Where this asset came from when it was copied in from the old ImageKit
    // account. Kept for provenance and so the copy is reversible: if a fetch
    // produced a wrong or truncated file, the original URL is still here to
    // roll back to.
    originalUrl: {type: String, default: "", maxlength: 1000},
  },
  {timestamps: true},
);

// The library screen: newest first, excluding deleted.
mediaSchema.index({deletedAt: 1, createdAt: -1});
mediaSchema.index({name: "text", alt: "text", caption: "text", tags: "text"});

export const Media = mongoose.model("Media", mediaSchema);
