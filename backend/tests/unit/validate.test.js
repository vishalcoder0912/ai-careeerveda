import {describe, expect, it, jest} from "@jest/globals";
import {z} from "zod";

import {validate} from "../../src/middleware/validate.js";

// Express request/response stand-ins. validate touches req.body/query/params and
// nothing else, so anything more elaborate would be testing the mock.
const requestOf = (parts = {}) => ({body: {}, query: {}, params: {}, ...parts});

// The real thing is a getter on Express 5, which is why validate uses
// defineProperty rather than assignment. Reproduce that here or the test proves
// nothing about the case the code exists for.
const withGetterQuery = (value) => {
  const request = requestOf();
  Object.defineProperty(request, "query", {get: () => value, configurable: true});
  return request;
};

const run = (middleware, request) => {
  const next = jest.fn();
  middleware(request, {}, next);
  return next;
};

describe("validate", () => {
  it("passes a valid body through and calls next with no argument", () => {
    const next = run(
      validate({body: z.object({title: z.string()})}),
      requestOf({body: {title: "Hello"}}),
    );

    expect(next).toHaveBeenCalledWith();
  });

  it("REPLACES the body, so an undeclared field cannot ride along into a model", () => {
    const request = requestOf({body: {title: "Hello", role: "super-admin"}});

    run(validate({body: z.object({title: z.string()})}), request);

    expect(request.body).toEqual({title: "Hello"});
    expect(request.body.role).toBeUndefined();
  });

  it("keeps the coerced value, not the raw one — a schema that transforms is honoured", () => {
    const request = requestOf({query: {limit: "25"}});

    run(validate({query: z.object({limit: z.coerce.number()})}), request);

    expect(request.query.limit).toBe(25);
  });

  it("assigns query onto the request even when Express exposes it as a getter", () => {
    const request = withGetterQuery({page: "2"});

    run(validate({query: z.object({page: z.coerce.number()})}), request);

    expect(request.query).toEqual({page: 2});
  });

  it("also exposes the parsed query as validatedQuery, which is what controllers read", () => {
    const request = withGetterQuery({page: "2"});

    run(validate({query: z.object({page: z.coerce.number()})}), request);

    expect(request.validatedQuery).toEqual({page: 2});
  });

  it("strips an unknown param rather than trusting the route's own capture", () => {
    const request = requestOf({params: {id: "abc", extra: "x"}});

    run(validate({params: z.object({id: z.string()})}), request);

    expect(request.params).toEqual({id: "abc"});
  });

  it("hands a validation failure to next() instead of throwing into the pipeline", () => {
    const request = requestOf({body: {title: 42}});
    const next = run(validate({body: z.object({title: z.string()})}), request);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(next.mock.calls[0][0].name).toBe("ZodError");
  });

  it("leaves the request untouched when validation fails — no half-applied parse", () => {
    const request = requestOf({body: {title: 42}, params: {id: "abc"}});

    run(validate({params: z.object({id: z.string()}), body: z.object({title: z.string()})}), request);

    // params parsed first and stands; body is refused whole, not partially merged.
    expect(request.params).toEqual({id: "abc"});
    expect(request.body).toEqual({title: 42});
  });

  it("survives a schema that throws something other than a ZodError", () => {
    // A malformed schema must fail the one request, not take the process down.
    const exploding = {parse: () => {
      throw new TypeError("schema is broken");
    }};
    const request = requestOf({body: {}});
    const next = run(validate({body: exploding}), request);

    expect(next.mock.calls[0][0]).toBeInstanceOf(TypeError);
  });

  it("is a no-op when no schema is supplied for a section", () => {
    const request = requestOf({body: {anything: true}, query: {q: "x"}, params: {id: "1"}});
    const next = run(validate({}), request);

    expect(next).toHaveBeenCalledWith();
    expect(request.body).toEqual({anything: true});
    expect(request.query).toEqual({q: "x"});
    expect(request.params).toEqual({id: "1"});
    expect(request.validatedQuery).toBeUndefined();
  });

  it("validates only the sections it was given", () => {
    const request = requestOf({body: {title: "ok"}, query: {junk: "unvalidated"}});

    run(validate({body: z.object({title: z.string()})}), request);

    expect(request.query).toEqual({junk: "unvalidated"});
  });
});
