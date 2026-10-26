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
import {
  generateSecret,
  verifyCode,
  otpauthUrl,
  encryptSecret,
  decryptSecret,
} from "../services/totp.service.js";
import {permissionsForRole} from "../config/permissions.js";
import {env} from "../config/env.js";
import {logger} from "../config/logger.js";
import {ok} from "../utils/respond.js";
import {ApiError, badRequest, unauthorized, notFound, conflict} from "../utils/apiError.js";

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
  mfaEnabled: Boolean(admin.totpEnabled),
  mfaRequired: env.requireAdminMfa,
});

// ── Second factor ───────────────────────────────────────────────────────────

const MFA_REQUIRED = () =>
  new ApiError(401, "MFA_REQUIRED", "Enter the 6-digit code from your authenticator app.");
const MFA_INVALID = () =>
  new ApiError(401, "MFA_INVALID", "That code is not valid. Enter the current code from your app.", {
    fields: {totp: "Invalid code"},
  });

// Verifies a code against the stored secret and spends it. The spend is one
// conditional write, so two requests racing with the same code cannot both
// succeed — the same shape as refresh-token rotation.
const consumeCode = async (adminId, code) => {
  const stored = await Admin.findById(adminId).select("+totpSecret +totpLastStep").lean();
  const secret = stored && decryptSecret(stored.totpSecret);
  if (!secret) return false;

  const step = verifyCode(secret, code, {lastUsedStep: stored.totpLastStep || 0});
  if (step === null) return false;

  const claimed = await Admin.updateOne({_id: adminId, totpLastStep: {$lt: step}}, {$set: {totpLastStep: step}});
  return claimed.modifiedCount === 1;
};

// Re-authentication for the endpoints that change how an account signs in.
// A stolen access token alone must not be enough to enrol the thief's phone or
// strip the owner's — both need the password, and wrong guesses count toward
// the same lockout as the login form.
const confirmPassword = async (admin, password) => {
  if (admin.isLocked()) return unauthorized("Too many incorrect attempts. Please try again later.");
  if (await verifyPassword(admin.passwordHash, password)) return null;
  await admin.registerFailedLogin();
  return badRequest("Password is incorrect", {password: "Incorrect"});
};

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
      // Same work and same answer as a wrong password. A distinct "locked" reply
      // was an enumeration oracle: unknown emails never lock, so a few bad
      // guesses per address told an attacker which ones were real admins.
      await verifyPassword(admin.passwordHash, password);

      await recordAudit(request, {
        action: AUDIT_ACTIONS.LOGIN_LOCKED,
        actor: admin,
        outcome: "failure",
      });

      return next(unauthorized(LOGIN_FAILED));
    }

    if (admin.status !== "active") {
      // Hash anyway, so a suspended account answers in the same time as a wrong
      // password and cannot be told apart by timing.
      await verifyPassword(admin.passwordHash, password);
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

    if (admin.totpEnabled) {
      // The password was right; only now is the second factor asked for. A
      // missing code is not a failed attempt — the panel shows the code step.
      const {totp} = request.body;
      if (!totp) return next(MFA_REQUIRED());

      if (!(await consumeCode(admin._id, totp))) {
        await admin.registerFailedLogin();
        await recordAudit(request, {
          action: AUDIT_ACTIONS.MFA_FAILED,
          actor: admin,
          metadata: {stage: "login"},
          outcome: "failure",
        });
        return next(MFA_INVALID());
      }
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

    // A stolen access token must not become an unlimited password oracle: once
    // wrong guesses here lock the account, no more are checked until it lapses.
    if (admin.isLocked()) {
      return next(unauthorized("Too many incorrect attempts. Please try again later."));
    }

    if (!(await verifyPassword(admin.passwordHash, currentPassword))) {
      // A stolen access token must not become an unlimited password oracle, so
      // these guesses count toward the login lockout — and authenticate() stops
      // honouring the token once the account locks.
      await admin.registerFailedLogin();
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


// Step 1 of enrolment: mint a secret and hand it to the authenticator app. It
// is stored but inert until /mfa/enable proves the app produces valid codes, so
// a half-finished setup can never lock the owner out.
export const mfaSetup = async (request, response, next) => {
  try {
    const admin = await Admin.findById(request.admin._id).select("+passwordHash");
    if (admin.totpEnabled) return next(conflict("Two-factor sign-in is already on."));

    const refused = await confirmPassword(admin, request.body.password);
    if (refused) return next(refused);

    const secret = generateSecret();
    admin.totpSecret = encryptSecret(secret);
    await admin.save();

    return ok(response, {secret, otpauthUrl: otpauthUrl(secret, admin.email)});
  } catch (error) {
    return next(error);
  }
};

// Step 2: the first valid code switches MFA on. Every other session ends,
// because they were all established with the password alone.
export const mfaEnable = async (request, response, next) => {
  try {
    const admin = await Admin.findById(request.admin._id).select("+totpSecret");
    if (admin.totpEnabled) return next(conflict("Two-factor sign-in is already on."));

    const secret = decryptSecret(admin.totpSecret);
    if (!secret) return next(badRequest("Start two-factor setup first."));

    const step = verifyCode(secret, request.body.code);
    if (step === null) {
      await recordAudit(request, {
        action: AUDIT_ACTIONS.MFA_FAILED,
        actor: admin,
        metadata: {stage: "enable"},
        outcome: "failure",
      });
      return next(badRequest("That code is not valid. Check the time on your phone and try again.", {code: "Invalid code"}));
    }

    admin.totpEnabled = true;
    admin.totpLastStep = step;
    admin.tokenVersion = (admin.tokenVersion || 0) + 1;
    await admin.save();
    await revokeAllForAdmin(admin._id, "mfa-enabled");

    await recordAudit(request, {action: AUDIT_ACTIONS.MFA_ENABLED, actor: admin});
    return startSession(request, response, admin);
  } catch (error) {
    return next(error);
  }
};

// Turning MFA off needs both factors: the password AND a current code. A lost
// phone is an operator reset (`seed:admin -- --reset`), never a self-service
// path an attacker holding only the password could use.
export const mfaDisable = async (request, response, next) => {
  try {
    const admin = await Admin.findById(request.admin._id).select("+passwordHash");
    if (!admin.totpEnabled) return next(badRequest("Two-factor sign-in is not on."));

    const refused = await confirmPassword(admin, request.body.password);
    if (refused) return next(refused);

    if (!(await consumeCode(admin._id, request.body.code))) {
      await admin.registerFailedLogin();
      await recordAudit(request, {
        action: AUDIT_ACTIONS.MFA_FAILED,
        actor: admin,
        metadata: {stage: "disable"},
        outcome: "failure",
      });
      return next(badRequest("That code is not valid.", {code: "Invalid code"}));
    }

    admin.totpEnabled = false;
    admin.totpSecret = null;
    admin.totpLastStep = 0;
    admin.tokenVersion = (admin.tokenVersion || 0) + 1;
    await admin.save();
    await revokeAllForAdmin(admin._id, "mfa-disabled");

    await recordAudit(request, {action: AUDIT_ACTIONS.MFA_DISABLED, actor: admin});
    return startSession(request, response, admin);
  } catch (error) {
    return next(error);
  }
};
