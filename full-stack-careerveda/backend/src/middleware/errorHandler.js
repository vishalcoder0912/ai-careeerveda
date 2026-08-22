import {ZodError} from "zod";
import mongoose from "mongoose";

import {env} from "../config/env.js";
import {logger} from "../config/logger.js";
import {ApiError} from "../utils/apiError.js";

// Turns any throw into the documented error envelope. Registered last, so it
// sees everything the routes did not handle themselves.

const zodFields = (error) => {
  const fields = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_";
    // First message per field only. A field that fails three rules is still one
    // thing for the user to fix, and the form shows one message per input.
    if (!fields[path]) fields[path] = issue.message;
  }
  return fields;
};

const normalise = (error) => {
  if (error instanceof ApiError) return error;

  if (error instanceof ZodError) {
    return new ApiError(400, "VALIDATION_ERROR", "Request validation failed", {
      fields: zodFields(error),
    });
  }

  if (error instanceof mongoose.Error.ValidationError) {
    const fields = {};
    for (const [path, detail] of Object.entries(error.errors)) fields[path] = detail.message;
    return new ApiError(400, "VALIDATION_ERROR", "Request validation failed", {fields});
  }

  // A malformed ObjectId in a path parameter is the caller's mistake, not ours.
  // Reporting it as 404 rather than 400 also avoids confirming which id formats
  // are real, which is a small enumeration win.
  if (error instanceof mongoose.Error.CastError) {
    return new ApiError(404, "NOT_FOUND", "Resource not found");
  }

  // Duplicate key. The index name identifies the field, but we do not echo the
  // offending value back — on a users collection that would confirm an account
  // exists for a given email.
  if (error && error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || "value";
    return new ApiError(409, "CONFLICT", "That value is already in use", {
      fields: {[field]: "Already in use"},
    });
  }

  // express.json() size and syntax failures.
  if (error && error.type === "entity.too.large") {
    return new ApiError(413, "PAYLOAD_TOO_LARGE", "Request body is too large");
  }
  if (error instanceof SyntaxError && "body" in error) {
    return new ApiError(400, "INVALID_JSON", "Request body is not valid JSON");
  }

  return null;
};

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity; `next` must stay.
export const errorHandler = (error, request, response, next) => {
  const known = normalise(error);

  if (!known) {
    // Unrecognised: this is a bug. Log the whole thing server-side, tell the
    // client nothing but a request id. A stack trace in a response body is a
    // free map of the codebase.
    logger.error({err: error, requestId: request.id, path: request.path}, "Unhandled error");

    return response.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Something went wrong. Please try again.",
        // Only outside production, and only the message — never the stack.
        ...(env.isProduction ? {} : {debug: String(error && error.message)}),
      },
      meta: {requestId: request.id},
    });
  }

  // 5xx is ours, 4xx is theirs. Only the former deserves an error-level line;
  // logging every validation failure at error level makes the log useless.
  if (known.status >= 500) {
    logger.error({err: error, requestId: request.id, path: request.path}, known.message);
  } else {
    logger.debug({requestId: request.id, path: request.path, code: known.code}, known.message);
  }

  return response.status(known.status).json({
    success: false,
    error: {
      code: known.code,
      message: known.message,
      ...(known.fields ? {fields: known.fields} : {}),
    },
    meta: {requestId: request.id},
  });
};

// Walk Express's router tree collecting the HTTP methods registered for `path`.
// Used so a request to a real endpoint with the wrong verb (e.g. GET on the
// POST-only /auth/login, which is what typing the URL in a browser does) gets
// an honest 405 instead of a 404 that implies the endpoint does not exist.
// `layer.match` is Express's own matcher; it sets `layer.path` to the matched
// prefix, which is how we peel the mount point off before recursing.
const methodsForPath = (stack, path) => {
  const methods = new Set();
  for (const layer of stack || []) {
    if (layer.route) {
      if (layer.match(path)) {
        for (const method of Object.keys(layer.route.methods)) methods.add(method.toUpperCase());
      }
    } else if (layer.name === "router" && layer.handle && layer.handle.stack) {
      if (layer.match(path)) {
        const rest = path.slice(layer.path.length) || "/";
        for (const method of methodsForPath(layer.handle.stack, rest)) methods.add(method);
      }
    }
  }
  // Express serves HEAD off any GET route; advertising it as a distinct choice
  // is noise for a caller who used the wrong verb.
  methods.delete("HEAD");
  return methods;
};

// What a route path can contain. Everything mounted in app.js is ASCII words,
// hyphens and ObjectIds, so this is generous rather than tight — but it means
// the only strings handed to Express's matchers below are ones that could name
// a real route, instead of whatever arbitrary text arrived on the request line.
// A path that fails it cannot be a route we serve, so the 404 is already the
// right answer and there is nothing to look up.
const ROUTE_PATH = /^\/[A-Za-z0-9\-._~/]{0,200}$/;

export const notFoundHandler = (request, response) => {
  const allowed = ROUTE_PATH.test(request.path)
    ? methodsForPath(request.app._router.stack, request.path)
    : new Set();

  if (allowed.size > 0) {
    const allow = [...allowed].sort().join(", ");
    response.set("Allow", allow);
    return response.status(405).json({
      success: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: `${request.method} is not allowed on ${request.path}. Allowed: ${allow}.`,
      },
      meta: {requestId: request.id},
    });
  }

  return response.status(404).json({
    success: false,
    error: {code: "NOT_FOUND", message: `No route matches ${request.method} ${request.path}`},
    meta: {requestId: request.id},
  });
};
