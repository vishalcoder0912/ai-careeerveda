import {Admin} from "../models/Admin.js";
import {verifyAccessToken} from "../services/token.service.js";
import {permissionsForRole} from "../config/permissions.js";
import {env} from "../config/env.js";
import {ApiError, unauthorized} from "../utils/apiError.js";

// Establishes who the caller is. Authority is decided separately, in authorize().
//
// This deliberately loads the admin from the database on every request rather
// than trusting the token's claims. It costs one indexed lookup and buys:
//   - suspending an account takes effect immediately, not in up to 15 minutes
//   - a role change applies to the very next request
//   - a password change invalidates in-flight access tokens
// For admin-panel traffic that trade is obviously correct.

export const authenticate = async (request, response, next) => {
  try {
    const header = request.get("authorization") || "";

    if (!header.startsWith("Bearer ")) {
      return next(unauthorized("Authentication required"));
    }

    const token = header.slice(7).trim();
    if (!token) return next(unauthorized("Authentication required"));

    let claims;
    try {
      claims = verifyAccessToken(token);
    } catch (error) {
      // Expired is distinguished from malformed so the SPA knows to refresh
      // rather than to bounce the user to the login screen. Both are 401; the
      // code differs.
      if (error && error.name === "TokenExpiredError") {
        return next(unauthorized("Access token expired"));
      }
      return next(unauthorized("Invalid access token"));
    }

    const admin = await Admin.findById(claims.sub);

    // Account deleted since the token was issued.
    if (!admin) return next(unauthorized("Invalid access token"));

    if (admin.status !== "active") return next(unauthorized("Account is not active"));

    // A lock deliberately does NOT end live sessions. Anyone who knows an
    // admin's email can trigger a lock from the login form, so honouring it here
    // let a stranger sign the real admin out at will. Lockout guards password
    // guessing; the one password check behind a token (change-password) refuses
    // while locked instead.

    if (admin.tokenIsStale(claims.tv)) {
      return next(unauthorized("Session ended. Please sign in again."));
    }

    // With MFA mandatory, an account that has not enrolled yet may reach only
    // the /auth routes — enough to enrol, see its sessions and sign out, and
    // nothing that touches content, leads or settings. A phished password for
    // an unenrolled account therefore opens no data at all.
    if (env.requireAdminMfa && !admin.totpEnabled && !request.originalUrl.startsWith("/api/v1/auth/")) {
      return next(
        new ApiError(403, "MFA_ENROLLMENT_REQUIRED", "Turn on two-factor sign-in under Profile & security to continue."),
      );
    }

    request.admin = admin;
    // Resolved fresh from the role, never read from the token.
    request.permissions = permissionsForRole(admin.role);

    return next();
  } catch (error) {
    return next(error);
  }
};
