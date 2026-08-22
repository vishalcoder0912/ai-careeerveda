import mongoose from "mongoose";

// Append-only record of who did what.
//
// Immutability is enforced by pre-hooks below rather than by convention: an
// audit trail an attacker can edit after the fact is worse than none, because
// it is trusted. Nothing in the application layer can update or delete a row;
// removing one requires database-level access, which is itself auditable.

export const AUDIT_ACTIONS = Object.freeze({
  LOGIN_SUCCESS: "auth.login.success",
  LOGIN_FAILED: "auth.login.failed",
  LOGIN_LOCKED: "auth.login.locked",
  LOGOUT: "auth.logout",
  TOKEN_REFRESHED: "auth.token.refreshed",
  TOKEN_REUSE_DETECTED: "auth.token.reuse-detected",
  SESSION_REVOKED: "auth.session.revoked",
  PASSWORD_CHANGED: "auth.password.changed",
  PERMISSION_DENIED: "auth.permission.denied",

  USER_CREATED: "user.created",
  USER_UPDATED: "user.updated",
  USER_ROLE_CHANGED: "user.role-changed",
  USER_DELETED: "user.deleted",

  CONTENT_CREATED: "content.created",
  CONTENT_UPDATED: "content.updated",
  CONTENT_PUBLISHED: "content.published",
  CONTENT_UNPUBLISHED: "content.unpublished",
  CONTENT_DELETED: "content.deleted",
  CONTENT_RESTORED: "content.restored",
  CONTENT_PURGED: "content.purged",

  MEDIA_UPLOADED: "media.uploaded",
  MEDIA_DELETED: "media.deleted",

  LEAD_UPDATED: "lead.updated",
  LEAD_DELETED: "lead.deleted",
  LEAD_EXPORTED: "lead.exported",

  SETTINGS_UPDATED: "settings.updated",
});

const auditLogSchema = new mongoose.Schema(
  {
    action: {type: String, required: true, index: true},

    // Null for a failed login: we record the attempt without asserting an
    // identity we could not verify. `actorEmail` carries what was claimed.
    actor: {type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null, index: true},
    actorEmail: {type: String, default: null, maxlength: 254},
    actorRole: {type: String, default: null},

    // What was acted on, when the action targets a record.
    targetType: {type: String, default: null},
    targetId: {type: String, default: null},

    // Small, deliberately-chosen details only — never a whole request body,
    // which is how passwords and tokens end up in logs.
    metadata: {type: mongoose.Schema.Types.Mixed, default: {}},

    ipPrefix: {type: String, default: "", maxlength: 64},
    userAgent: {type: String, default: "", maxlength: 400},
    requestId: {type: String, default: null},

    outcome: {type: String, enum: ["success", "failure"], default: "success"},
  },
  {timestamps: {createdAt: true, updatedAt: false}},
);

// The audit screen is almost always "most recent first", optionally filtered by
// actor or action; this compound index serves both without a collection scan.
auditLogSchema.index({createdAt: -1});
auditLogSchema.index({actor: 1, createdAt: -1});
auditLogSchema.index({action: 1, createdAt: -1});

const refuse = function refuse(next) {
  next(new Error("Audit log entries are immutable"));
};

for (const hook of ["updateOne", "updateMany", "findOneAndUpdate", "deleteOne", "deleteMany", "findOneAndDelete"]) {
  auditLogSchema.pre(hook, refuse);
}

auditLogSchema.pre("save", function preventEdit(next) {
  if (!this.isNew) return next(new Error("Audit log entries are immutable"));
  return next();
});

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
