import mongoose from "mongoose";

import {contentPlugin} from "./plugins/contentPlugin.js";
import {mediaRefSchema, articleSectionSchema} from "./shared/schemas.js";

// Mirrors src/data/blogPosts.js — the largest static file in the repo at 135 KB.
//
// Content is structured (a lead paragraph, then heading/body blocks), NOT HTML.
// That is the whole XSS story for this collection: the frontend renders these
// strings through React's normal escaping, so there is no dangerouslySetInnerHTML
// anywhere and no sanitiser to get wrong. Storing HTML here would trade a
// solved problem for a permanent one.

const blogCtaSchema = new mongoose.Schema(
  {
    label: {type: String, default: "Explore CareerVeda programs", maxlength: 160},
    // Both relative CareerVeda paths and https URLs are valid; the Zod boundary
    // enforces that restriction before this model receives a value.
    url: {type: String, default: "/programs", maxlength: 1000},
  },
  {_id: false},
);

const blogSchema = new mongoose.Schema(
  {
    title: {type: String, required: true, trim: true, maxlength: 300},

    category: {type: String, default: "", maxlength: 80, index: true},
    // The small label above the title ("Career Guide"). Distinct from category,
    // which drives filtering.
    tag: {type: String, default: "", maxlength: 80},
    tags: {type: [String], default: []},

    author: {type: String, default: "CareerVeda Team", maxlength: 160},

    // The human-written date string the card prints ("July 2026"). publishedAt
    // from the content plugin is the machine-readable one that drives ordering
    // and visibility; this is presentation only.
    date: {type: String, default: "", maxlength: 60},
    readTime: {type: String, default: "", maxlength: 40},

    excerpt: {type: String, default: "", maxlength: 2000},
    lead: {type: String, default: "", maxlength: 4000},
    sections: {type: [articleSectionSchema], default: []},
    highlights: {type: [String], default: []},
    cta: {type: blogCtaSchema, default: () => ({})},

    image: {type: mediaRefSchema, default: () => ({})},
    gallery: {type: [mediaRefSchema], default: []},

    relatedPosts: [{type: mongoose.Schema.Types.ObjectId, ref: "Blog"}],
  },
  {timestamps: true},
);

blogSchema.plugin(contentPlugin, {
  slugSource: "title",
  searchFields: ["title", "excerpt", "category", "author"],
});

// Reading time is derived rather than typed in, so it cannot drift from the
// body after an edit — but only when the author has not set it deliberately.
blogSchema.pre("save", function deriveReadTime(next) {
  if (this.readTime) return next();

  const words = [this.lead, ...this.sections.flatMap((section) => section.body)]
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;

  // 220 wpm is the usual estimate for online prose.
  this.readTime = `${Math.max(1, Math.round(words / 220))} min read`;
  return next();
});

export const Blog = mongoose.model("Blog", blogSchema);
