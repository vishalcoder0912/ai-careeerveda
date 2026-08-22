import mongoose from "mongoose";

import {contentPlugin} from "./plugins/contentPlugin.js";
import {mediaRefSchema} from "./shared/schemas.js";

// Mirrors src/data/jobsData.js, which serves /jobs (and /achievers, which
// redirects to it).
//
// A note carried over from that file: the listings are illustrative, and
// `applyUrl` points at a live LinkedIn Jobs search for the exact role and
// location rather than a dead placeholder link. The Jobs page carries a
// user-facing disclaimer explaining this. Keeping applyUrl free-form preserves
// the ability to swap in an employer's real ATS URL per listing.

const jobSchema = new mongoose.Schema(
  {
    title: {type: String, required: true, trim: true, maxlength: 300},
    company: {type: String, default: "", maxlength: 200, index: true},
    companyLogo: {type: mediaRefSchema, default: () => ({})},

    location: {type: String, default: "", maxlength: 200},
    workMode: {type: String, default: "", maxlength: 60},
    employmentType: {type: String, default: "", maxlength: 60},
    experienceLevel: {type: String, default: "", maxlength: 80},

    description: {type: String, default: "", maxlength: 6000},
    requirements: {type: [String], default: []},
    responsibilities: {type: [String], default: []},
    skills: {type: [String], default: []},

    salaryRange: {type: String, default: "", maxlength: 120},

    applicationUrl: {type: String, default: "", maxlength: 1000},
    applicationEmail: {type: String, default: "", maxlength: 254},
    // Named so the card can say where the listing came from — it matters that
    // these are third-party openings, not CareerVeda vacancies.
    source: {type: String, default: "", maxlength: 120},

    // The provider's own id for this listing. Null on anything an admin typed
    // by hand — deliberately null rather than "", because the uniqueness index
    // below keys on it and every manual job sharing "" would collide.
    sourceJobId: {type: String, default: null, maxlength: 200},
    // When the sync last saw this listing upstream. Distinct from createdAt,
    // which is when we first stored it.
    fetchedAt: {type: Date, default: null},

    // Normalised title+company+location, used to spot the same opening arriving
    // from two providers with different ids. Stored rather than recomputed so a
    // sync batch can check the whole run with one indexed $in query instead of
    // one query per listing.
    //
    // Deliberately NOT unique: two genuinely different openings can share a
    // title, company and city, and a unique index here would block an admin
    // from creating the second one by hand.
    // Bounded because it is indexed: Mongo refuses an index key over 1024 bytes,
    // so an unbounded value here turns a long upstream title into a failed write
    // rather than a stored listing.
    dedupeKey: {type: String, default: "", index: true, maxlength: 400},

    postedDate: {type: Date, default: null},
    deadline: {type: Date, default: null},
  },
  {timestamps: true},
);

jobSchema.plugin(contentPlugin, {
  slugSource: "title",
  searchFields: ["title", "company", "location", "skills"],
});

// The listing page sorts newest-first within featured; this covers it.
jobSchema.index({deletedAt: 1, status: 1, featured: -1, postedDate: -1});

// Idempotent ingestion. The hourly sync re-fetches the same listings every run
// and deduplicates on sourceJobId + dedupeKey before writing, so one row per
// upstream job is guaranteed by lookup — not by an index.
//
// Firestore with MongoDB compatibility cannot express Mongo's partial unique
// index (partialFilterExpression is unsupported), and a plain unique index
// would reject every manual job: Firebase indexes absent fields as null, so the
// second listing with sourceJobId: null would collide. The plain compound index
// below stays for the $in dedupe lookups.
jobSchema.index({source: 1, sourceJobId: 1});

export const Job = mongoose.model("Job", jobSchema);
