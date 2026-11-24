import mongoose from "mongoose";

// One learner applying to one CareerVeda-posted job. Separate from Lead on
// purpose: a lead is one row per phone number, ever, while a learner may apply
// to many jobs — but only once to each, which the unique index below enforces.

export const APPLICATION_STATUSES = [
  "new",
  "reviewing",
  "shortlisted",
  "rejected",
  "hired",
  "under_review",
  "interview_scheduled",
  "selected",
];

const statusHistorySchema = new mongoose.Schema(
  {
    from: {type: String, default: ""},
    to: {type: String, default: ""},
    changedAt: {type: Date, default: Date.now},
    changedBy: {type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null},
    note: {type: String, default: "", maxlength: 1000},
  },
  {_id: false},
);

const remarkSchema = new mongoose.Schema(
  {
    body: {type: String, required: true, maxlength: 2000},
    addedAt: {type: Date, default: Date.now},
    addedBy: {type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null},
  },
  {_id: false},
);

const resumeSchema = new mongoose.Schema(
  {
    resumeUrl: {type: String, default: "", maxlength: 2000},
    resumeFileId: {type: String, default: "", maxlength: 200},
    resumeFileName: {type: String, default: "", maxlength: 300},
    resumeFileSize: {type: Number, default: 0},
    resumeMimeType: {type: String, default: "", maxlength: 120},
    uploadedAt: {type: Date, default: null},
    imageKitFilePath: {type: String, default: "", maxlength: 1000},
  },
  {_id: false},
);

const jobApplicationSchema = new mongoose.Schema(
  {
    job: {type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true, index: true},
    // Snapshot of the listing as applied to, so the record still reads correctly
    // after the job is renamed, unpublished or deleted.
    jobTitle: {type: String, default: "", maxlength: 300},
    jobCompany: {type: String, default: "", maxlength: 200},

    name: {type: String, required: true, trim: true, maxlength: 120},
    fullName: {type: String, default: "", trim: true, maxlength: 120},
    mobile: {type: String, required: true, trim: true, maxlength: 30},
    phone: {type: String, default: "", trim: true, maxlength: 30},
    // Last ten digits, so "+91 92178 01191" and "9217801191" are one person.
    mobileKey: {type: String, required: true},
    email: {type: String, trim: true, lowercase: true, maxlength: 254, default: ""},

    currentLocation: {type: String, default: "", trim: true, maxlength: 200},
    gender: {type: String, default: "", trim: true, maxlength: 40},
    totalExperience: {type: String, default: "", trim: true, maxlength: 120},
    experience: {type: String, default: "", trim: true, maxlength: 120},
    currentEmploymentStatus: {type: String, default: "", trim: true, maxlength: 120},
    employmentStatus: {type: String, default: "", trim: true, maxlength: 120},
    linkedinUrl: {type: String, default: "", trim: true, maxlength: 500},
    portfolioUrl: {type: String, default: "", trim: true, maxlength: 500},
    coverLetter: {type: String, default: "", trim: true, maxlength: 5000},
    qualification: {type: String, default: "", trim: true, maxlength: 200},
    college: {type: String, default: "", trim: true, maxlength: 200},
    graduationYear: {type: String, default: "", trim: true, maxlength: 20},

    resume: {type: resumeSchema, default: () => ({})},
    resumeUrl: {type: String, default: "", maxlength: 2000},
    resumeFileId: {type: String, default: "", maxlength: 200},
    resumeFileName: {type: String, default: "", maxlength: 300},
    resumeFileSize: {type: Number, default: 0},
    resumeMimeType: {type: String, default: "", maxlength: 120},
    uploadedAt: {type: Date, default: null},
    imageKitFilePath: {type: String, default: "", maxlength: 1000},

    consent: {type: Boolean, default: false},
    status: {type: String, enum: APPLICATION_STATUSES, default: "new", index: true},
    applicationStatus: {type: String, default: "new", maxlength: 40},
    statusHistory: {type: [statusHistorySchema], default: []},
    adminRemarks: {type: [remarkSchema], default: []},

    appliedAt: {type: Date, default: null},

    // Keyed hash, never the address itself (same scheme as Lead).
    ipHash: {type: String, default: "", maxlength: 64},
    userAgent: {type: String, default: "", maxlength: 400},
  },
  {timestamps: true},
);

jobApplicationSchema.index({job: 1, mobileKey: 1}, {unique: true});
jobApplicationSchema.index({createdAt: -1});

export const JobApplication = mongoose.model("JobApplication", jobApplicationSchema);
