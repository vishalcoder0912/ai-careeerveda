// Creates every schema index against the configured database. On local Mongo
// this is what Mongoose's autoIndex already does at boot; on Firestore with
// MongoDB compatibility index builds are long-running operations, one per
// request, so they are deliberately created once here instead — either after
// the first connect or after any schema change:
//
//   npm run sync:indexes           apply
//   npm run sync:indexes:dry-run   list what would be created, create nothing
//
// Expect a run against Firestore to take minutes — each index maps to an async
// build (watch Firebase console → Firestore → Indexes for progress). Re-runs
// are safe: an index that already exists is reported and skipped.

import mongoose from "mongoose";

import {connectDatabase, disconnectDatabase} from "../src/config/database.js";
import "../src/models/Admin.js";
import "../src/models/Alumni.js";
import "../src/models/AuditLog.js";
import "../src/models/Blog.js";
import "../src/models/ContentRevision.js";
import "../src/models/Faculty.js";
import "../src/models/Faq.js";
import "../src/models/Job.js";
import "../src/models/Lead.js";
import "../src/models/Media.js";
import "../src/models/Policy.js";
import "../src/models/Program.js";
import "../src/models/RefreshToken.js";

const DRY_RUN = process.argv.includes("--dry-run");

const run = async () => {
  console.log(DRY_RUN ? "\nDRY RUN — nothing will be created\n" : "\nSyncing schema indexes\n");

  const conn = await connectDatabase();
  const models = Object.values(mongoose.models).sort((a, b) =>
    a.modelName.localeCompare(b.modelName),
  );

  console.log(`Connected to ${conn.name} (${conn.host.includes("firestore.goog") ? "Firestore" : "Mongo"})\n`);

  let created = 0;
  let existing = 0;
  let failed = 0;

  for (const model of models) {
    if (DRY_RUN) {
      console.log(`  ~ ${model.collection.name}: ${model.schema.indexes().length} index(es) would be created`);
      existing += model.schema.indexes().length;
      continue;
    }

    process.stdout.write(`  ${model.collection.name} …`);
    try {
      const result = await model.init();
      const kind = result?.ok === 1 ? "+" : "~";
      console.log(` ${kind}`);
      created += 1;
    } catch (error) {
      console.log(" !");
      failed += 1;
      console.error(`      ${error.message}`);
    }
  }

  console.log(
    DRY_RUN
      ? `\n${existing} indexes across ${models.length} collections would be created\n`
      : `\nDone: ${created} collections synced, ${failed} failed\n`,
  );
  if (failed > 0) process.exitCode = 1;
};

run()
  .catch((error) => {
    console.error("\nIndex sync failed:", error.message, "\n");
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });