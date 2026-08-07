import {Admin} from "../models/Admin.js";
import {RefreshToken} from "../models/RefreshToken.js";
import {AUDIT_ACTIONS} from "../models/AuditLog.js";
import {recordAudit} from "../services/audit.service.js";
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  isPasswordReused,
  pushPasswordHistory,
} from "../services/password.service.js";
import {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeFamily,
  revokeAllForAdmin,
  hashRefreshToken,
  ROTATION_OUTCOME,
} from "../services/token.service.js";
import {
  REFRESH_COOKIE,
  createCsrfToken,
  setAuthCookies,
  clearAuthCookies,
} from "../middleware/csrf.js";
import {permissionsForRole} from "../config/permissions.js";
import {logger} from "../config/logger.js";
import {ok} from "../utils/respond.js";
import {badRequest, unauthorized, notFound, ApiError} from "../utils/apiError.js";

// One message for every login failure, whatever the cause. Distinguishing
// "no such account" from "wrong password" turns the login form into an account
// enumeration oracle — and a list of real admin emails is the first thing a
// phishing campaign needs.
const LOGIN_FAILED = "Invalid email or password.";

const sessionPayload = (admin) => ({
  id: admin._id,
  name: admin.name,
  email: admin.email,
  role: admin.role,
  permissions: permissionsForRole(admin.role),
  lastLoginAt: admin.lastLoginAt,
});

const startSession = async (request, response, admin, statusFn = ok) => {
  const refreshToken = await issueRefreshToken(admin, {
    userAgent: request.get("user-agent"),
    ip: request.ip,
  });
  const csrfToken = createCsrfToken();

  setAuthCookies(response, {refreshToken, csrfToken});

  return statusFn(response, {
    accessToken: signAccessToken(admin),
    csrfToken,
    admin: sessionPayload(admin),
  });
};

export const login = async (request, response, next) => {
  try {
    const {email, password} = request.body;

    // The hash is select:false on the schema, so it must be asked for.
    // String() coerces before the value reaches the query: the zod schema on
    // the route already refuses anything else and sanitizeRequest strips
    // $-keys, but the value that decides which account is looked up should not
    // be shaped by whatever middleware happens to run first.
    const admin = await Admin.findOne({email: String(email)}).select("+passwordHash");

    if (!admin) {
      // Deliberately still hash something before answering. Returning
      // immediately makes "no such user" measurably faster than "wrong
      // password", which restores by timing exactly the enumeration the
      // identical message was meant to prevent.
      await verifyPassword("$argon2id$v=19$m=19456,t=2,p=1$Y2FyZWVydmVkYQ$0000000000000000000000000000000000000000000", password);

      await recordAudit(request, {
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        actorEmail: email,
        metadata: {reason: "no-such-account"},
        outcome: "failure",
      });

      return next(unauthorized(LOGIN_FAILED));
    }

    if (admin.isLocked()) {
      await recordAudit(request, {
        action: AUDIT_ACTIONS.LOGIN_LOCKED,
        actor: admin,
        outcome: "failure",
      });

      // The lockout IS disclosed, unlike the reasons above. The account already
      // proved it exists by being locked out, and a user who cannot get in
      // deserves to know it is temporary rather than assume a broken password.
      return next(
        new ApiError(423, "ACCOUNT_LOCKED", "Too many failed attempts. Try again shortly."),
      );
    }

    if (admin.status !== "active") {
      await recordAudit(request, {
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        actor: admin,
        metadata: {reason: "suspended"},
        outcome: "failure",
      });
      return next(unauthorized(LOGIN_FAILED));
    }

    if (!(await verifyPassword(admin.passwordHash, password))) {
      const lockedMinutes = await admin.registerFailedLogin();

      await recordAudit(request, {
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        actor: admin,
        metadata: {reason: "bad-password", attempts: admin.failedLoginAttempts, lockedMinutes},
        outcome: "failure",
      });

      return next(unauthorized(LOGIN_FAILED));
    }

    await admin.registerSuccessfulLogin();
    await recordAudit(request, {action: AUDIT_ACTIONS.LOGIN_SUCCESS, actor: admin});

    return startSession(request, response, admin);
  } catch (error) {
    return next(error);
  }
};

export const refresh = async (request, response, next) => {
  try {
    const presented = request.cookies && request.cookies[REFRESH_COOKIE];

    if (!presented) return next(unauthorized("No session to refresh"));

    const result = await rotateRefreshToken(presented, {
      userAgent: request.get("user-agent"),
      ip: request.ip,
    });

    if (result.outcome === ROTATION_OUTCOME.REUSE) {
      // The family is already revoked by rotateRefreshToken. Log it loudly:
      // this is the single strongest indicator of a stolen token in the whole
      // system, and it should page someone.
      logger.warn(
        {adminId: String(result.adminId), family: result.family, requestId: request.id},
        "Refresh token reuse detected; session family revoked",
      );

      const admin = await Admin.findById(result.adminId);
      await recordAudit(request, {
        action: AUDIT_ACTIONS.TOKEN_REUSE_DETECTED,
        actor: admin,
        metadata: {family: result.family},
        outcome: "failure",
      });

      clearAuthCookies(response);
      return next(unauthorized("Session ended for security reasons. Please sign in again."));
    }

    if (result.outcome !== ROTATION_OUTCOME.OK) {
      clearAuthCookies(response);
      return next(unauthorized("Session expired. Please sign in again."));
    }

    const admin = await Admin.findById(result.adminId);

    // The account was suspended or deleted while the session was live.
    if (!admin || admin.status !== "active") {
      await revokeFamily(result.family, "revoked-by-admin");
      clearAuthCookies(response);
      return next(unauthorized("Account is not active"));
    }

    const refreshToken = await result.issue(admin);
    const csrfToken = createCsrfToken();
    setAuthCookies(response, {refreshToken, csrfToken});

    await recordAudit(request, {action: AUDIT_ACTIONS.TOKEN_REFRESHED, actor: admin});

    return ok(response, {
      accessToken: signAccessToken(admin),
      csrfToken,
      admin: sessionPayload(admin),
    });
  } catch (error) {
    return next(error);
  }
};

export const logout = async (request, response, next) => {
  try {
    const presented = request.cookies && request.cookies[REFRESH_COOKIE];

    if (presented) {
      // Revoke the whole family, not just this token: logging out should end
      // the session lineage, otherwise a rotated-but-unused ancestor could
      // still be exchanged.
      const record = await RefreshToken.findOne({tokenHash: hashRefreshToken(presented)});
      if (record) {
        await revokeFamily(record.family, "logout");
        const admin = await Admin.findById(record.admin);
        await recordAudit(request, {action: AUDIT_ACTIONS.LOGOUT, actor: admin});
      }
    }

    clearAuthCookies(response);

    // 200 regardless. A logout that reports failure leaves the user unsure
    // whether they are signed out, and there is nothing they could do about it.
    return ok(response, {loggedOut: true});
  } catch (error) {
    return next(error);
  }
};

export const me = async (request, response, next) => {
  try {
    return ok(response, {admin: sessionPayload(request.admin)});
  } catch (error) {
    return next(error);
  }
};

export const listSessions = async (request, response, next) => {
  try {
    const sessions = await RefreshToken.find({
      admin: request.admin._id,
      revokedAt: null,
      usedAt: null,
      expiresAt: {$gt: new Date()},
    })
      .sort({createdAt: -1})
      .lean();

    // tokenHash is never included — it is the credential's only stored form,
    // and this endpoint is about recognising devices, not listing secrets.
    return ok(
      response,
      sessions.map((session) => ({
        id: session._id,
        userAgent: session.userAgent,
        ipPrefix: session.ipPrefix,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
      })),
    );
  } catch (error) {
    return next(error);
  }
};

export const revokeSession = async (request, response, next) => {
  try {
    const session = await RefreshToken.findOne({
      _id: request.params.id,
      // Scoped to the caller's own sessions. Without this clause any admin
      // could revoke any other admin's session by id — a straightforward IDOR.
      admin: request.admin._id,
    });

    if (!session) return next(notFound("Session not found"));

    await revokeFamily(session.family, "revoked-by-admin");

    await recordAudit(request, {
      action: AUDIT_ACTIONS.SESSION_REVOKED,
      actor: request.admin,
      targetType: "RefreshToken",
      targetId: session._id,
    });

    return ok(response, {revoked: true});
  } catch (error) {
    return next(error);
  }
};

export const changePassword = async (request, response, next) => {
  try {
    const {currentPassword, newPassword} = request.body;

    const admin = await Admin.findById(request.admin._id).select("+passwordHash +passwordHistory");

    if (!(await verifyPassword(admin.passwordHash, currentPassword))) {
      await recordAudit(request, {
        action: AUDIT_ACTIONS.PASSWORD_CHANGED,
        actor: admin,
        metadata: {reason: "wrong-current-password"},
        outcome: "failure",
      });
      return next(badRequest("Current password is incorrect", {currentPassword: "Incorrect"}));
    }

    const weakness = validatePasswordStrength(newPassword, {email: admin.email});
    if (weakness) return next(badRequest(weakness, {newPassword: weakness}));

    if (await isPasswordReused(newPassword, admin.passwordHistory)) {
      const message = "Please choose a password you have not used before.";
      return next(badRequest(message, {newPassword: message}));
    }

    const hash = await hashPassword(newPassword);

    admin.passwordHistory = pushPasswordHistory(admin.passwordHistory, admin.passwordHash);
    admin.passwordHash = hash;
    admin.passwordChangedAt = new Date();
    // Kills every access token already out there. The replacement session below
    // is signed after this, so it carries the new version and survives.
    admin.tokenVersion = (admin.tokenVersion || 0) + 1;
    await admin.save();

    // Every other session dies. The most common reason to change a password is
    // suspecting it was stolen, and leaving the thief's session alive would
    // make the change pointless.
    await revokeAllForAdmin(admin._id, "password-changed");

    await recordAudit(request, {action: AUDIT_ACTIONS.PASSWORD_CHANGED, actor: admin});

    // The caller gets a brand-new session so they are not logged out of the
    // device they just used to change it.
    return startSession(request, response, admin);
  } catch (error) {
    return next(error);
  }
};

