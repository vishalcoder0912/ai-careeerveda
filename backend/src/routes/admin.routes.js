import {Router} from "express";

import {RESOURCES} from "../config/resources.js";
import {makeContentController} from "../controllers/content.controller.js";
import {authenticate} from "../middleware/authenticate.js";
import {requirePermission, requireSuperAdmin} from "../middleware/authorize.js";
import {validate} from "../middleware/validate.js";
import {adminLimiter} from "../middleware/rateLimit.js";
import {PERMISSIONS} from "../config/permissions.js";
import {
  listQuery,
  idParam,
  slugParam,
  publishBody,
  archiveBody,
  contentBody,
  updateBody,
  bulkBody,
  bulkStatusBody,
  reorderBody,
  rollbackParam,
} from "../validators/content.validators.js";

export const adminRouter = Router();

// Authentication for everything under /admin, applied at the router rather than
// per route. A new route added below is protected by default; forgetting to add
// a guard cannot expose it.
adminRouter.use(adminLimiter, authenticate);

for (const resource of Object.values(RESOURCES)) {
  // A code-authored resource gets no admin routes at all — not read, not write.
  // Skipping the mount is the whole control: there is no handler to reach, so no
  // permission grant, forged request or later-added route can touch it. The
  // model and the public read routes stay, because the mirror is still served.
  if (resource.codeAuthored) continue;

  const controller = makeContentController(resource);
  const {read, create, update, delete: destroy} = resource.permissions;
  const router = Router();

  // Ordering matters: /trash and /reorder are literal paths that would
  // otherwise be captured by /:id.
  router.get("/", validate({query: listQuery}), requirePermission(read), controller.list);
  // contentBody, not the bare schema: a create can arrive from Duplicate, which
  // is a whole record round-tripped through the panel and therefore carries the
  // same nulls an update does.
  router.post("/", validate({body: contentBody(resource.body)}), requirePermission(create), controller.create);

  router.post(
    "/reorder",
    validate({body: reorderBody}),
    requirePermission(update),
    controller.reorder,
  );
  router.post(
    "/bulk/status",
    validate({body: bulkStatusBody}),
    requirePermission(update),
    controller.bulkStatus,
  );
  router.post(
    "/bulk/delete",
    validate({body: bulkBody}),
    requirePermission(destroy),
    controller.bulkDelete,
  );
  router.post(
    "/bulk/restore",
    validate({body: bulkBody}),
    requirePermission(destroy),
    controller.bulkRestore,
  );

  router.get("/slug/:slug", validate({params: slugParam}), requirePermission(read), controller.getBySlug);

  router.get("/:id", validate({params: idParam}), requirePermission(read), controller.getById);
  router.patch(
    "/:id",
    validate({params: idParam, body: updateBody(resource.body)}),
    requirePermission(update),
    controller.update,
  );
  // PUT is an alias for PATCH here. The admin form always sends the whole
  // document, so a distinct full-replace semantic would only be a way to wipe
  // fields the form did not happen to render.
  router.put(
    "/:id",
    validate({params: idParam, body: updateBody(resource.body)}),
    requirePermission(update),
    controller.update,
  );

  router.post(
    "/:id/publish",
    validate({params: idParam, body: publishBody}),
    requirePermission(update),
    controller.publish,
  );
  router.post("/:id/unpublish", validate({params: idParam}), requirePermission(update), controller.unpublish);
  router.post(
    "/:id/archive",
    validate({params: idParam, body: archiveBody}),
    requirePermission(update),
    controller.archive,
  );
  router.post("/:id/submit-review", validate({params: idParam}), requirePermission(update), controller.submitForReview);
  router.post("/:id/duplicate", validate({params: idParam}), requirePermission(create), controller.duplicate);

  router.get("/:id/revisions", validate({params: idParam}), requirePermission(read), controller.revisions);
  router.post(
    "/:id/rollback/:revision",
    validate({params: rollbackParam}),
    requirePermission(update),
    controller.rollback,
  );

  router.delete("/:id", validate({params: idParam}), requirePermission(destroy), controller.remove);
  router.post("/:id/restore", validate({params: idParam}), requirePermission(destroy), controller.restore);

  // Irreversible destruction is super-admin only AND needs the purge
  // permission. Both, not either: this is the one action with no undo.
  router.delete(
    "/:id/permanent",
    validate({params: idParam}),
    requireSuperAdmin,
    requirePermission(PERMISSIONS.CONTENT_PURGE),
    controller.purge,
  );

  adminRouter.use(`/${resource.name}`, router);
}
