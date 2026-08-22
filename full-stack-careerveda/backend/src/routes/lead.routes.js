import {Router} from "express";
import {z} from "zod";

import * as lead from "../controllers/lead.controller.js";
import {authenticate} from "../middleware/authenticate.js";
import {requirePermission} from "../middleware/authorize.js";
import {validate} from "../middleware/validate.js";
import {formLimiter, adminLimiter} from "../middleware/rateLimit.js";
import {PERMISSIONS} from "../config/permissions.js";
import {
  submitLeadSchema,
  leadListQuery,
  updateLeadSchema,
  addNoteSchema,
  exportQuery,
} from "../validators/lead.validators.js";

const idParam = z.object({id: z.string().regex(/^[a-f0-9]{24}$/i, "Invalid id")});

// Public: the only unauthenticated write endpoint in the API. Rate-limited per
// IP because every accepted request costs a database row.
export const publicLeadRouter = Router();

publicLeadRouter.post("/", formLimiter, validate({body: submitLeadSchema}), lead.submit);

// Admin.
export const adminLeadRouter = Router();

adminLeadRouter.use(adminLimiter, authenticate);

adminLeadRouter.get(
  "/",
  validate({query: leadListQuery}),
  requirePermission(PERMISSIONS.FORMS_READ),
  lead.list,
);

adminLeadRouter.get("/stats", requirePermission(PERMISSIONS.FORMS_READ), lead.stats);

// Registered before /:id so "export" is not read as an id.
adminLeadRouter.get(
  "/export",
  validate({query: exportQuery}),
  requirePermission(PERMISSIONS.FORMS_EXPORT),
  lead.exportCsv,
);

adminLeadRouter.get(
  "/:id",
  validate({params: idParam}),
  requirePermission(PERMISSIONS.FORMS_READ),
  lead.getOne,
);

adminLeadRouter.patch(
  "/:id",
  validate({params: idParam, body: updateLeadSchema}),
  requirePermission(PERMISSIONS.FORMS_UPDATE),
  lead.update,
);

adminLeadRouter.delete(
  "/:id",
  validate({params: idParam}),
  requirePermission(PERMISSIONS.FORMS_UPDATE),
  lead.remove,
);

adminLeadRouter.post(
  "/:id/notes",
  validate({params: idParam, body: addNoteSchema}),
  requirePermission(PERMISSIONS.FORMS_UPDATE),
  lead.addNote,
);
