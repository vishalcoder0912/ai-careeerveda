import mongoose from "mongoose";

// One learner applying to one CareerVeda-posted job. Separate from Lead on
// purpose: a lead is one row per phone number, ever, while a learner may apply
// to many jobs — but only once to each, which the unique index below enforces.

export const APPLICATION_STATUSES = ["new", "reviewing", "shortlisted", "rejected", "hired"];

const jobApplicationSchema = new mongoose.Schema(
  {
    job: {type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true, index: true},
    // Snapshot of the listing as applied to, so the record still reads correctly
    // after the job is renamed, unpublished or deleted.
    jobTitle: {type: String, default: "", maxlength: 300},
    jobCompany: {type: String, default: "", maxlength: 200},

    name: {type: String, required: true, trim: true, maxlength: 120},
    mobile: {type: String, required: true, trim: true, maxlength: 30},
    // Last ten digits, so "+91 92178 01191" and "9217801191" are one person.
    mobileKey: {type: String, required: true},
    lmsId: {type: String, required: true, trim: true, maxlength: 40},

    consent: {type: Boolean, default: false},
    status: {type: String, enum: APPLICATION_STATUSES, default: "new", index: true},

    // Keyed hash, never the address itself (same scheme as Lead).
    ipHash: {type: String, default: "", maxlength: 64},
    userAgent: {type: String, default: "", maxlength: 400},
  },
  {timestamps: true},
);

jobApplicationSchema.index({job: 1, mobileKey: 1}, {unique: true});
jobApplicationSchema.index({createdAt: -1});

export const JobApplication = mongoose.model("JobApplication", jobApplicationSchema);
