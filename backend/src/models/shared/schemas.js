import mongoose from "mongoose";

// Reusable subdocuments. `_id: false` throughout — these are value objects, not
// entities, and an ObjectId on every SEO block is noise in every response.

// A reference to a Media Library item, denormalised.
//
// The url/fileId/dimensions are copied rather than populated on read: a program
// card renders 9 images, and 9 extra lookups on the hot public path is a cost
// with no benefit, since these values change only when an admin replaces the
// image. width/height are stored specifically so the frontend can reserve the
// box and avoid layout shift.
export const mediaRefSchema = new mongoose.Schema(
  {
    media: {type: mongoose.Schema.Types.ObjectId, ref: "Media", default: null},
    url: {type: String, default: "", maxlength: 1000},
    fileId: {type: String, default: "", maxlength: 120},
    thumbnailUrl: {type: String, default: "", maxlength: 1000},
    alt: {type: String, default: "", maxlength: 300},
    caption: {type: String, default: "", maxlength: 500},
    width: {type: Number, default: null},
    height: {type: Number, default: null},
  },
  {_id: false},
);

export const seoSchema = new mongoose.Schema(
  {
    title: {type: String, default: "", maxlength: 200},
    description: {type: String, default: "", maxlength: 400},
    keywords: {type: [String], default: []},
    ogImage: {type: String, default: "", maxlength: 1000},
    canonicalUrl: {type: String, default: "", maxlength: 1000},
    // Lets an admin keep a page reachable but out of search results — useful
    // for a thin listing page or a campaign landing page.
    noIndex: {type: Boolean, default: false},
  },
  {_id: false},
);

// The shape PolicyPage.jsx already renders. Kept as-is so the existing
// component needs no change when its data starts coming from the API.
export const policySectionSchema = new mongoose.Schema(
  {
    id: {type: String, default: "", maxlength: 100},
    heading: {type: String, default: "", maxlength: 300},
    body: {type: [String], default: []},
    callout: {type: String, default: "", maxlength: 2000},
    list: {type: [String], default: []},
    groups: {
      type: [
        new mongoose.Schema(
          {title: {type: String, default: "", maxlength: 300}, list: {type: [String], default: []}},
          {_id: false},
        ),
      ],
      default: [],
    },
    closing: {type: String, default: "", maxlength: 2000},
  },
  {_id: false},
);

// Matches blogPosts.js: a lead paragraph then heading/body blocks.
export const articleSectionSchema = new mongoose.Schema(
  {
    heading: {type: String, default: "", maxlength: 300},
    body: {type: [String], default: []},
  },
  {_id: false},
);

// A two-cell stat: ["13,000+", "Successful Learners"] in the current data.
export const statSchema = new mongoose.Schema(
  {
    value: {type: String, default: "", maxlength: 60},
    label: {type: String, default: "", maxlength: 160},
  },
  {_id: false},
);

export const faqEntrySchema = new mongoose.Schema(
  {
    question: {type: String, required: true, maxlength: 500},
    answer: {type: String, required: true, maxlength: 4000},
  },
  {_id: false},
);
