import {beforeEach, describe, expect, it, jest} from "@jest/globals";

// SharedStore is the piece that makes a counter survive a Cloud Run instance
// restart or a request landing on another instance. Mock the database at the
// module boundary so the real store logic — prefixing, window reset, fallback —
// is what these cases exercise.
const collection = {
  findOneAndUpdate: jest.fn(),
  updateOne: jest.fn(),
  deleteOne: jest.fn(),
};

jest.unstable_mockModule("mongoose", async () => ({
  default: {connection: {readyState: 1}},
}));

jest.unstable_mockModule("../../../src/models/RateLimit.js", async () => ({
  RateLimit: {collection},
}));

const mongoose = (await import("mongoose")).default;
const {SharedStore} = await import("../../../src/middleware/rateLimit.js");

const WINDOW_MS = 60 * 1000;

beforeEach(() => {
  collection.findOneAndUpdate.mockReset();
  collection.updateOne.mockReset();
  collection.deleteOne.mockReset();
  mongoose.connection.readyState = 1;
});

describe("SharedStore", () => {
  it("counts two independent instances against the same key", async () => {
    const state = new Map();
    collection.findOneAndUpdate.mockImplementation(async ({_id}) => {
      const now = new Date();
      let doc = state.get(_id);
      if (!doc || doc.resetAt <= now) {
        doc = {hits: 0, resetAt: new Date(now.getTime() + WINDOW_MS)};
      }
      doc.hits += 1;
      state.set(_id, doc);
      return {...doc};
    });

    const firstInstance = new SharedStore("upload");
    const secondInstance = new SharedStore("upload");
    firstInstance.init({windowMs: WINDOW_MS});
    secondInstance.init({windowMs: WINDOW_MS});

    expect(await firstInstance.increment("203.0.113.7")).toMatchObject({totalHits: 1});
    expect(await secondInstance.increment("203.0.113.7")).toMatchObject({totalHits: 2});
    expect(collection.findOneAndUpdate.mock.calls[0][0]).toEqual({_id: "upload:203.0.113.7"});
    expect(collection.findOneAndUpdate.mock.calls[1][0]).toEqual({_id: "upload:203.0.113.7"});
  });

  it("prefixes different limiters so they cannot share a budget", async () => {
    collection.findOneAndUpdate.mockResolvedValue({hits: 1, resetAt: new Date(Date.now() + WINDOW_MS)});
    const global = new SharedStore("global");
    const upload = new SharedStore("upload");
    global.init({windowMs: WINDOW_MS});
    upload.init({windowMs: WINDOW_MS});

    await global.increment("203.0.113.7");
    await upload.increment("203.0.113.7");

    expect(collection.findOneAndUpdate.mock.calls.map((call) => call[0]._id)).toEqual([
      "global:203.0.113.7",
      "upload:203.0.113.7",
    ]);
  });

  it("decrements and resets through the same prefixed key", async () => {
    const store = new SharedStore("upload");
    store.init({windowMs: WINDOW_MS});

    await store.decrement("203.0.113.7");
    await store.resetKey("203.0.113.7");

    expect(collection.updateOne).toHaveBeenCalledWith({_id: "upload:203.0.113.7"}, {$inc: {hits: -1}});
    expect(collection.deleteOne).toHaveBeenCalledWith({_id: "upload:203.0.113.7"});
  });

  it("counts in memory while the database is unavailable", async () => {
    mongoose.connection.readyState = 0;
    const store = new SharedStore("upload");
    store.init({windowMs: WINDOW_MS});

    expect(await store.increment("203.0.113.7")).toMatchObject({totalHits: 1});
    expect(await store.increment("203.0.113.7")).toMatchObject({totalHits: 2});
    expect(collection.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
