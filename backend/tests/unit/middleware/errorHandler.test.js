import {beforeEach, describe, expect, it, jest} from "@jest/globals";
import {z} from "zod";
import mongoose from "mongoose";

import {errorHandler, notFoundHandler} from "../../../src/middleware/errorHandler.js";
import {badRequest, serviceUnavailable} from "../../../src/utils/apiError.js";
import {env} from "../../../src/config/env.js";
import {logger} from "../../../src/config/logger.js";

// Express stand-ins. errorHandler only reads request.id/path and writes
// response.status/json; notFoundHandler additionally reads the router stack and
// writes response.set. Anything else would be testing the mock.

const makeResponse = () => {
  const response = {headers: {}, statusCode: 200, body: undefined};
  response.status = jest.fn((code) => {
    response.statusCode = code;
    return response;
  });
  response.json = jest.fn((payload) => {
    response.body = payload;
    return response;
  });
  response.set = jest.fn((name, value) => {
    response.headers[name] = value;
    return response;
  });
  return response;
};

const requestOf = (parts = {}) => ({id: "req-1", path: "/api/v1/admin/programs", method: "GET", ...parts});

const run = (error, request = requestOf()) => {
  const response = makeResponse();
  errorHandler(error, request, response, jest.fn());
  return {response, request};
};

beforeEach(() => {
  jest.spyOn(logger, "error").mockImplementation(() => {});
  jest.spyOn(logger, "debug").mockImplementation(() => {});
});

describe("errorHandler", () => {
  it("passes an ApiError through unchanged, status, code and fields", () => {
    const {response} = run(badRequest("Title is wrong", {title: "Required"}));

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: {code: "VALIDATION_ERROR", message: "Title is wrong", fields: {title: "Required"}},
      meta: {requestId: "req-1"},
    });
  });

  it("turns a ZodError into the 400 validation envelope", () => {
    const {error} = z.object({title: z.string()}).safeParse({title: 42});
    const {response} = run(error);

    expect(response.statusCode).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.fields.title).toEqual(expect.any(String));
  });

  it("flattens nested zod paths into dotted field names", () => {
    const {error} = z.object({fee: z.object({amount: z.string()})}).safeParse({fee: {amount: 42}});
    const {response} = run(error);

    expect(response.body.error.fields).toEqual({"fee.amount": expect.any(String)});
  });

  it("keeps only the first message per field, so a form shows one error per input", () => {
    // "abc" is both too short and too long — two issues on the same path.
    const {error} = z.object({name: z.string().min(10).max(3)}).safeParse({name: "abc"});
    const {response} = run(error);

    expect(Object.keys(response.body.error.fields)).toEqual(["name"]);
  });

  it("uses '_' for an issue with no path, rather than inventing a field name", () => {
    const {error} = z.unknown().refine(() => false).safeParse("anything");
    const {response} = run(error);

    expect(response.body.error.fields._).toEqual(expect.any(String));
  });

  it("normalises a mongoose ValidationError to 400 with per-path messages", () => {
    const validationError = new mongoose.Error.ValidationError();
    validationError.errors = {title: {message: "Path `title` is required."}};

    const {response} = run(validationError);

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      fields: {title: "Path `title` is required."},
    });
  });

  it("reports a malformed ObjectId as 404, not 400", () => {
    const {response} = run(new mongoose.Error.CastError("ObjectId", "not-an-id", "id"));

    expect(response.statusCode).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("turns a duplicate-key error into a 409 naming the indexed field", () => {
    const {response} = run({code: 11000, keyPattern: {email: 1}});

    expect(response.statusCode).toBe(409);
    expect(response.body.error).toMatchObject({
      code: "CONFLICT",
      message: "That value is already in use",
      fields: {email: "Already in use"},
    });
  });

  it("names the field 'value' when a duplicate-key error carries no keyPattern", () => {
    const {response} = run({code: 11000});

    expect(response.body.error.fields).toEqual({value: "Already in use"});
  });

  it("maps an express.json() size failure to 413", () => {
    const {response} = run({type: "entity.too.large"});

    expect(response.statusCode).toBe(413);
    expect(response.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("maps a body-syntax error to 400 INVALID_JSON", () => {
    const syntaxError = new SyntaxError("Unexpected token }");
    syntaxError.body = {};

    const {response} = run(syntaxError);

    expect(response.statusCode).toBe(400);
    expect(response.body.error.code).toBe("INVALID_JSON");
  });

  it("does not treat a SyntaxError without a body as invalid JSON", () => {
    const {response} = run(new SyntaxError("Some other syntax problem"));

    expect(response.statusCode).toBe(500);
    expect(response.body.error.code).toBe("INTERNAL_ERROR");
  });

  it("hides an unrecognised error behind a generic message and a request id", () => {
    const {response} = run(new Error("boom"));

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({
      success: false,
      error: {code: "INTERNAL_ERROR", message: "Something went wrong. Please try again.", debug: "boom"},
      meta: {requestId: "req-1"},
    });
  });

  it("logs unrecognised errors at error level, with the request id", () => {
    run(new Error("boom"));

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({err: expect.any(Error), requestId: "req-1", path: "/api/v1/admin/programs"}),
      expect.any(String),
    );
  });

  it("omits the debug message in production", () => {
    const original = env.isProduction;
    env.isProduction = true;
    try {
      const {response} = run(new Error("boom"));

      expect(response.body.error.debug).toBeUndefined();
      expect(response.body.error.message).toBe("Something went wrong. Please try again.");
    } finally {
      env.isProduction = original;
    }
  });

  it("logs a 5xx ApiError at error level but a 4xx one at debug level", () => {
    run(serviceUnavailable());

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.debug).not.toHaveBeenCalled();

    jest.clearAllMocks();
    run(badRequest("nope"));

    expect(logger.debug).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("always echoes the request id in meta, whatever the failure", () => {
    const {response} = run(new Error("boom"));

    expect(response.body.meta.requestId).toBe("req-1");
  });
});

describe("notFoundHandler", () => {
  const routeLayer = (methods, match) => ({
    name: "bound dispatch",
    route: {methods: Object.fromEntries(methods.map((method) => [method.toLowerCase(), true]))},
    match,
  });

  const routerLayer = (path, stack) => ({
    name: "router",
    path,
    handle: {stack},
    match: (requestPath) => requestPath.startsWith(path),
  });

  it("answers 404 for a path no route matches", () => {
    const response = makeResponse();
    const request = requestOf({app: {_router: {stack: []}}});

    notFoundHandler(request, response);

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({
      success: false,
      error: {code: "NOT_FOUND", message: "No route matches GET /api/v1/admin/programs"},
      meta: {requestId: "req-1"},
    });
    expect(response.set).not.toHaveBeenCalled();
  });

  it("answers 405 with an Allow header when the path exists but the verb does not", () => {
    const stack = [
      routerLayer("/api/v1/auth", [routeLayer(["post"], (path) => path === "/login")]),
    ];
    const response = makeResponse();

    notFoundHandler(requestOf({path: "/api/v1/auth/login", app: {_router: {stack}}}), response);

    expect(response.statusCode).toBe(405);
    expect(response.headers.Allow).toBe("POST");
    expect(response.body.error.code).toBe("METHOD_NOT_ALLOWED");
    expect(response.body.error.message).toContain("GET is not allowed");
  });

  it("collects every verb a route supports, sorted, and never advertises HEAD", () => {
    const stack = [
      routeLayer(["post", "get", "head"], (path) => path === "/health"),
    ];
    const response = makeResponse();

    notFoundHandler(requestOf({path: "/health", app: {_router: {stack}}}), response);

    expect(response.headers.Allow).toBe("GET, POST");
  });

  it("recurses through nested routers mounted at prefixes", () => {
    const stack = [
      routerLayer("/api", [
        routerLayer("/v1/admin", [
          routeLayer(["get", "put"], (path) => path === "/programs"),
        ]),
      ]),
    ];
    const response = makeResponse();

    notFoundHandler(requestOf({path: "/api/v1/admin/programs", app: {_router: {stack}}}), response);

    expect(response.headers.Allow).toBe("GET, PUT");
  });

  it("does not hand an arbitrary string to Express's matchers", () => {
    const stack = [{
      name: "bound dispatch",
      route: {methods: {get: true}},
      match: () => {
        throw new Error("matcher must not run on an unsafe path");
      },
    }];
    const response = makeResponse();

    notFoundHandler(requestOf({path: "/<script>alert(1)</script>", app: {_router: {stack}}}), response);

    expect(response.statusCode).toBe(404);
    expect(response.set).not.toHaveBeenCalled();
  });
});