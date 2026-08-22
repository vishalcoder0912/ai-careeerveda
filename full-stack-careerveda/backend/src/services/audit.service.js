import {AuditLog} from "../models/AuditLog.js";
import {logger} from "../config/logger.js";
import {ipPrefixOf} from "./token.service.js";

// Writing an audit row must never be the reason a legitimate request fails —
// if the collection is unavailable we log loudly and let the action complete.
// The alternative (failing the request) means a database hiccup locks everyone
// out of the admin panel, which is a worse outcome than a gap in the trail.
export const recordAudit = async (request, {action, actor, targetType, targetId, metadata, outcome = "success", actorEmail}) => {
  try {
    await AuditLog.create({
      action,
      actor: actor ? actor._id : null,
      actorEmail: actorEmail || (actor ? actor.email : null),
      actorRole: actor ? actor.role : null,
      targetType: targetType || null,
      targetId: targetId ? String(targetId) : null,
      metadata: metadata || {},
      ipPrefix: ipPrefixOf(request && request.ip),
      userAgent: String((request && request.get && request.get("user-agent")) || "").slice(0, 400),
      requestId: request ? request.id : null,
      outcome,
    });
  } catch (error) {
    // Neither the error object nor the action. A mongoose write error carries
    // the whole rejected document on `err`, and that document is an audit row —
    // actor email, IP prefix, user agent. The action name is audit-event detail
    // in its own right ("auth.password.reset-requested" says an account is
    // mid-reset). Both belong in the audit collection, which has its own
    // retention and its own audience; the application log has neither.
    //
    // requestId is the join key that makes the entry identifiable anyway: the
    // pino-http line for the same request carries the method and path, which is
    // what says which action was lost.
    const reason = String((error && error.message) || "unknown").slice(0, 300);
    logger.error({requestId: request ? request.id : null, reason}, "Failed to write audit log entry");
  }
};
