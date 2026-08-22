import {describe, expect, it, jest} from "@jest/globals";

import {__testing, sanitizeRequest} from "../../../src/middleware/sanitizeRequest.js";

// The middleware is a thin shell over `clean`, which the module exports for
// exactly this reason. The shell's own job — which parts of the request it
// rewrites and which it leaves alone — is tested separately below.

const {clean} = __testing;

const run = (parts = {}) => {
  const request = {body: undefined, query: undefined, params: undefined, ...parts};
  const next = jest.fn();
  sanitizeRequest(request, {}, next);
  return {request, next};
};

describe("clean", () => {
  it("drops keys starting with $ at any depth, so NoSQL operators cannot survive", () => {
    expect(clean({email: {$ne: null}, $where: "1=1"})).toEqual({email: {}});
  });

  it("drops prototype-chain keys even when nested", () => {
    const result = clean({settings: {__proto__: {admin: true}}});

    expect(result).toEqual({settings: {}});
    expect(Object.getPrototypeOf(result.settings)).toBe(Object.prototype);
  });

  it("drops constructor and prototype keys", () => {
    expect(clean({constructor: {prototype: {x: 1}}})).toEqual({});
    expect(clean({prototype: {polluted: true}})).toEqual({});
  });

  it("drops dotted keys, which would reach into subdocument paths on an update", () => {
    expect(clean({"a.b": 1, "a.$c": 2, ok: 3})).toEqual({ok: 3});
  });

  it("recurses through arrays and nested objects", () => {
    const result = clean({items: [{name: "x", $ne: 1}, {deep: {__proto__: {}}}]});

    expect(result).toEqual({items: [{name: "x"}, {deep: {}}]});
  });

  it("leaves primitives alone, and treats any non-array object as a key map", () => {
    expect(clean(null)).toBeNull();
    expect(clean(42)).toBe(42);
    expect(clean("text")).toBe("text");
    // A Date has no own enumerable keys, so as a "map" it collapses to {} —
    // request bodies never carry Dates, so nothing real is lost by that.
    expect(clean(new Date())).toEqual({});
  });

  it("stops recursing past 20 levels so a crafted depth cannot blow the stack", () => {
    let value = "leaf";
    for (let i = 0; i < 25; i += 1) value = {nested: value};

    const cleaned = clean(value);

    let probe = cleaned;
    for (let i = 0; i < 21; i += 1) probe = probe.nested;
    expect(probe).toBeUndefined();
  });

  it("produces ordinary objects, never objects with a polluted prototype", () => {
    const result = clean({a: {b: 1}});

    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(result.a)).toBe(Object.prototype);
  });
});

describe("sanitizeRequest", () => {
  it("rewrites the body and params in place, dropping dangerous keys", () => {
    const {request, next} = run({
      body: {name: "Priya", $ne: null, __proto__: {admin: true}},
      params: {id: "abc", constructor: {}},
    });

    expect(request.body).toEqual({name: "Priya"});
    expect(request.params).toEqual({id: "abc"});
    expect(next).toHaveBeenCalledWith();
  });

  it("mutates the existing query object rather than reassigning it", () => {
    const query = {page: "2", $where: "1=1", "filter.x": 1};
    const {request} = run({query});

    expect(Object.is(request.query, query)).toBe(true);
    expect(request.query).toEqual({page: "2"});
  });

  it("leaves an absent body, params and query untouched", () => {
    const {request, next} = run({});

    expect(request.body).toBeUndefined();
    expect(request.params).toBeUndefined();
    expect(request.query).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
  });

  it("does not treat a non-plain query (e.g. a string) as something to clean", () => {
    const {request, next} = run({query: "page=2"});

    expect(request.query).toBe("page=2");
    expect(next).toHaveBeenCalledWith();
  });

  it("always continues the chain, even when there is nothing to clean", () => {
    const {next} = run({body: {clean: true}});

    expect(next).toHaveBeenCalledWith();
  });
});