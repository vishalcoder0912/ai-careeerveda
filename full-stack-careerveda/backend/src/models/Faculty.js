import mongoose from "mongoose";

import {contentPlugin} from "./plugins/contentPlugin.js";
import {mediaRefSchema} from "./shared/schemas.js";

// Mirrors src/data/mentors.js. The file's `draft: true` flag becomes the shared
// `status` field, so faculty use the same publishing lifecycle as everything
// else instead of a bespoke boolean.
//
// `photo` may be empty: the existing card falls back to a teal monogram of the
// mentor's initials, which lets the list go live before every headshot has
// arrived. That behaviour is preserved by leaving the field optional.

const socialLinksSchema = new mongoose.Schema(
  {
    linkedin: {type: String, default: "", maxlength: 500},
    twitter: {type: String, default: "", maxlength: 500},
    github: {type: String, default: "", maxlength: 500},
    website: {type: String, default: "", maxlength: 500},
  },
  {_id: false},
);

const facultySchema = new mongoose.Schema(
  {
    name: {type: String, required: true, trim: true, maxlength: 160},

    // The short field label on the chip above the name. Deliberately shares a
    // vocabulary with Program.category so faculty and programs read as one
    // system.
    discipline: {type: String, default: "", maxlength: 80, index: true},

    // Title then company, in plain terms — the line that earns the credibility.
    role: {type: String, default: "", maxlength: 300},
    designation: {type: String, default: "", maxlength: 200},
    company: {type: String, default: "", maxlength: 200},

    description: {type: String, default: "", maxlength: 500},
    bio: {type: String, default: "", maxlength: 8000},
    shortBio: {type: String, default: "", maxlength: 600},

    photo: {type: mediaRefSchema, default: () => ({})},
    coverImage: {type: mediaRefSchema, default: () => ({})},

    education: {type: String, default: "", maxlength: 1000},
    experience: {type: String, default: "", maxlength: 1000},
    specialization: {type: String, default: "", maxlength: 1000},
    // An array, not a string: mentors.js carries these as bullet points and the
    // card renders them as a list. education/experience/specialization really
    // are single strings in that file, so they stay strings.
    achievements: {type: [String], default: []},
    expertise: {type: [String], default: []},

    socialLinks: {type: socialLinksSchema, default: () => ({})},

    associatedPrograms: [{type: mongoose.Schema.Types.ObjectId, ref: "Program"}],
  },
  {timestamps: true},
);

facultySchema.plugin(contentPlugin, {
  slugSource: "name",
  searchFields: ["name", "role", "discipline", "expertise"],
});

export const Faculty = mongoose.model("Faculty", facultySchema);
