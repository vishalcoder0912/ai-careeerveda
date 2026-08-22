import {describe, expect, it} from "@jest/globals";
import {formatBatchDate, nextSaturdayDate} from "../../src/jobs/updateBatchDates.js";

// The whole job reduces to two pure functions — find the next Saturday, render
// it the way the site prints it — so the sweep itself (one idempotent
// updateMany) is pinned down by testing those.

describe("nextSaturdayDate", () => {
  it("returns the upcoming Saturday for a weekday", () => {
    // 18 August 2026 is a Tuesday.
    expect(nextSaturdayDate(new Date("2026-08-18T10:00:00Z")).toISOString()).toBe(
      "2026-08-22T00:00:00.000Z",
    );
  });

  it("returns the Saturday a week away when today is already Saturday", () => {
    // A batch on today's date is a batch that has already started — the next
    // one is the following week.
    expect(nextSaturdayDate(new Date("2026-08-22T08:30:00Z")).toISOString()).toBe(
      "2026-08-29T00:00:00.000Z",
    );
  });

  it("wraps across a month boundary", () => {
    // 31 October 2026 is a Saturday; 1 November 2026 is a Sunday.
    expect(nextSaturdayDate(new Date("2026-11-01T12:00:00Z")).toISOString()).toBe(
      "2026-11-07T00:00:00.000Z",
    );
  });

  it("wraps across a year boundary", () => {
    // 29 December 2026 is a Tuesday, and 2 January 2027 is a Saturday.
    expect(nextSaturdayDate(new Date("2026-12-29T12:00:00Z")).toISOString()).toBe(
      "2027-01-02T00:00:00.000Z",
    );
  });

  it("normalises to UTC midnight rather than keeping the input's clock time", () => {
    expect(nextSaturdayDate(new Date("2026-08-18T23:59:59Z")).getUTCHours()).toBe(0);
  });
});

describe("formatBatchDate", () => {
  it("prints the date the way the catalogue and the site do", () => {
    expect(formatBatchDate(new Date("2026-08-22T00:00:00Z"))).toBe("August 22, 2026");
  });

  it("prints the day without a leading zero", () => {
    expect(formatBatchDate(new Date("2026-08-08T00:00:00Z"))).toBe("August 8, 2026");
  });
});