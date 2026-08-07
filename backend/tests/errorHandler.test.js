// The error handler is the one place every failure in the API passes through,
// and normalise() is the part of it no route test can see: an integration suite
// asserts that a bad payload gives 400, which stays true even if the Zod branch
// and the Mongoose branch collapse into each other. These call it directly, one
// error type at a time.

import {describe, it, expect, vi, afterEach} from "vitest";
import express from "express";
import request from "supertest";
import mongoose from "mongoose";
import {z} from "zod";

import {errorHandler, notFoundHandler} from "../src/middleware/errorHandler.js";
import {requestId} from "../src/middleware/requestId.js";
import {ApiError, badRequest, forbidden, notFound, serviceUnavailable} from "../src/utils/apiError.js";
import {logger} from "../src/config/logger.js";

// A one-route app that throws whatever the test hands it. Nothing else is
// mounted, so a failure can only be the handler's doing.
const appThrowing = (error) => {
  const app = express();
  app.use(requestId);
  app.get("/boom", (_request, _response, next) => next(error));
  app.use(errorHandler);
  return app;
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("errorHandler — ApiError", () => {
  it("passes an ApiError through with its own status, code and message", async () => {
    const response = await request(appThrowing(forbidden("Not for you"))).get("/boom");

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      success: false,
      error: {code: "FORBIDDEN", message: "Not for you"},
    });
  });

  it("includes field detail when the error carries it", async () => {
    const response = await request(appThrowing(badRequest("Fix these", {email: "Required"}))).get("/boom");

    expect(response.body.error.fields).toEqual({email: "Required"});
  });

  it("omits the fields key entirely when there is none, rather than sending null", async () => {
    const response = await request(appThrowing(notFound())).get("/boom");

    expect(response.body.error).not.toHaveProperty("fields");
  });

  it("echoes the request id, so a user can quote one string to find the failure", async () => {
    const response = await request(appThrowing(notFound())).get("/boom").set("X-Request-Id", "trace-1");

    expect(response.body.meta.requestId).toBe("trace-1");
  });
});

describe("errorHandler — Zod", () => {
  const zodError = (schema, value) => {
    try {
      schema.parse(value);
      throw new Error("schema unexpectedly accepted the value");
    } catch (error) {
      return error;
    }
  };

  it("turns a Zod failure into a 400 with per-field messages", async () => {
    const error = zodError(z.object({email: z.string().email(), age: z.number()}), {email: "nope", age: "x"});
    const response = await request(appThrowing(error)).get("/boom");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(Object.keys(response.body.error.fields).sort()).toEqual(["age", "email"]);
  });

  it("reports one message per field, not one per failed rule", async () => {
    const error = zodError(z.object({name: z.string().min(5).regex(/^[A-Z]/)}), {name: "ab"});
    const response = await request(appThrowing(error)).get("/boom");

    expect(Object.keys(response.body.error.fields)).toEqual(["name"]);
    expect(typeof response.body.error.fields.name).toBe("string");
  });

  it("joins a nested path with dots, so a form can find the input", async () => {
    const error = zodError(z.object({seo: z.object({title: z.string()})}), {seo: {title: 1}});
    const response = await request(appThrowing(error)).get("/boom");

    expect(response.body.error.fields).toHaveProperty("seo.title");
  });

  it("uses _ for a top-level failure that names no field", async () => {
    const error = zodError(z.string(), 42);
    const response = await request(appThrowing(error)).get("/boom");

    expect(response.body.error.fields).toHaveProperty("_");
  });

  it("indexes an array element, so the failing row is identifiable", async () => {
    const error = zodError(z.object({tags: z.array(z.string())}), {tags: ["ok", 5]});
    const response = await request(appThrowing(error)).get("/boom");

    expect(response.body.error.fields).toHaveProperty("tags.1");
  });
});

describe("errorHandler — Mongoose", () => {
  it("turns a schema validation failure into a 400 with the schema's own messages", async () => {
    const error = new mongoose.Error.ValidationError();
    error.addError("title", new mongoose.Error.ValidatorError({message: "Path `title` is required.", path: "title"}));

    const response = await request(appThrowing(error)).get("/boom");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.fields.title).toMatch(/required/i);
  });

  it("answers a malformed ObjectId with 404, not 400 — no confirming which id shapes are real", async () => {
    const error = new mongoose.Error.CastError("ObjectId", "not-an-id", "_id");
    const response = await request(appThrowing(error)).get("/boom");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("never echoes the rejected value back in a cast failure", async () => {
    const error = new mongoose.Error.CastError("ObjectId", "supersecret", "_id");
    const response = await request(appThrowing(error)).get("/boom");

    expect(JSON.stringify(response.body)).not.toContain("supersecret");
  });

  it("turns a duplicate key into a 409 naming the field", async () => {
    const error = Object.assign(new Error("E11000 duplicate key"), {
      code: 11000,
      keyPattern: {email: 1},
      keyValue: {email: "taken@example.com"},
    });

    const response = await request(appThrowing(error)).get("/boom");

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CONFLICT");
    expect(response.body.error.fields).toEqual({email: "Already in use"});
  });

  it("does NOT echo the duplicated value — that would confirm an account exists", async () => {
    const error = Object.assign(new Error("E11000"), {
      code: 11000,
      keyPattern: {email: 1},
      keyValue: {email: "taken@example.com"},
    });

    const response = await request(appThrowing(error)).get("/boom");

    expect(JSON.stringify(response.body)).not.toContain("taken@example.com");
  });

  it("falls back to a generic field name when the index gives no key pattern", async () => {
    const response = await request(appThrowing(Object.assign(new Error("E11000"), {code: 11000}))).get("/boom");

    expect(response.body.error.fields).toEqual({value: "Already in use"});
  });
});

describe("errorHandler — body parser failures", () => {
  it("turns an oversized body into 413", async () => {
    const response = await request(appThrowing(Object.assign(new Error("too big"), {type: "entity.too.large"}))).get("/boom");

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("turns malformed JSON into 400 rather than a 500", async () => {
    const app = express();
    app.use(requestId);
    app.use(express.json());
    app.post("/echo", (request, response) => response.json(request.body));
    app.use(errorHandler);

    const response = await request(app)
      .post("/echo")
      .set("Content-Type", "application/json")
      .send('{"broken": ');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_JSON");
  });

  it("does not mistake an ordinary SyntaxError for a body-parser one", async () => {
    // No `body` property, so it is a genuine bug and must be a 500.
    const response = await request(appThrowing(new SyntaxError("unexpected token in our own code"))).get("/boom");

    expect(response.status).toBe(500);
  });
});

describe("errorHandler — unrecognised errors", () => {
  it("answers 500 with no detail about what broke", async () => {
    vi.spyOn(logger, "error").mockImplementation(() => {});

    const response = await request(appThrowing(new TypeError("cannot read x of undefined"))).get("/boom");

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe("INTERNAL_ERROR");
    expect(response.body.error.message).toMatch(/something went wrong/i);
  });

  it("never sends a stack trace, which would be a free map of the codebase", async () => {
    vi.spyOn(logger, "error").mockImplementation(() => {});
    const error = new TypeError("boom");

    const response = await request(appThrowing(error)).get("/boom");

    expect(JSON.stringify(response.body)).not.toContain("at ");
    expect(response.body.error.stack).toBeUndefined();
  });

  it("logs the whole thing server-side with the request id and path", async () => {
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    const error = new TypeError("boom");

    await request(appThrowing(error)).get("/boom").set("X-Request-Id", "trace-9");

    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({err: error, requestId: "trace-9", path: "/boom"}),
      "Unhandled error",
    );
  });

  it("copes with a thrown non-Error, which is what a rejected string looks like", async () => {
    vi.spyOn(logger, "error").mockImplementation(() => {});

    const response = await request(appThrowing("just a string")).get("/boom");

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe("INTERNAL_ERROR");
  });
});

describe("errorHandler — log levels", () => {
  it("logs a 5xx at error level, because that one is ours", async () => {
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});

    await request(appThrowing(serviceUnavailable("Database down"))).get("/boom");

    expect(errorSpy).toHaveBeenCalled();
  });

  it("logs a 4xx at debug level — every validation failure at error level makes the log useless", async () => {
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    const debugSpy = vi.spyOn(logger, "debug").mockImplementation(() => {});

    await request(appThrowing(badRequest("Fix it"))).get("/boom");

    expect(errorSpy).not.toHaveBeenCalled();
    expect(debugSpy).toHaveBeenCalled();
  });
});

describe("every error shares one envelope", () => {
  it.each([
    ["ApiError", forbidden("no")],
    ["Mongoose cast", new mongoose.Error.CastError("ObjectId", "x", "_id")],
    ["duplicate key", Object.assign(new Error("E11000"), {code: 11000, keyPattern: {slug: 1}})],
    ["unknown", new TypeError("boom")],
  ])("%s answers with success:false, an error code and a request id", async (_label, error) => {
    vi.spyOn(logger, "error").mockImplementation(() => {});

    const response = await request(appThrowing(error)).get("/boom");

    expect(response.body.success).toBe(false);
    expect(typeof response.body.error.code).toBe("string");
    expect(typeof response.body.error.message).toBe("string");
    expect(typeof response.body.meta.requestId).toBe("string");
  });

  it("keeps ApiError's own contract — status, code and fields are what the frontend switches on", () => {
    const error = new ApiError(418, "TEAPOT", "Short and stout", {fields: {pot: "is a teapot"}});

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ApiError");
    expect(error.status).toBe(418);
    expect(error.code).toBe("TEAPOT");
    expect(error.fields).toEqual({pot: "is a teapot"});
  });
});

// ── notFoundHandler and the 405 router walk ─────────────────────────────────

describe("notFoundHandler", () => {
  // Mirrors the real app's shape: routers mounted under a prefix, which is the
  // case the recursive walk exists for.
  const app = express();
  const auth = express.Router();
  const nested = express.Router();

  auth.post("/login", (_request, response) => response.json({ok: true}));
  auth.get("/sessions", (_request, response) => response.json({ok: true}));
  auth.delete("/sessions/:id", (_request, response) => response.json({ok: true}));
  nested.get("/deep", (_request, response) => response.json({ok: true}));
  auth.use("/nested", nested);

  app.use(requestId);
  app.use("/api/v1/auth", auth);
  app.get("/top", (_request, response) => response.json({ok: true}));
  app.use(notFoundHandler);
  app.use(errorHandler);

  it("404s a path no route matches", async () => {
    const response = await request(app).get("/api/v1/nothing-here");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
    expect(response.body.error.message).toContain("/api/v1/nothing-here");
  });

  it("405s a real endpoint reached with the wrong verb, which is what typing the URL does", async () => {
    const response = await request(app).get("/api/v1/auth/login");

    expect(response.status).toBe(405);
    expect(response.body.error.code).toBe("METHOD_NOT_ALLOWED");
  });

  it("sets the Allow header, which is what makes a 405 actionable", async () => {
    const response = await request(app).get("/api/v1/auth/login");

    expect(response.headers.allow).toBe("POST");
  });

  it("lists every verb registered on the path", async () => {
    const response = await request(app).post("/api/v1/auth/sessions/abc");

    expect(response.status).toBe(405);
    expect(response.headers.allow).toBe("DELETE");
  });

  it("peels the mount prefix off before recursing into a nested router", async () => {
    const response = await request(app).post("/api/v1/auth/nested/deep");

    expect(response.status).toBe(405);
    expect(response.headers.allow).toBe("GET");
  });

  it("does not advertise HEAD as a separate choice — Express serves it off GET", async () => {
    const response = await request(app).post("/top");

    expect(response.headers.allow).toBe("GET");
    expect(response.headers.allow).not.toContain("HEAD");
  });

  it("names the method and the path, so the message is enough to fix the call", async () => {
    const response = await request(app).put("/api/v1/auth/login");

    expect(response.body.error.message).toContain("PUT");
    expect(response.body.error.message).toContain("/api/v1/auth/login");
    expect(response.body.error.message).toContain("POST");
  });

  it("carries the request id, exactly like an error response does", async () => {
    const response = await request(app).get("/nope").set("X-Request-Id", "trace-2");

    expect(response.body.meta.requestId).toBe("trace-2");
  });

  it("does not 405 a path that only looks similar to a real one", async () => {
    const response = await request(app).get("/api/v1/auth/log");

    expect(response.status).toBe(404);
  });
});
