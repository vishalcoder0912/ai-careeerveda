import * as service from "../services/content.service.js";
import {CONTENT_STATUS} from "../models/plugins/contentPlugin.js";
import {AUDIT_ACTIONS} from "../models/AuditLog.js";
import {recordAudit} from "../services/audit.service.js";
import {ok, created, paginated} from "../utils/respond.js";

// Builds the full set of handlers for one resource from its registry entry.
// Every resource therefore behaves identically, and a fix to (say) the audit
// metadata on delete applies everywhere at once.

export const makeContentController = (resource) => {
  const {model: Model, name, label} = resource;

  const audit = (request, action, document, metadata) =>
    recordAudit(request, {
      action,
      actor: request.admin,
      targetType: name,
      targetId: document && document._id,
      metadata: {label, slug: document && document.slug, ...metadata},
    });

  return {
    list: async (request, response, next) => {
      try {
        const options = {
          // The admin list sorts by adminSort when a resource sets one (blogs
          // and jobs use updatedAt so drafts do not sink out of view); the
          // public listing keeps defaultSort. An explicit ?sort in the query
          // still wins over both.
          ...request.query,
          ...service.mergeSort(resource.adminSort || resource.defaultSort, request.query),
        };
        const {items, total, page, limit} = await service.listContent(Model, options);
        return paginated(response, items, {page, limit, total});
      } catch (error) {
        return next(error);
      }
    },

    getById: async (request, response, next) => {
      try {
        const document = await service.findById(Model, request.params.id, {includeDeleted: true});
        return ok(response, document);
      } catch (error) {
        return next(error);
      }
    },

    getBySlug: async (request, response, next) => {
      try {
        const document = await service.findBySlug(Model, request.params.slug);
        return ok(response, document);
      } catch (error) {
        return next(error);
      }
    },

    create: async (request, response, next) => {
      try {
        const document = await service.createContent(Model, request.body, {
          actor: request.admin,
          resource: name,
        });
        await audit(request, AUDIT_ACTIONS.CONTENT_CREATED, document);
        return created(response, document);
      } catch (error) {
        return next(error);
      }
    },

    update: async (request, response, next) => {
      try {
        const {revision, ...data} = request.body;
        const document = await service.updateContent(Model, request.params.id, data, {
          actor: request.admin,
          resource: name,
          expectedRevision: revision,
        });
        await audit(request, AUDIT_ACTIONS.CONTENT_UPDATED, document, {revision: document.revision});
        return ok(response, document);
      } catch (error) {
        return next(error);
      }
    },

    publish: async (request, response, next) => {
      try {
        const {scheduledAt} = request.body;
        // A future date means schedule; no date means publish now. One endpoint
        // rather than two, because to an editor they are the same decision.
        const status = scheduledAt ? CONTENT_STATUS.SCHEDULED : CONTENT_STATUS.PUBLISHED;

        const document = await service.setStatus(Model, request.params.id, status, {
          actor: request.admin,
          scheduledAt,
        });

        await audit(request, AUDIT_ACTIONS.CONTENT_PUBLISHED, document, {status, scheduledAt});
        return ok(response, document);
      } catch (error) {
        return next(error);
      }
    },

    unpublish: async (request, response, next) => {
      try {
        const document = await service.setStatus(Model, request.params.id, CONTENT_STATUS.DRAFT, {
          actor: request.admin,
        });
        await audit(request, AUDIT_ACTIONS.CONTENT_UNPUBLISHED, document);
        return ok(response, document);
      } catch (error) {
        return next(error);
      }
    },

    // Also the reject action: rejecting a synced job is archiving it with a
    // reason attached, which is the same state transition and the same audit
    // entry. A separate endpoint would be two names for one thing.
    archive: async (request, response, next) => {
      try {
        const {reason} = request.body || {};
        const document = await service.setStatus(Model, request.params.id, CONTENT_STATUS.ARCHIVED, {
          actor: request.admin,
          reason,
        });
        await audit(request, AUDIT_ACTIONS.CONTENT_UNPUBLISHED, document, {archived: true, reason});
        return ok(response, document);
      } catch (error) {
        return next(error);
      }
    },

    submitForReview: async (request, response, next) => {
      try {
        const document = await service.setStatus(Model, request.params.id, CONTENT_STATUS.IN_REVIEW, {
          actor: request.admin,
        });
        await audit(request, AUDIT_ACTIONS.CONTENT_UPDATED, document, {status: "in-review"});
        return ok(response, document);
      } catch (error) {
        return next(error);
      }
    },

    remove: async (request, response, next) => {
      try {
        const document = await service.softDelete(Model, request.params.id, {actor: request.admin});
        await audit(request, AUDIT_ACTIONS.CONTENT_DELETED, document);
        return ok(response, {deleted: true, id: document._id});
      } catch (error) {
        return next(error);
      }
    },

    restore: async (request, response, next) => {
      try {
        const document = await service.restore(Model, request.params.id, {actor: request.admin});
        await audit(request, AUDIT_ACTIONS.CONTENT_RESTORED, document);
        return ok(response, document);
      } catch (error) {
        return next(error);
      }
    },

    purge: async (request, response, next) => {
      try {
        // Audited before the delete, because afterwards there is no document to
        // describe in the log entry.
        const target = await service.findById(Model, request.params.id, {includeDeleted: true});
        await audit(request, AUDIT_ACTIONS.CONTENT_PURGED, target);

        const result = await service.purge(Model, request.params.id, {resource: name});
        return ok(response, result);
      } catch (error) {
        return next(error);
      }
    },

    duplicate: async (request, response, next) => {
      try {
        const document = await service.duplicateContent(Model, request.params.id, {
          actor: request.admin,
          resource: name,
        });
        await audit(request, AUDIT_ACTIONS.CONTENT_CREATED, document, {duplicatedFrom: request.params.id});
        return created(response, document);
      } catch (error) {
        return next(error);
      }
    },

    revisions: async (request, response, next) => {
      try {
        return ok(response, await service.listRevisions(name, request.params.id));
      } catch (error) {
        return next(error);
      }
    },

    rollback: async (request, response, next) => {
      try {
        const document = await service.rollback(
          Model,
          request.params.id,
          Number(request.params.revision),
          {actor: request.admin, resource: name},
        );
        await audit(request, AUDIT_ACTIONS.CONTENT_UPDATED, document, {
          rolledBackTo: request.params.revision,
        });
        return ok(response, document);
      } catch (error) {
        return next(error);
      }
    },

    reorder: async (request, response, next) => {
      try {
        const result = await service.reorder(Model, request.body.items, {actor: request.admin});
        await recordAudit(request, {
          action: AUDIT_ACTIONS.CONTENT_UPDATED,
          actor: request.admin,
          targetType: name,
          metadata: {reordered: result.modified},
        });
        return ok(response, result);
      } catch (error) {
        return next(error);
      }
    },

    bulkStatus: async (request, response, next) => {
      try {
        const {ids, status} = request.body;
        const result = await service.bulkSetStatus(Model, ids, status, {actor: request.admin});
        await recordAudit(request, {
          action:
            status === CONTENT_STATUS.PUBLISHED
              ? AUDIT_ACTIONS.CONTENT_PUBLISHED
              : AUDIT_ACTIONS.CONTENT_UPDATED,
          actor: request.admin,
          targetType: name,
          metadata: {bulk: true, count: result.modified, status, ids},
        });
        return ok(response, result);
      } catch (error) {
        return next(error);
      }
    },

    bulkDelete: async (request, response, next) => {
      try {
        const result = await service.bulkSoftDelete(Model, request.body.ids, {actor: request.admin});
        await recordAudit(request, {
          action: AUDIT_ACTIONS.CONTENT_DELETED,
          actor: request.admin,
          targetType: name,
          metadata: {bulk: true, count: result.modified, ids: request.body.ids},
        });
        return ok(response, result);
      } catch (error) {
        return next(error);
      }
    },

    bulkRestore: async (request, response, next) => {
      try {
        const result = await service.bulkRestore(Model, request.body.ids, {actor: request.admin});
        await recordAudit(request, {
          action: AUDIT_ACTIONS.CONTENT_RESTORED,
          actor: request.admin,
          targetType: name,
          metadata: {bulk: true, count: result.modified, ids: request.body.ids},
        });
        return ok(response, result);
      } catch (error) {
        return next(error);
      }
    },
  };
};
