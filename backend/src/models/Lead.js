import mongoose from "mongoose";

// Replaces the `consultations` and `enrollments` collections written by
// api/consultation.js and api/enroll.js. One collection with a `type`, because
// they carry the same fields and the admin wants one inbox, not two.
//
// The de-duplication keys are carried over from api/enroll.js unchanged:
// emailKey is the lowercased email, mobileKey the last ten digits. That is what
// makes "+91 92178 01191" and "9217801191" count as the same person.
//
// The phone number is the primary key: it is unique across every lead, so the
// same person can never fill in any form a second time.

export const LEAD_TYPES = ["consultation", "enrollment", "contact", "newsletter"];
export const LEAD_STATUSES = ["new", "contacted", "qualified", "converted", "closed", "spam"];

const noteSchema = new mongoose.Schema(
  {
    body: {type: String, required: true, maxlength: 4000},
    author: {type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null},
    createdAt: {type: Date, default: Date.now},
  },
  {_id: true},
);

const leadSchema = new mongoose.Schema(
  {
    type: {type: String, enum: LEAD_TYPES, required: true, index: true},

    name: {type: String, required: true, trim: true, maxlength: 120},
    email: {type: String, required: true, trim: true, maxlength: 254},
    mobile: {type: String, required: true, trim: true, maxlength: 30},
    userType: {type: String, default: "", maxlength: 60},

    program: {type: String, default: "", maxlength: 300},
    message: {type: String, default: "", maxlength: 4000},

    // Normalised lookup keys. Indexed together because the cap check queries
    // them with $or on every enrollment submission.
    emailKey: {type: String, required: true, index: true},
    // mobileKey gets no field-level index of its own: the unique index below is
    // the only one it needs, and two indexes on the same key are pure waste.
    mobileKey: {type: String, required: true},

    // Which page the form was on, e.g. "enroll-page".
    source: {type: String, default: "", maxlength: 120},
    sourcePage: {type: String, default: "", maxlength: 300},

    utm: {
      source: {type: String, default: "", maxlength: 200},
      medium: {type: String, default: "", maxlength: 200},
      campaign: {type: String, default: "", maxlength: 200},
      term: {type: String, default: "", maxlength: 200},
      content: {type: String, default: "", maxlength: 200},
    },

    consent: {type: Boolean, default: false},

    status: {type: String, enum: LEAD_STATUSES, default: "new", index: true},
    assignedTo: {type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null},
    notes: {type: [noteSchema], default: []},

    // 0-100. Currently driven by the honeypot and duplicate heuristics; the
    // field exists so a CAPTCHA or scoring service can feed it later without a
    // migration.
    spamScore: {type: Number, default: 0, min: 0, max: 100},

    archived: {type: Boolean, default: false, index: true},

    // A one-way hash, never the address itself. Enough to recognise a burst of
    // submissions from one source; not a stored identifier for a person who
    // only filled in a contact form. Salted with a server secret so the space
    // of IPv4 addresses cannot simply be enumerated against it.
    ipHash: {type: String, default: "", maxlength: 64},
    userAgent: {type: String, default: "", maxlength: 400},

    // Client-supplied key that makes a retried submission idempotent, so a
    // double-tap or a network retry does not create a second lead.
    idempotencyKey: {type: String, default: null, maxlength: 100},
  },
  {timestamps: true},
);

// The inbox: newest first, filtered by status or type.
leadSchema.index({archived: 1, createdAt: -1});
leadSchema.index({type: 1, status: 1, createdAt: -1});
// The phone number is a unique primary key. Every lead carries a mobileKey, so
// unlike idempotencyKey there is never an absent-field collision — the plain
// unique index is expressible even on Firestore compatibility, where partial
// unique indexes are not.
leadSchema.index({mobileKey: 1}, {unique: true});
// Admin inbox lookups: search by email and phone together goes through here.
leadSchema.index({emailKey: 1, mobileKey: 1});
// Idempotency lookups. The controller checks the key before writing (and still
// maps a duplicate-key write error), so idempotency is enforced at the app
// layer.
//
// Firestore with MongoDB compatibility cannot express Mongo's partial unique
// index (partialFilterExpression is unsupported), and a plain unique index
// would reject every lead without a key: Firebase indexes absent fields as
// null, so the second submission with idempotencyKey: null would collide. The
// plain index here stays for the lookup.
leadSchema.index({idempotencyKey: 1});

export const Lead = mongoose.model("Lead", leadSchema);

// The phone number is the primary key, so this is the cap the controller
// enforces on every submission before anything is written.
export const MAX_SUBMISSIONS_PER_PHONE = 1;
