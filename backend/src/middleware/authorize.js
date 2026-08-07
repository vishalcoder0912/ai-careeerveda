import {forbidden, unauthorized} from "../utils/apiError.js";
import {recordAudit} from "../services/audit.service.js";
import {AUDIT_ACTIONS} from "../models/AuditLog.js";
import {ROLES} from "../config/permissions.js";

// Deny by default. A route with no authorize() call and no authenticate() call
// is public; anything mounted under the admin router has both, and every
// protected handler names the permission it needs.
//
// Hiding a button in the admin UI is a courtesy to the user, not a control —
// the control is here, on the server, where a hand-crafted request also meets it.

export const requirePermission = (...permissions) => async (request, response, next) => {
  if (!request.admin) return next(unauthorized("Authentication required"));

  // All named permissions must be held, not any — a route that needs both read
  // and export should not be satisfied by read alone.
  const granted = permissions.every((permission) => request.permissions.includes(permission));

  if (!granted) {
    // Denials are audited. A burst of them is one of the clearest signals that
    // either an account is compromised or someone is probing the API.
    await recordAudit(request, {
      action: AUDIT_ACTIONS.PERMISSION_DENIED,
      actor: request.admin,
      metadata: {required: permissions, path: request.originalUrl, method: request.method},
      outcome: "failure",
    });

    return next(forbidden("You do not have permission to do that"));
  }

  return next();
};

export const requireSuperAdmin = async (request, response, next) => {
  if (!request.admin) return next(unauthorized("Authentication required"));

  if (request.admin.role !== ROLES.SUPER_ADMIN) {
    await recordAudit(request, {
      action: AUDIT_ACTIONS.PERMISSION_DENIED,
      actor: request.admin,
      metadata: {required: "super-admin", path: request.originalUrl, method: request.method},
      outcome: "failure",
    });

    return next(forbidden("This action requires a super-admin"));
  }

  return next();
};
