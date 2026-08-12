// Imports the exported collections under <repo>/Live_data into the configured
// database (Firestore with MongoDB compatibility or local Mongo).
//
//   npm run import:live-data               apply everything
//   npm run import:live-data:dry-run       report what would happen, write nothing
//   npm run import:live-data -- --collections=admins,alumnis
//
// Each Live_data/careerveda.<collection>.json is an Extended JSON export of one
// collection ("careerveda.faqs.json" -> the "faqs" collection); _id markers
// ($oid), dates ($date) and the rest are restored by bson's EJSON parser, so a
// document lands in Firestore with its original ObjectId and foreign keys
// intact.
//
// Safe to re-run: documents are inserted by their original _id, so a second
// pass skips what already exists instead of duplicating it.

import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {EJSON} from "bson";

import {connectDatabase, disconnectDatabase} from "../src/config/database.js";

const DRY_RUN = process.argv.includes("--dry-run");
const collectionsFlag = process.argv
  .find((arg) => arg.startsWith("--collections="))
  ?.slice("--collections=".length);
const only = new Set(
  collectionsFlag
    ? collectionsFlag.split(",").map((name) => name.trim()).filter(Boolean)
    : [],
);

// backend/ -> full-stack-careerveda/ -> repo root, where Live_data lives.
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DATA_DIR = path.resolve(REPO_ROOT, "../Live_data");

const BATCH_SIZE = 250;

const report = {collections: 0, inserted: 0, skipped: 0, failed: 0, details: []};

const loadCollection = async (file) => {
  const name = file.match(/^careerveda\.(.+)\.json$/)?.[1];
  if (!name || (only.size > 0 && !only.has(name))) return null;

  const raw = await fs.readFile(path.join(DATA_DIR, file), "utf8");
  const docs = EJSON.parse(raw);
  if (!Array.isArray(docs) || docs.length === 0) {
    throw new Error(`${file}: expected a non-empty JSON array, got ${Array.isArray(docs) ? "[]" : typeof docs}`);
  }
  for (const doc of docs) {
    if (!doc || typeof doc !== "object" || !doc._id) {
      throw new Error(`${file}: document without an _id`);
    }
  }
  return {name, docs};
};

const importCollection = async (db, {name, docs}) => {
  const collection = db.collection(name);

  if (DRY_RUN) {
    report.details.push(`  ~ ${name}: ${docs.length} documents would be imported`);
    return;
  }

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (let start = 0; start < docs.length; start += BATCH_SIZE) {
    const batch = docs.slice(start, start + BATCH_SIZE);
    // ordered: false — a document that already exists must be skipped, not
    // abort the whole batch (Firestore rejects a batch on the first conflict).
    const result = await collection.bulkWrite(
      batch.map((document) => ({insertOne: {document}})),
      {ordered: false},
    );
    inserted += result.insertedCount;
    for (const writeError of result.writeErrors ?? []) {
      // 11000 is the duplicate-key error: the document is already in the
      // database from an earlier run, which this script is designed to survive.
      // Anything else (validation, oversized key) is a real failure.
      if (writeError.err?.code === 11000) skipped += 1;
      else {
        failed += 1;
        report.details.push(`  ! ${name}: ${writeError.errmsg || writeError.err?.message}`);
      }
    }
  }

  report.inserted += inserted;
  report.skipped += skipped;
  report.failed += failed;
  report.details.push(
    `  ${failed > 0 ? "!" : inserted > 0 ? "+" : "-"} ${name}: ${inserted} inserted, ${skipped} already present, ${failed} failed`,
  );
};

const run = async () => {
  console.log(DRY_RUN ? "\nDRY RUN — nothing will be written\n" : `\nImporting ${DATA_DIR} into the configured database\n`);
  if (only.size > 0) console.log(`  (restricted to: ${[...only].join(", ")})\n`);

  const files = (await fs.readdir(DATA_DIR))
    .filter((file) => /^careerveda\.[a-z]+\.json$/.test(file))
    .sort();

  // Validate every file before touching the database, so a broken export is
  // reported once instead of halfway through a run.
  const collections = [];
  let errors = 0;
  for (const file of files) {
    try {
      const loaded = await loadCollection(file);
      if (loaded) collections.push(loaded);
    } catch (error) {
      errors += 1;
      report.failed += 1;
      console.error(`  ! ${file}: ${error.message}`);
    }
  }
  if (errors > 0) {
    console.error(`\nFix the exports above and re-run; nothing was written.\n`);
    process.exitCode = 1;
    return;
  }
  if (collections.length === 0) {
    if (only.size > 0) {
      console.error(`  ! no Live_data file matches --collections=${collectionsFlag}\n`);
      process.exitCode = 1;
    }
    return;
  }

  const connection = await connectDatabase();

  try {
    for (const collection of collections) {
      report.collections += 1;
      await importCollection(connection.db, collection);
    }
  } finally {
    await disconnectDatabase();
  }

  console.log("\n" + report.details.join("\n"));
  console.log(
    `\nCollections ${report.collections} · inserted ${report.inserted} · already present ${report.skipped} · failed ${report.failed}\n`,
  );
  if (report.failed > 0) process.exitCode = 1;
};

run().catch((error) => {
  console.error("\nImport failed:", error.message, "\n");
  process.exitCode = 1;
});