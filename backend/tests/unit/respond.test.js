import {beforeEach, describe, expect, it, jest} from "@jest/globals";
import {created, noContent, ok, paginated} from "../../src/utils/respond.js";

// A stand-in for the Express response, recording what the helper sent. Small
// enough to keep honest: json/status/end and the locals the helpers read.
const makeResponse = (requestId = "req-1") => {
  const response = {
    locals: {requestId},
    statusCode: 200,
    body: undefined,
    ended: false,
  };

  response.json = jest.fn((payload) => {
    response.body = payload;
    return response;
  });
  response.status = jest.fn((code) => {
    response.statusCode = code;
    return response;
  });
  response.end = jest.fn(() => {
    response.ended = true;
    return response;
  });

  return response;
};

let response;

beforeEach(() => {
  response = makeResponse();
});

describe("ok", () => {
  it("wraps data in the success envelope", () => {
    ok(response, {id: 1});

    expect(response.body).toEqual({
      success: true,
      data: {id: 1},
      meta: {requestId: "req-1"},
    });
  });

  it("stamps the requestId so a client can quote it to support", () => {
    ok(makeResponse("abc-123"), null);
    ok(response, null);

    expect(response.body.meta.requestId).toBe("req-1");
  });

  it("merges extra meta alongside the requestId", () => {
    ok(response, [], {cached: true});

    expect(response.body.meta).toEqual({requestId: "req-1", cached: true});
  });

  it("lets caller meta override the requestId, since it is spread second", () => {
    ok(response, [], {requestId: "override"});

    expect(response.body.meta.requestId).toBe("override");
  });

  it("sends null and empty arrays as data rather than omitting the key", () => {
    ok(response, null);
    expect("data" in response.body).toBe(true);
    expect(response.body.data).toBeNull();

    ok(response, []);
    expect(response.body.data).toEqual([]);
  });

  it("does not set a status — 200 is Express's default", () => {
    ok(response, {});

    expect(response.status).not.toHaveBeenCalled();
  });
});

describe("created", () => {
  it("responds 201 with the same envelope", () => {
    created(response, {id: 7});

    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.body).toEqual({
      success: true,
      data: {id: 7},
      meta: {requestId: "req-1"},
    });
  });

  it("merges extra meta", () => {
    created(response, {}, {location: "/programs/x"});

    expect(response.body.meta.location).toBe("/programs/x");
  });
});

describe("paginated", () => {
  it("keeps data a bare array and puts paging in meta", () => {
    paginated(response, [{id: 1}, {id: 2}], {page: 1, limit: 2, total: 5});

    expect(response.body.data).toEqual([{id: 1}, {id: 2}]);
    expect(response.body.meta).toMatchObject({page: 1, limit: 2, total: 5});
  });

  it("rounds totalPages up — a partial last page still counts", () => {
    paginated(response, [], {page: 1, limit: 10, total: 21});
    expect(response.body.meta.totalPages).toBe(3);

    paginated(response, [], {page: 1, limit: 10, total: 20});
    expect(response.body.meta.totalPages).toBe(2);
  });

  it("reports totalPages 0 rather than Infinity when limit is 0", () => {
    // limit 0 would divide by zero; the guard is what stops Infinity reaching JSON.
    paginated(response, [], {page: 1, limit: 0, total: 5});

    expect(response.body.meta.totalPages).toBe(0);
  });

  it("sets hasMore only while records remain beyond this page", () => {
    paginated(response, [], {page: 1, limit: 10, total: 25});
    expect(response.body.meta.hasMore).toBe(true);

    paginated(response, [], {page: 3, limit: 10, total: 25});
    expect(response.body.meta.hasMore).toBe(false);

    // Exactly filled: the last page is not "more".
    paginated(response, [], {page: 2, limit: 10, total: 20});
    expect(response.body.meta.hasMore).toBe(false);
  });

  it("handles an empty result set without claiming a page of data", () => {
    paginated(response, [], {page: 1, limit: 10, total: 0});

    expect(response.body.meta.totalPages).toBe(0);
    expect(response.body.meta.hasMore).toBe(false);
  });
});

describe("noContent", () => {
  it("sends 204 and ends without a body", () => {
    noContent(response);

    expect(response.status).toHaveBeenCalledWith(204);
    expect(response.ended).toBe(true);
    expect(response.json).not.toHaveBeenCalled();
  });
});
