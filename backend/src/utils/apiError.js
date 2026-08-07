// Every failure the API reports deliberately goes through one of these, so the
// response shape is identical whether the cause was validation, authorization
// or an unhandled throw. `code` is the stable contract the frontend switches on;
// `message` is prose and may be reworded without breaking a client.

export class ApiError extends Error {
  constructor(status, code, message, {fields, cause} = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
    if (cause) this.cause = cause;
  }
}

export const badRequest = (message, fields) =>
  new ApiError(400, "VALIDATION_ERROR", message || "Request validation failed", {fields});

// 401 means "we don't know who you are", 403 means "we do, and you may not".
// Keeping them distinct lets the admin panel refresh a token on 401 and show a
// permission notice on 403, rather than guessing from a single status.
export const unauthorized = (message) =>
  new ApiError(401, "UNAUTHORIZED", message || "Authentication required");

export const forbidden = (message) =>
  new ApiError(403, "FORBIDDEN", message || "You do not have permission to do that");

export const notFound = (message) => new ApiError(404, "NOT_FOUND", message || "Resource not found");

export const conflict = (message, fields) =>
  new ApiError(409, "CONFLICT", message || "Resource conflict", {fields});

export const tooManyRequests = (message) =>
  new ApiError(429, "RATE_LIMITED", message || "Too many requests. Please try again later.");

export const serviceUnavailable = (message) =>
  new ApiError(503, "SERVICE_UNAVAILABLE", message || "Service temporarily unavailable");
