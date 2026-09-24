import {afterEach, beforeEach, describe, expect, it, jest} from "@jest/globals";

// The scheduled-publishing sweep is internal to publishScheduled.js and driven
// by the exported startScheduledPublishing interval, so this suite replaces the
// model registry with two fake models, boots the interval on fake timers, and
// asserts the updateMany calls it makes — shape, query and pipeline — rather
// than talking to a database. unstable_mockModule is the ESM mocking mechanism
// documented in tests/unit/README.md.
const updateMany = jest.fn();

jest.unstable_mockModule("../../../src/config/resources.js", async () => ({
  RESOURCES: {
    programs: {name: "programs", model: {updateMany}},
    blogs: {name: "blogs", model: {updateMany}},
  },
  RESOURCE_NAMES: ["programs", "blogs"],
}));

const {startScheduledPublishing} = await import("../../../src/jobs/publishScheduled.js");

const tickMs = 1_000;

beforeEach(() => {
  updateMany.mockReset();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("startScheduledPublishing", () => {
  it("queries every resource for due scheduled records on each sweep", async () => {
    updateMany.mockResolvedValue({modifiedCount: 0});
    const timer = startScheduledPublishing(tickMs);

    await jest.advanceTimersByTimeAsync(tickMs);

    expect(updateMany).toHaveBeenCalledTimes(2);
    for (const call of updateMany.mock.calls) {
      const [query, pipeline] = call;
      expect(query.status).toBe("scheduled");
      expect(query.deletedAt).toBeNull();
      expect(query.scheduledAt.$lte).toBeInstanceOf(Date);
      expect(pipeline[0].$set).toMatchObject({status: "published", scheduledAt: null});
      expect(pipeline[0].$set.publishedAt).toEqual({$ifNull: ["$publishedAt", "$scheduledAt"]});
    }
    clearInterval(timer);
  });

  it("asks again on its interval until stopped, without stacking up overdue work", async () => {
    updateMany.mockResolvedValue({modifiedCount: 0});
    const timer = startScheduledPublishing(tickMs);

    await jest.advanceTimersByTimeAsync(tickMs * 3);

    expect(updateMany).toHaveBeenCalledTimes(6);
    clearInterval(timer);
  });

  it("keeps sweeping after a resource fails, so one bad model does not kill the job", async () => {
    updateMany.mockResolvedValue({modifiedCount: 0}).mockRejectedValueOnce(new Error("db down"));
    const timer = startScheduledPublishing(tickMs);

    await jest.advanceTimersByTimeAsync(tickMs);
    expect(updateMany).toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(tickMs);
    expect(updateMany).toHaveBeenCalledTimes(3);
    clearInterval(timer);
  });
});