import {Router} from "express";
import multer from "multer";

import * as applications from "../controllers/jobApplication.controller.js";
import {RESUME_MAX_BYTES} from "../services/resumeUpload.service.js";
import {badRequest} from "../utils/apiError.js";
import {authenticate} from "../middleware/authenticate.js";
import {requirePermission} from "../middleware/authorize.js";
import {validate} from "../middleware/validate.js";
import {verifyTurnstile} from "../middleware/turnstile.js";
import {jobApplicationLimiter, jobApplicationIdentityLimiter, adminLimiter, uploadLimiter} from "../middleware/rateLimit.js";
import {PERMISSIONS} from "../config/permissions.js";
import {
  submitApplicationSchema,
  resumeAuthSchema,
  resumeUploadSchema,
  applicationListQuery,
  updateApplicationSchema,
  applicationIdParam,
  jobSlugParam,
} from "../validators/jobApplication.validators.js";

// Public: unauthenticated write, so it gets its own per-IP budget. Wider than
// the lead form's, because a candidate may apply to several roles in a row.
export const publicApplicationRouter = Router();

// The file is buffered in memory only — never written to the container's disk.
// The ceiling is enforced by multer before any handler sees the bytes, and
// again by validateResumeFile() inside the service.
const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: {fileSize: RESUME_MAX_BYTES, files: 1, fields: 5, fieldSize: 2100},
});

const parseResume = (request, response, next) =>
  resumeUpload.single("resume")(request, response, (error) => {
    if (!error) return next();
    if (error.code === "LIMIT_FILE_SIZE") {
      return next(badRequest("Resume must be 5 MB or smaller.", {resume: "Resume must be 5 MB or smaller."}));
    }
    if (error.code === "LIMIT_FILE_COUNT" || error.code === "LIMIT_UNEXPECTED_FILE") {
      return next(badRequest("Upload one resume at a time."));
    }
    return next(badRequest(error.message));
  });

publicApplicationRouter.post("/", jobApplicationLimiter, verifyTurnstile, validate({body: submitApplicationSchema}), jobApplicationIdentityLimiter, applications.submit);
// Issue a signed, job-scoped upload token (rate-limited and Turnstile-gated
// like the submit route). It names a random folder; it is not an ImageKit
// credential and cannot be used to upload anywhere else.
publicApplicationRouter.post(
  "/:jobId/resume-upload-auth",
  uploadLimiter,
  verifyTurnstile,
  validate({params: jobSlugParam, body: resumeAuthSchema}),
  applications.resumeUploadAuth,
);

// The signed uploadToken from the auth call is the authority here: it already
// required a solved Turnstile and names the one folder we will write into. The
// browser sends the bytes to us, never to ImageKit directly.
publicApplicationRouter.post(
  "/:jobId/resume",
  uploadLimiter,
  parseResume,
  validate({params: jobSlugParam, body: resumeUploadSchema}),
  applications.resumeUpload,
);

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

adminApplicationRouter.get(
  "/:id/resume",
  validate({params: applicationIdParam}),
  requirePermission(PERMISSIONS.FORMS_READ),
  applications.resume,
);

adminApplicationRouter.get(
  "/:id",
  validate({params: applicationIdParam}),
  requirePermission(PERMISSIONS.FORMS_READ),
  applications.getOne,
);

adminApplicationRouter.patch(
  "/:id",
  validate({params: applicationIdParam, body: updateApplicationSchema}),
  requirePermission(PERMISSIONS.FORMS_UPDATE),
  applications.update,
);
adminApplicationRouter.patch(
  "/:id/status",
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
