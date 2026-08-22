import mongoose from "mongoose";

import {ROLE_NAMES, ROLES} from "../config/permissions.js";

// Failed logins lock the account for progressively longer. The first few are
// almost always a real person misremembering, so the early penalty is small;
// by the time an attacker has spent 8 guesses the window is long enough that
// online brute force is pointless.
const LOCK_STEPS = [
  {attempts: 5, minutes: 1},
  {attempts: 7, minutes: 5},
  {attempts: 10, minutes: 30},
  {attempts: 15, minutes: 240},
];

const adminSchema = new mongoose.Schema(
  {
    name: {type: String, required: true, trim: true, maxlength: 120},

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },

    // `select: false` so a stray `Admin.find()` cannot serialise the hash into
    // a response. Reading it requires asking for it explicitly.
    passwordHash: {type: String, required: true, select: false},

    role: {type: String, enum: ROLE_NAMES, default: ROLES.VIEWER, required: true},

    status: {type: String, enum: ["active", "suspended"], default: "active"},

    // Displayed on the security screen. NOT used to invalidate tokens — see
    // tokenVersion for why a timestamp cannot do that job.
    passwordChangedAt: {type: Date, default: Date.now},

    // Incremented whenever every existing access token must stop working: a
    // password change, a reset, an admin-forced sign-out.
    //
    // A timestamp comparison was the obvious approach and does not work. JWT
    // `iat` has one-second resolution, so a token minted in the same second as
    // the change is indistinguishable from one minted just before it — and the
    // replacement session issued by changePassword() lands in exactly that
    // second, so any rule strict enough to kill the old tokens also kills the
    // caller's new one. A counter has no such ambiguity: old tokens carry the
    // old number, the replacement carries the new one.
    tokenVersion: {type: Number, default: 0},

    // Hashes of recent passwords, so a forced rotation cannot be satisfied by
    // setting the same password again. Capped — this is reuse prevention, not
    // an archive, and every retained hash is one more thing worth stealing.
    passwordHistory: {type: [String], default: [], select: false},

    failedLoginAttempts: {type: Number, default: 0},
    lockedUntil: {type: Date, default: null},

    lastLoginAt: {type: Date, default: null},

    // Architecture for TOTP is present so enabling it later does not require a
    // migration. The secret is select:false and encrypted at rest by Atlas.
    totpSecret: {type: String, default: null, select: false},
    totpEnabled: {type: Boolean, default: false},

    createdBy: {type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null},
  },
  {
    timestamps: true,
    // Strips the hash and internal auth state from anything that reaches
    // res.json, even if a controller forgets to serialise deliberately.
    toJSON: {
      transform: (document, output) => {
        delete output.passwordHash;
        delete output.passwordHistory;
        delete output.totpSecret;
        delete output.__v;
        return output;
      },
    },
  },
);

// email already has a unique index from the field definition. This one supports
// the "list active admins by role" screen without scanning the collection.
adminSchema.index({status: 1, role: 1});

adminSchema.methods.isLocked = function isLocked() {
  return Boolean(this.lockedUntil && this.lockedUntil.getTime() > Date.now());
};

// Returns the lock duration earned by the current attempt count, or null while
// the account is still below the first threshold.
adminSchema.methods.registerFailedLogin = async function registerFailedLogin() {
  this.failedLoginAttempts += 1;

  const step = [...LOCK_STEPS].reverse().find(({attempts}) => this.failedLoginAttempts >= attempts);

  if (step) this.lockedUntil = new Date(Date.now() + step.minutes * 60 * 1000);

  await this.save();
  return step ? step.minutes : null;
};

adminSchema.methods.registerSuccessfulLogin = async function registerSuccessfulLogin() {
  this.failedLoginAttempts = 0;
  this.lockedUntil = null;
  this.lastLoginAt = new Date();
  await this.save();
};

// A token is stale when its embedded version no longer matches the account's.
// A token predating the field entirely (undefined) counts as version 0.
adminSchema.methods.tokenIsStale = function tokenIsStale(tokenVersion) {
  return (tokenVersion || 0) !== (this.tokenVersion || 0);
};

export const Admin = mongoose.model("Admin", adminSchema);
export const PASSWORD_HISTORY_LIMIT = 5;
