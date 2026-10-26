import {Admin} from "../models/Admin.js";
import {AUDIT_ACTIONS} from "../models/AuditLog.js";
import {recordAudit} from "../services/audit.service.js";
import {
  hashPassword,
  validatePasswordStrength,
  isPasswordReused,
  pushPasswordHistory,
} from "../services/password.service.js";
import {revokeAllForAdmin} from "../services/token.service.js";
import {ok} from "../utils/respond.js";
import {badRequest, notFound} from "../utils/apiError.js";

// What the account-management screen is allowed to know. passwordHash,
// passwordHistory and the TOTP secret are deliberately absent: the screen is
// about who can sign in, not about the credentials themselves.
const accountShape = (admin, viewerId) => {
  const lockIsLive =
    admin.lockedUntil && new Date(admin.lockedUntil).getTime() > Date.now();

  return {
    id: admin._id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    status: admin.status,
    mfaEnabled: Boolean(admin.totpEnabled),
    failedLoginAttempts: admin.failedLoginAttempts || 0,
    // An expired lockout is history, not a current restriction. Showing the
    // stale timestamp would make a perfectly usable account look locked.
    lockedUntil: lockIsLive ? admin.lockedUntil : null,
    lastLoginAt: admin.lastLoginAt || null,
    createdAt: admin.createdAt,
    isSelf: String(admin._id) === String(viewerId),
  };
};

export const list = async (request, response, next) => {
  try {
    const admins = await Admin.find({})
      .select(
        "name email role status totpEnabled failedLoginAttempts lockedUntil lastLoginAt createdAt",
      )
      .sort({createdAt: 1})
      .lean();

    return ok(
      response,
      admins.map((admin) => accountShape(admin, request.admin._id)),
    );
  } catch (error) {
    return next(error);
  }
};

export const resetPassword = async (request, response, next) => {
  try {
    const target = await Admin.findById(request.params.id).select(
      "+passwordHash +passwordHistory",
    );

    if (!target) return next(notFound("Admin account not found"));

    // Changing your own password is a different operation with a different
    // guarantee: the caller must prove the current password, and the response
    // replaces the session. Profile & security owns that flow. Sending someone
    // here would invalidate the session they are using and sign them out
    // mid-task, so point at the right screen instead.
    if (String(target._id) === String(request.admin._id)) {
      return next(
        badRequest("Use Profile & security to change your own password."),
      );
    }

    const {newPassword} = request.body;

    const weakness = validatePasswordStrength(newPassword, {
      email: target.email,
    });
    if (weakness) return next(badRequest(weakness, {newPassword: weakness}));

    if (await isPasswordReused(newPassword, target.passwordHistory)) {
      const message = "Choose a password this account has not used before.";
      return next(badRequest(message, {newPassword: message}));
    }

    target.passwordHistory = pushPasswordHistory(
      target.passwordHistory,
      target.passwordHash,
    );
    target.passwordHash = await hashPassword(newPassword);
    target.passwordChangedAt = new Date();
    // Invalidates every access token already issued to the account.
    target.tokenVersion = (target.tokenVersion || 0) + 1;
    // A reset is also the recovery path for a colleague who is locked out.
    target.failedLoginAttempts = 0;
    target.lockedUntil = null;
    // Deliberately NOT touching status or MFA. A suspended account must stay
    // suspended, and stripping a second factor is a separate decision that
    // deserves its own deliberate action.
    await target.save();

    // Anyone holding a refresh token for the account loses it: the password was
    // reset precisely because it may be in the wrong hands.
    await revokeAllForAdmin(target._id, "password-reset");

    await recordAudit(request, {
      action: AUDIT_ACTIONS.USER_PASSWORD_RESET,
      actor: request.admin,
      targetType: "Admin",
      targetId: target._id,
      // The email identifies which account was reset; the password itself is
      // never written to the audit trail.
      metadata: {email: target.email},
    });

    return ok(response, {
      reset: true,
      id: target._id,
      name: target.name,
      email: target.email,
    });
  } catch (error) {
    return next(error);
  }
};
