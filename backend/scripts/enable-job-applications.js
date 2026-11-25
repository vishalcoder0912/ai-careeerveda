// One-time data fix: every published listing must take applications through
// CareerVeda. Older records either have no `acceptsApplications` flag or were
// seeded with it off, which made the public site fall back to a third-party
// job search instead of showing the Job Overview + application form.
//
//   node scripts/enable-job-applications.js          read-only report
//   node scripts/enable-job-applications.js --apply  write the flag
//
// The admin Applications toggle keeps working afterwards: this only changes
// the existing rows; it does not remove the field or change the API.

import {connectDatabase, disconnectDatabase} from "../src/config/database.js";
import {Job} from "../src/models/Job.js";
import {publishedFilter} from "../src/models/plugins/contentPlugin.js";

const APPLY = process.argv.includes("--apply");

const run = async () => {
  await connectDatabase();

  // Only rows a visitor can actually see. Drafts and deleted listings stay
  // untouched so an editor's unpublished work is not silently changed.
  const published = publishedFilter();
  const filter = {
    ...published,
    acceptsApplications: {$ne: true},
  };
  const jobs = await Job.find(filter).select("title company slug acceptsApplications status").lean();
  console.log(`\n${jobs.length} published/listed job(s) are not accepting CareerVeda applications\n`);
  for (const job of jobs) {
    console.log(`  ${job.title} · ${job.company || "(no company)"} · ${job.slug || "(no slug)"}`);
  }

  if (!APPLY) {
    console.log("\nDry run: nothing changed. Re-run with --apply to update these records.\n");
    return;
  }

  const result = await Job.updateMany(filter, {$set: {acceptsApplications: true}});
  console.log(`\nUpdated ${result.modifiedCount} job(s) to accept applications.\n`);

  const remaining = await Job.countDocuments({...published, acceptsApplications: {$ne: true}});
  console.log(`${remaining} job(s) remain closed.\n`);
};

run()
  .catch((error) => {
    console.error("\nCould not enable job applications:", error.message, "\n");
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
