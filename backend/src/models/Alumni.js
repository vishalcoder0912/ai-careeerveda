import mongoose from "mongoose";

import {contentPlugin} from "./plugins/contentPlugin.js";
import {mediaRefSchema} from "./shared/schemas.js";

// Mirrors src/data/alumniSpotlight.js. Feeds three surfaces: the /alumni page,
// the home-page spotlight, and DomeGallery (which reads only image + name).
//
// The salary fields are strings for the same reason Program's are — the source
// carries formatted values and the page prints them as written. `percentageHike`
// is stored rather than computed, because the two salary figures are often
// ranges or "confidential", which no arithmetic can divide.

const alumniSchema = new mongoose.Schema(
  {
    name: {type: String, required: true, trim: true, maxlength: 160},

    image: {type: mediaRefSchema, default: () => ({})},
    companyLogo: {type: mediaRefSchema, default: () => ({})},

    previousRole: {type: String, default: "", maxlength: 200},
    currentRole: {type: String, default: "", maxlength: 200},
    previousCompany: {type: String, default: "", maxlength: 200},
    currentCompany: {type: String, default: "", maxlength: 200},

    program: {type: mongoose.Schema.Types.ObjectId, ref: "Program", default: null},
    // Kept alongside the reference so a story survives its program being
    // renamed or retired — the alumnus still graduated from what it was called.
    programTitle: {type: String, default: "", maxlength: 300},

    graduationYear: {type: String, default: "", maxlength: 20},

    salaryBefore: {type: String, default: "", maxlength: 60},
    salaryAfter: {type: String, default: "", maxlength: 60},
    percentageHike: {type: String, default: "", maxlength: 40},

    quote: {type: String, default: "", maxlength: 1000},
    story: {type: String, default: "", maxlength: 8000},
    skills: {type: [String], default: []},

    testimonialVideo: {type: String, default: "", maxlength: 1000},

    // The accent pair the generated initials placeholder uses when no photo has
    // been uploaded. Carried over so a profile without a portrait keeps its
    // existing colour rather than falling back to a single default.
    accent: {type: String, default: "", maxlength: 20},
    accentEnd: {type: String, default: "", maxlength: 20},

    // Where a published story is shown, decided per record in the admin panel.
    //
    // Three surfaces, two flags, on purpose:
    //   home page outcome strip  → `featured` (from contentPlugin)
    //   /alumni review grid      → `showOnAlumniPage`, below
    //   /alumni dome gallery     → every published story, no flag at all
    //
    // The dome is the complete record of who came through, so it is deliberately
    // not filterable — hiding someone from the curated strips should never erase
    // them from it. The two grids are editorial selections, and independent:
    // a story can be on one, both, or neither and still appear in the dome.
    showOnAlumniPage: {type: Boolean, default: false, index: true},
  },
  {timestamps: true},
);

alumniSchema.plugin(contentPlugin, {
  slugSource: "name",
  searchFields: ["name", "currentRole", "currentCompany", "programTitle"],
});

export const Alumni = mongoose.model("Alumni", alumniSchema);
