import {Router} from "express";

import * as applications from "../controllers/jobApplication.controller.js";
import {authenticate} from "../middleware/authenticate.js";
import {requirePermission} from "../middleware/authorize.js";
import {validate} from "../middleware/validate.js";
import {verifyTurnstile} from "../middleware/turnstile.js";
import {jobApplicationLimiter, jobApplicationIdentityLimiter, adminLimiter} from "../middleware/rateLimit.js";
import {PERMISSIONS} from "../config/permissions.js";
import {
  submitApplicationSchema,
  applicationListQuery,
  updateApplicationSchema,
  applicationIdParam,
} from "../validators/jobApplication.validators.js";

// Public: unauthenticated write, so the same per-IP form budget as leads.
export const publicApplicationRouter = Router();

publicApplicationRouter.post("/", jobApplicationLimiter, verifyTurnstile, validate({body: submitApplicationSchema}), jobApplicationIdentityLimiter, applications.submit);

// Admin: signed-in admins only, with the same permissions as the lead inbox.
export const adminApplicationRouter = Router();

adminApplicationRouter.use(adminLimiter, authenticate);

adminApplicationRouter.get(
  "/",
  validate({query: applicationListQuery}),
  requirePermission(PERMISSIONS.FORMS_READ),
  applications.list,
);

// Before /:id so these are not read as ids.
adminApplicationRouter.get("/jobs", requirePermission(PERMISSIONS.FORMS_READ), applications.jobs);
adminApplicationRouter.get(
  "/export",
  validate({query: applicationListQuery}),
  requirePermission(PERMISSIONS.FORMS_EXPORT),
  applications.exportCsv,
);

adminApplicationRouter.patch(
  "/:id",
  validate({params: applicationIdParam, body: updateApplicationSchema}),
  requirePermission(PERMISSIONS.FORMS_UPDATE),
  applications.update,
);

adminApplicationRouter.delete(
  "/:id",
  validate({params: applicationIdParam}),
  requirePermission(PERMISSIONS.FORMS_UPDATE),
  applications.remove,
);
