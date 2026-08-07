import {Router} from "express";
import multer from "multer";
import {z} from "zod";

import * as media from "../controllers/media.controller.js";
import {authenticate} from "../middleware/authenticate.js";
import {requirePermission, requireSuperAdmin} from "../middleware/authorize.js";
import {validate} from "../middleware/validate.js";
import {uploadLimiter, adminLimiter} from "../middleware/rateLimit.js";
import {PERMISSIONS} from "../config/permissions.js";
import {MAX_UPLOAD_BYTES, ALLOWED_FOLDERS} from "../services/imagekit.service.js";
import {stripTags} from "../utils/sanitize.js";
import {badRequest} from "../utils/apiError.js";

export const mediaRouter = Router();

// Memory storage: the buffer goes straight to ImageKit and is never written to
// the container's disk. Cloud Run's filesystem is ephemeral anyway, and not
// writing means there is no temp file to leak, collide or fill the disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 1,
    // Caps the non-file parts too, so a multipart body cannot smuggle a huge
    // text field past the JSON body limit.
    fields: 10,
    fieldSize: 2000,
  },
});

const idParam = z.object({id: z.string().regex(/^[a-f0-9]{24}$/i, "Invalid id")});

const listQuery = z.object({
  page: z.coerce.number().int().min(1).max(10000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(24),
  search: z.string().max(200).optional(),
  folder: z.enum(ALLOWED_FOLDERS).optional(),
});

const updateBody = z.object({
  name: z.string().max(300).transform(stripTags).optional(),
  alt: z.string().max(300).transform(stripTags).optional(),
  caption: z.string().max(500).transform(stripTags).optional(),
  tags: z.array(z.string().max(60).transform(stripTags)).max(30).optional(),
  focalPoint: z
    .object({x: z.number().min(0).max(1), y: z.number().min(0).max(1)})
    .optional(),
});

mediaRouter.use(authenticate);

mediaRouter.get(
  "/",
  adminLimiter,
  validate({query: listQuery}),
  requirePermission(PERMISSIONS.MEDIA_MANAGE),
  media.list,
);

// multer runs before the permission check because the body must be parsed for
// the route to work at all — but authenticate() has already run at the router
// level, so an anonymous caller never reaches the file parser.
mediaRouter.post(
  "/upload",
  uploadLimiter,
  requirePermission(PERMISSIONS.MEDIA_MANAGE),
  (request, response, next) =>
    upload.single("file")(request, response, (error) => {
      if (!error) return next();
      // Multer's own errors are not in our envelope, and "LIMIT_FILE_SIZE" is
      // not a message to show a person.
      if (error.code === "LIMIT_FILE_SIZE") {
        return next(badRequest(`Images must be under ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`));
      }
      if (error.code === "LIMIT_FILE_COUNT" || error.code === "LIMIT_UNEXPECTED_FILE") {
        return next(badRequest("Upload one file at a time."));
      }
      return next(badRequest(error.message));
    }),
  media.upload,
);

mediaRouter.get(
  "/:id",
  adminLimiter,
  validate({params: idParam}),
  requirePermission(PERMISSIONS.MEDIA_MANAGE),
  media.getOne,
);

mediaRouter.get(
  "/:id/references",
  adminLimiter,
  validate({params: idParam}),
  requirePermission(PERMISSIONS.MEDIA_MANAGE),
  media.references,
);

mediaRouter.patch(
  "/:id",
  adminLimiter,
  validate({params: idParam, body: updateBody}),
  requirePermission(PERMISSIONS.MEDIA_MANAGE),
  media.update,
);

mediaRouter.delete(
  "/:id",
  adminLimiter,
  validate({params: idParam}),
  requirePermission(PERMISSIONS.MEDIA_MANAGE),
  media.remove,
);

mediaRouter.post(
  "/:id/restore",
  adminLimiter,
  validate({params: idParam}),
  requirePermission(PERMISSIONS.MEDIA_MANAGE),
  media.restore,
);

// Destroys the remote object. Super-admin plus the purge permission, matching
// the rule for permanently deleting content.
mediaRouter.delete(
  "/:id/permanent",
  adminLimiter,
  validate({params: idParam}),
  requireSuperAdmin,
  requirePermission(PERMISSIONS.CONTENT_PURGE),
  media.purge,
);
