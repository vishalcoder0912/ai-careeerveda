import {createHash} from "node:crypto";

import {Router} from "express";

import {RESOURCES} from "../config/resources.js";
import * as service from "../services/content.service.js";
import {validate} from "../middleware/validate.js";
import {publicLimiter} from "../middleware/rateLimit.js";
import {publicListQuery, slugParam} from "../validators/content.validators.js";
import {paginated, ok} from "../utils/respond.js";
import {notFound} from "../utils/apiError.js";

export const publicRouter = Router();

publicRouter.use(publicLimiter);

// Caching strategy for public content.
//
// The two caches are told different things on purpose.
//
// The CDN may hold a response for a minute (s-maxage) and keep serving the old
// copy while it fetches a new one (stale-while-revalidate), so a burst of
// traffic costs the origin one slow request rather than a cliff of them.
//
// The browser must revalidate every time (max-age=0). It used to be given
// max-age=30, which meant that for thirty seconds after an edit a browser would
// answer from its own cache without asking — an editor pressed Publish,
// refreshed the site, and saw the old content with no way to tell whether the
// publish had worked. Thirty seconds of browser caching saved almost nothing
// anyway: the CDN is what protects the origin.
//
// Revalidation is cheap because every response below carries an ETag. A browser
// that already has the current copy sends If-None-Match and gets a bodyless 304
// — for the blog index that is a few hundred bytes instead of 40 KB, at the cost
// of one round trip. That is the right trade for content whose whole purpose is
// to change when someone changes it.
const CACHE_CONTROL = "public, max-age=0, must-revalidate, s-maxage=60, stale-while-revalidate=300";

// ETag over the serialised body. A conditional request that matches gets a 304
// with no body, which for a large listing (the blog index is not small) is the
// difference between 40 KB and a few hundred bytes.
const withCache = (request, response, payload) => {
  const etag = `W/"${createHash("sha1").update(JSON.stringify(payload)).digest("base64url")}"`;

  response.set("Cache-Control", CACHE_CONTROL);
  response.set("ETag", etag);

  if (request.get("if-none-match") === etag) {
    response.status(304).end();
    return true;
  }

  return false;
};

for (const resource of Object.values(RESOURCES)) {
  const router = Router();

  router.get("/", validate({query: publicListQuery}), async (request, response, next) => {
    try {
      const {items, total, page, limit} = await service.listPublic(resource.model, {
        ...request.query,
        ...service.mergeSort(resource.defaultSort, request.query),
        projection: resource.publicProjection,
      });

      const payload = {items, page, limit, total};
      if (withCache(request, response, payload)) return undefined;

      return paginated(response, items, {page, limit, total});
    } catch (error) {
      return next(error);
    }
  });

  router.get("/:slug", validate({params: slugParam}), async (request, response, next) => {
    try {
      // publicOnly is what enforces "drafts are not public". It is a parameter
      // of the shared finder rather than a filter written here, so it cannot be
      // omitted by a future edit to this route.
      const document = await service
        .findBySlug(resource.model, request.params.slug, {publicOnly: true})
        .catch(() => null);

      // A draft and a nonexistent record are both 404 — distinguishing them
      // would let anyone enumerate unpublished content by guessing slugs.
      if (!document) return next(notFound(`${resource.label} not found`));

      const payload = document.toJSON();
      for (const field of ["createdBy", "updatedBy", "deletedBy", "deletedAt", "revision"]) {
        delete payload[field];
      }

      if (withCache(request, response, payload)) return undefined;

      return ok(response, payload);
    } catch (error) {
      return next(error);
    }
  });

  publicRouter.use(`/${resource.name}`, router);
}
