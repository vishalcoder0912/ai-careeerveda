import {describe, it, expect} from "vitest";

import {jobs} from "./jobsData";

describe("jobsData", () => {
  it("has a unique id per listing", () => {
    expect(new Set(jobs.map((job) => job.id)).size).toBe(jobs.length);
  });

  // backend/scripts/migrate-content.js upserts each listing by
  // toSlug(`${title}-${company}`), so two listings sharing both fields collapse
  // into one record in Mongo — the second silently overwrites the first, and the
  // job count on the live page quietly drops below the count in this file.
  it("has a unique title and company pair per listing", () => {
    const keys = jobs.map((job) => `${job.title}|${job.company}`.toLowerCase());
    expect(new Set(keys).size).toBe(jobs.length);
  });

  it("gives every listing the fields the jobs page reads", () => {
    for (const job of jobs) {
      expect(job.title, `job ${job.id}`).toBeTruthy();
      expect(job.company, `job ${job.id}`).toBeTruthy();
      expect(job.location, `job ${job.id}`).toBeTruthy();
      expect(Array.isArray(job.skills), `job ${job.id}`).toBe(true);
      expect(job.postedDate, `job ${job.id}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(job.applyUrl, `job ${job.id}`).toMatch(/^https:\/\/www\.linkedin\.com\/jobs\/search\/\?/);
    }
  });
});
