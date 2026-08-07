import {Admin} from "../models/Admin.js";
import {verifyAccessToken} from "../services/token.service.js";
import {permissionsForRole} from "../config/permissions.js";
import {unauthorized} from "../utils/apiError.js";

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

    // Locked out mid-session: stop honouring existing tokens too, otherwise
    // lockout only protects the login form and not an already-stolen token.
    if (admin.isLocked()) return next(unauthorized("Account is temporarily locked"));

    if (admin.tokenIsStale(claims.tv)) {
      return next(unauthorized("Session ended. Please sign in again."));
    }

    request.admin = admin;
    // Resolved fresh from the role, never read from the token.
    request.permissions = permissionsForRole(admin.role);

    return next();
  } catch (error) {
    return next(error);
  }
};
