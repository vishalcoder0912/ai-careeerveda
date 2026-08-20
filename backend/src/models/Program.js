import mongoose from "mongoose";

import {contentPlugin} from "./plugins/contentPlugin.js";
import {mediaRefSchema, faqEntrySchema} from "./shared/schemas.js";

// Mirrors src/data/programCatalog.js field for field, so ProgramExplorer,
// ProgramDetailPage and the enrol form's picker keep working against API data
// without a component rewrite. `slug` replaces the file's `id` — same value,
// clearer name now that it is not also a database key.
//
// The detail page already omits any section whose field is missing, which is
// why almost everything here is optional rather than defaulted: an unpriced
// program should drop its fee panel, not render an empty one.

const feeSchema = new mongoose.Schema(
  {
    label: {type: String, default: "", maxlength: 120},
    amount: {type: String, default: "", maxlength: 60},
    note: {type: String, default: "", maxlength: 200},
  },
  {_id: false},
);

// A curriculum module. Field names match programCatalog.js exactly — `n` is the
// module number the detail page prints, `points` its bullet list — so
// ProgramDetailPage renders API data without a mapping layer.
const moduleSchema = new mongoose.Schema(
  {
    n: {type: Number, default: null},
    title: {type: String, default: "", maxlength: 300},
    duration: {type: String, default: "", maxlength: 60},
    points: {type: [String], default: []},
  },
  {_id: false},
);

const programSchema = new mongoose.Schema(
  {
    title: {type: String, required: true, trim: true, maxlength: 300},
    fullTitle: {type: String, default: "", maxlength: 300},
    shortTitle: {type: String, default: "", maxlength: 160},
    subtitle: {type: String, default: "", maxlength: 300},
    category: {type: String, default: "", maxlength: 80, index: true},

    description: {type: String, default: "", maxlength: 4000},
    lead: {type: String, default: "", maxlength: 4000},

    duration: {type: String, default: "", maxlength: 80},
    mentorship: {type: [String], default: []},
    format: {type: String, default: "", maxlength: 120},
    eligibility: {type: String, default: "", maxlength: 500},

    // Card and hero imagery. `image` matches the existing field name so the
    // explorer card needs no mapping.
    image: {type: mediaRefSchema, default: () => ({})},
    heroMedia: {type: mediaRefSchema, default: () => ({})},

    badges: {type: [String], default: []},
    overview: {type: [String], default: []},
    curriculumIntro: {type: String, default: "", maxlength: 2000},
    curriculum: {type: [String], default: []},
    modules: {type: [moduleSchema], default: []},
    outcomes: {type: [String], default: []},
    gainsIntro: {type: String, default: "", maxlength: 2000},
    gains: {type: [String], default: []},
    skills: {type: [String], default: []},
    tools: {type: [String], default: []},
    softSkills: {type: [String], default: []},
    internship: {type: [String], default: []},

    learners: {type: String, default: "", maxlength: 60},
    projects: {type: String, default: "", maxlength: 60},

    // Prices are strings, not numbers, because the source data carries
    // formatted rupee values with separators ("₹1,45,000") and the page prints
    // them verbatim. Parsing them into numbers would only create a formatting
    // problem to solve again on the way out.
    startingPrice: {type: String, default: "", maxlength: 60},
    fee: {type: feeSchema, default: null},
    emi: {type: String, default: "", maxlength: 300},
    guarantee: {type: String, default: "", maxlength: 300},

    nextBatch: {type: String, default: "", maxlength: 120},
    // auto: jobs/updateBatchDates.js keeps nextBatch pointed at the next
    // Saturday. custom: an editor-typed value, left untouched by the job.
    nextBatchMode: {type: String, enum: ["auto", "custom"], default: "auto"},
    seats: {type: String, default: "", maxlength: 120},

    faqs: {type: [faqEntrySchema], default: []},
    gallery: {type: [mediaRefSchema], default: []},

    // References rather than copies: a mentor's title changes in one place.
    mentors: [{type: mongoose.Schema.Types.ObjectId, ref: "Faculty"}],
    relatedPrograms: [{type: mongoose.Schema.Types.ObjectId, ref: "Program"}],
    brochureUrl: {type: String, default: "", maxlength: 1000},
  },
  {timestamps: true},
);

programSchema.plugin(contentPlugin, {
  slugSource: "title",
  searchFields: ["title", "subtitle", "description", "category"],
});

export const Program = mongoose.model("Program", programSchema);
