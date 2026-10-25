// Removes duplicate job applications left behind before submissions became
// idempotent. A single "Apply" click could store several rows when the unique
// (job, mobileKey) index had never been built on Firestore.
//
//   npm run dedupe:job-applications         read-only report
//   npm run dedupe:job-applications:apply   delete the extra rows
//
// The oldest row in each group is kept (it is the one the learner actually
// submitted first); later copies are deleted. Run this BEFORE
// `npm run sync:indexes` — the unique index cannot be built while duplicates
// still exist.

import {connectDatabase, disconnectDatabase} from "../src/config/database.js";
import {JobApplication} from "../src/models/JobApplication.js";

const APPLY = process.argv.includes("--apply");

const run = async () => {
  const connection = await connectDatabase();
  console.log(`\nChecking ${connection.name} for duplicate job applications\n`);

  const groups = new Map();
  const rows = await JobApplication.find({})
    .sort({createdAt: 1, _id: 1})
    .select("job jobTitle name mobile mobileKey createdAt")
    .lean();

  for (const row of rows) {
    const key = `${row.job}:${row.mobileKey}`;
    const group = groups.get(key);
    if (group) {
      group.extras.push(row._id);
      group.count += 1;
    } else {
      groups.set(key, {
        jobTitle: row.jobTitle,
        name: row.name,
        mobile: row.mobile,
        count: 1,
        extras: [],
      });
    }
  }

  const duplicates = [...groups.values()].filter((group) => group.extras.length > 0);
  const extras = duplicates.flatMap((group) => group.extras);

  console.log(`${duplicates.length} duplicate group(s), ${extras.length} extra row(s)\n`);
  for (const group of duplicates) {
    console.log(
      `  ${group.jobTitle || "(job removed)"} · ${group.name} · ${group.mobile} — ${group.count} rows`,
    );
  }

  if (!APPLY) {
    if (extras.length) {
      console.log("\nDry run: nothing deleted. Re-run with --apply to remove the extras.\n");
    } else {
      console.log("Nothing to clean up.\n");
    }
    return;
  }

  if (extras.length) {
    const result = await JobApplication.deleteMany({_id: {$in: extras}});
    console.log(`\nDeleted ${result.deletedCount} duplicate row(s).\n`);
  } else {
    console.log("Nothing to clean up.\n");
  }

  console.log("Next: run `npm run sync:indexes` so the unique index is created.\n");
};

run()
  .catch((error) => {
    console.error("\nDuplicate cleanup failed:", error.message, "\n");
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
