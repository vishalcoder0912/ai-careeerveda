import mongoose from "mongoose";

// One document per issued refresh token.
//
// The token itself is never stored — only a SHA-256 of it. Anyone who reads
// this collection therefore gains nothing they can present to the API. (SHA-256
// rather than Argon2 here on purpose: the token is 32 bytes of CSPRNG output,
// so there is no low-entropy guess to slow down, and refresh runs on every page
// load where an 80 ms KDF would be felt.)
//
// `family` is what makes rotation detectable. Every token descended from one
// login shares a family id. Rotation marks the old token used and issues a new
// one in the same family; presenting a token that was already used means either
// a stolen token or a stolen copy of a legitimate one, and we cannot tell which
// — so the whole family is revoked and both parties have to log in again.

const refreshTokenSchema = new mongoose.Schema(
  {
    admin: {type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true, index: true},

    tokenHash: {type: String, required: true, unique: true},

    family: {type: String, required: true, index: true},

    expiresAt: {type: Date, required: true},

    // Set the moment the token is exchanged. A second exchange of the same
    // token finds this already populated — that is the reuse signal.
    usedAt: {type: Date, default: null},

    revokedAt: {type: Date, default: null},
    revokedReason: {
      type: String,
      enum: ["logout", "rotated", "reuse-detected", "password-changed", "revoked-by-admin", null],
      default: null,
    },

    // Kept for the "active sessions" screen so a user can recognise which
    // device a session belongs to. The IP is truncated rather than stored whole
    // (see auth.service) — enough to say "a different network", not enough to
    // be a location log.
    userAgent: {type: String, maxlength: 400, default: ""},
    ipPrefix: {type: String, maxlength: 64, default: ""},
  },
  {timestamps: true},
);

// TTL index: Mongo deletes the document once it expires, so the collection does
// not grow without bound. Revoked-but-unexpired rows stay until their natural
// expiry, which is what lets reuse detection still recognise them.
refreshTokenSchema.index({expiresAt: 1}, {expireAfterSeconds: 0});

// Supports "revoke this whole family" and "list this admin's live sessions".
refreshTokenSchema.index({family: 1, revokedAt: 1});

refreshTokenSchema.methods.isActive = function isActive() {
  return !this.revokedAt && !this.usedAt && this.expiresAt.getTime() > Date.now();
};

export const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);
