import {createHash} from "node:crypto";

import {Media} from "../models/Media.js";
import {RESOURCES} from "../config/resources.js";
import {AUDIT_ACTIONS} from "../models/AuditLog.js";
import {recordAudit} from "../services/audit.service.js";
import {
  uploadImage,
  deleteImage,
  validateUpload,
  safeFileName,
  hashBuffer,
  detectImageType,
  isImageKitUrl,
  ALLOWED_FOLDERS,
} from "../services/imagekit.service.js";
import {escapeRegex} from "../utils/sanitize.js";
import {ok, created, paginated} from "../utils/respond.js";
import {badRequest, notFound, conflict} from "../utils/apiError.js";

const EXTENSION_FOR = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
};

// Which content documents point at a given media asset.
//
// Checked before deletion, because removing an image that a published program
// still renders turns a live page into a broken box. The scan walks every
// content collection looking for the URL in any media-shaped field.
export const findReferences = async (media) => {
  const references = [];

  for (const resource of Object.values(RESOURCES)) {
    const matches = await resource.model
      .find({
        deletedAt: null,
        $or: [
          {"image.url": media.url},
          {"image.media": media._id},
          {"photo.url": media.url},
          {"heroMedia.url": media.url},
          {"coverImage.url": media.url},
          {"companyLogo.url": media.url},
          {"gallery.url": media.url},
        ],
      })
      .select("title name slug")
      .limit(20)
      .lean();

    for (const match of matches) {
      references.push({
        resource: resource.name,
        id: match._id,
        slug: match.slug,
        label: match.title || match.name || match.slug,
      });
    }
  }

  return references;
};

export const upload = async (request, response, next) => {
  try {
    const file = request.file;

    const problem = validateUpload(file);
    if (problem) return next(badRequest(problem));

    const detected = detectImageType(file.buffer);
    const extension = EXTENSION_FOR[detected];
    const folder = request.body.folder || "/careerveda";

    if (!ALLOWED_FOLDERS.includes(folder)) return next(badRequest("That folder is not allowed."));

    const contentHash = hashBuffer(file.buffer);

    // Same bytes already uploaded: hand back the existing asset instead of
    // creating a second copy. Returns 200 rather than 201 so a client can tell
    // the difference if it cares.
    const duplicate = await Media.findOne({contentHash, deletedAt: null});
    if (duplicate) {
      return ok(response, {media: duplicate, duplicate: true});
    }

    const fileName = safeFileName(file.originalname, extension);
    const uploaded = await uploadImage({buffer: file.buffer, fileName, folder});

    const media = await Media.create({
      name: request.body.name || file.originalname || fileName,
      fileName,
      url: uploaded.url,
      thumbnailUrl: uploaded.thumbnailUrl || "",
      fileId: uploaded.fileId,
      filePath: uploaded.filePath || "",
      folder,
      mimeType: detected,
      extension,
      size: file.size,
      // ImageKit reports the real dimensions; storing them is what lets the
      // frontend reserve space and avoid layout shift.
      width: uploaded.width || null,
      height: uploaded.height || null,
      alt: request.body.alt || "",
      caption: request.body.caption || "",
      contentHash,
      uploadedBy: request.admin._id,
    });

    await recordAudit(request, {
      action: AUDIT_ACTIONS.MEDIA_UPLOADED,
      actor: request.admin,
      targetType: "media",
      targetId: media._id,
      metadata: {fileName, folder, size: file.size},
    });

    return created(response, {media, duplicate: false});
  } catch (error) {
    return next(error);
  }
};

// Register an existing ImageKit URL as a library item without uploading bytes
// through this server — for when the image already lives on ImageKit and the
// editor has the address rather than the file (an external share, a URL copied
// from another asset, a file the picker cannot reach). Only ik.imagekit.io
// URLs are accepted, so the record always points at a host we trust.
//
// The asset is marked external: no fileId exists for it, so it can be
// referenced, renamed and soft-deleted, but never purged from ImageKit.
export const createFromUrl = async (request, response, next) => {
  try {
    const {url, folder = "/careerveda", name, alt} = request.body;

    if (!ALLOWED_FOLDERS.includes(folder)) return next(badRequest("That folder is not allowed."));
    if (!isImageKitUrl(url)) {
      return next(badRequest("Only ImageKit URLs (ik.imagekit.io) can be added here."));
    }

    // Same URL already registered: hand back the existing asset instead of
    // creating a second record for the same bytes.
    const duplicate = await Media.findOne({url, deletedAt: null});
    if (duplicate) return ok(response, {media: duplicate, duplicate: true});

    const fileName = String(url.split("/").pop()?.split("?")[0] || "image").slice(0, 120);
    const baseName = fileName.replace(/\.[^.]*$/, "") || "image";

    const media = await Media.create({
      name: name || baseName,
      fileName,
      url,
      thumbnailUrl: "",
      // No ImageKit file handle exists for a URL-only asset, but the schema
      // requires a unique one — a derived pseudo-id that can never collide
      // with a real fileId (real ones never start with "external-").
      fileId: `external-${createHash("sha1").update(url).digest("hex").slice(0, 20)}${Math.random().toString(36).slice(2, 8)}`,
      folder,
      alt: alt || "",
      external: true,
      originalUrl: url,
      uploadedBy: request.admin._id,
    });

    await recordAudit(request, {
      action: AUDIT_ACTIONS.MEDIA_UPLOADED,
      actor: request.admin,
      targetType: "media",
      targetId: media._id,
      metadata: {fileName, folder, external: true},
    });

    return created(response, {media, duplicate: false});
  } catch (error) {
    return next(error);
  }
};

export const list = async (request, response, next) => {
  try {
    // The route validates this query with zod before we are called. Re-deriving
    // the three values that reach Mongo is deliberate: the guarantee that a
    // folder is one of ours and that a page number is a number should hold in
    // the function that builds the query, not only in the middleware chain that
    // happens to precede it today.
    const page = Math.min(Math.max(Number(request.query.page) || 1, 1), 10000);
    const limit = Math.min(Math.max(Number(request.query.limit) || 24, 1), 100);
    // `find` rather than `includes(...) ? request.query.folder : null`: this
    // way the value that reaches Mongo is the element out of ALLOWED_FOLDERS,
    // not the caller's string that happened to equal it. Same result, but the
    // guarantee is structural — there is no path by which a request value
    // becomes filter.folder — instead of resting on the comparison above it.
    const folder = ALLOWED_FOLDERS.find((allowed) => allowed === request.query.folder) || null;
    const search =
      typeof request.query.search === "string" ? request.query.search.slice(0, 200) : null;

    const filter = {deletedAt: null};
    if (folder) filter.folder = folder;
    if (search) {
      // escapeRegex is what stops the input being a pattern in its own right,
      // and the typeof check above is what stops it being an object — an admin
      // sending ?search[$ne]= gets null here, not an operator. Only the value
      // is caller-derived; every key in `filter` is written by this function.
      const pattern = new RegExp(escapeRegex(search), "i");
      filter.$or = [{name: pattern}, {alt: pattern}, {caption: pattern}, {tags: pattern}];
    }

    const [items, total] = await Promise.all([
      Media.find(filter)
        .sort({createdAt: -1})
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Media.countDocuments(filter),
    ]);

    return paginated(response, items, {page, limit, total});
  } catch (error) {
    return next(error);
  }
};

export const getOne = async (request, response, next) => {
  try {
    const media = await Media.findOne({_id: request.params.id, deletedAt: null}).lean();
    if (!media) return next(notFound("Media not found"));

    return ok(response, media);
  } catch (error) {
    return next(error);
  }
};

// Editorial metadata plus the delivery URL. The URL is editable so an asset
// that moves hosts — an ImageKit account switch, a CDN change — can be pointed
// at its new address without re-uploading the bytes. fileId and dimensions
// describe the stored object and are not the admin's to rewrite: fileId is the
// only handle for deleting the remote file, so letting it be edited would let
// a record claim to be a managed asset it cannot actually delete.
export const update = async (request, response, next) => {
  try {
    const media = await Media.findOne({_id: request.params.id, deletedAt: null});
    if (!media) return next(notFound("Media not found"));

    const {name, alt, caption, tags, focalPoint, url, thumbnailUrl} = request.body;

    if (name !== undefined) media.name = name;
    if (alt !== undefined) media.alt = alt;
    if (caption !== undefined) media.caption = caption;
    if (tags !== undefined) media.tags = tags;
    if (focalPoint !== undefined) media.focalPoint = focalPoint;
    if (url !== undefined) media.url = url;
    if (thumbnailUrl !== undefined) media.thumbnailUrl = thumbnailUrl;

    await media.save();

    return ok(response, media);
  } catch (error) {
    return next(error);
  }
};

export const references = async (request, response, next) => {
  try {
    const media = await Media.findById(request.params.id);
    if (!media) return next(notFound("Media not found"));

    return ok(response, await findReferences(media));
  } catch (error) {
    return next(error);
  }
};

// Soft delete, and only when nothing uses it.
export const remove = async (request, response, next) => {
  try {
    const media = await Media.findOne({_id: request.params.id, deletedAt: null});
    if (!media) return next(notFound("Media not found"));

    const used = await findReferences(media);

    if (used.length > 0) {
      // Blocked rather than warned. The admin panel shows this list so the
      // editor can go and detach it; deleting anyway would break those pages
      // with no way to tell which ones.
      return next(
        conflict("This image is still used by published content.", {
          references: used.map((entry) => `${entry.resource}: ${entry.label}`).join(", "),
        }),
      );
    }

    media.deletedAt = new Date();
    media.deletedBy = request.admin._id;
    await media.save();

    await recordAudit(request, {
      action: AUDIT_ACTIONS.MEDIA_DELETED,
      actor: request.admin,
      targetType: "media",
      targetId: media._id,
      metadata: {fileName: media.fileName, permanent: false},
    });

    return ok(response, {deleted: true, id: media._id});
  } catch (error) {
    return next(error);
  }
};

export const restore = async (request, response, next) => {
  try {
    const media = await Media.findById(request.params.id);
    if (!media) return next(notFound("Media not found"));

    media.deletedAt = null;
    media.deletedBy = null;
    await media.save();

    return ok(response, media);
  } catch (error) {
    return next(error);
  }
};

// Removes the bytes from ImageKit. Super-admin only, and only after a soft
// delete — two deliberate actions, because this one cannot be undone.
export const purge = async (request, response, next) => {
  try {
    const media = await Media.findById(request.params.id);
    if (!media) return next(notFound("Media not found"));

    if (!media.deletedAt) {
      return next(badRequest("Delete this image before removing it permanently."));
    }

    if (media.external) {
      // Carried over from the static files, hosted on an ImageKit account this
      // backend has no key for. Saying so is better than attempting a delete
      // that will fail with an opaque 403.
      return next(
        badRequest("This image lives on an external ImageKit account and cannot be deleted here."),
      );
    }

    // Re-checked immediately before destruction: something may have started
    // using it between the soft delete and now.
    const used = await findReferences(media);
    if (used.length > 0) {
      return next(conflict("This image is still used by published content."));
    }

    await recordAudit(request, {
      action: AUDIT_ACTIONS.MEDIA_DELETED,
      actor: request.admin,
      targetType: "media",
      targetId: media._id,
      metadata: {fileName: media.fileName, fileId: media.fileId, permanent: true},
    });

    await deleteImage(media.fileId);
    await Media.deleteOne({_id: media._id});

    return ok(response, {purged: true, id: request.params.id});
  } catch (error) {
    return next(error);
  }
};
