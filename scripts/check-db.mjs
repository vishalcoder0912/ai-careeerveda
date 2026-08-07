// Verifies the MongoDB connection and shows what the forms have stored.
//
//   node scripts/check-db.mjs
//
// Reads MONGODB_URI from .env. Prints no credentials.

import {readFileSync} from "node:fs";
import {MongoClient} from "mongodb";

const readEnv = () => {
  try {
    for (const line of readFileSync(".env", "utf8").split("\n")) {
      const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const [, key, value] = match;
      if (!process.env[key]) process.env[key] = value.replace(/^["']|["']$/g, "");
    }
  } catch {
    console.error("No .env file found.");
  }
};

readEnv();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "careerveda";

if (!uri) {
  console.error("✗ MONGODB_URI is empty in .env — the forms will return 503.");
  process.exit(1);
}

const client = new MongoClient(uri, {serverSelectionTimeoutMS: 8000});

try {
  await client.connect();
  await client.db(dbName).command({ping: 1});
  console.log(`✓ Connected to database "${dbName}"`);

  for (const name of ["enrollments", "consultations"]) {
    const collection = client.db(dbName).collection(name);
    const count = await collection.countDocuments();
    const latest = await collection.find().sort({submittedAt: -1}).limit(3).toArray();

    console.log(`\n${name}: ${count} document(s)`);
    for (const doc of latest) {
      console.log(
        `  · ${doc.submittedAt?.toISOString?.() ?? "?"} — ${doc.name} <${doc.email}> ${doc.program ? `[${doc.program}]` : ""}`,
      );
    }
  }
} catch (error) {
  console.error(`✗ Connection failed: ${error.message}`);
  console.error(
    "\nUsual causes:\n" +
      "  · Your current IP isn't allowed — Atlas → Network Access → Add IP Address.\n" +
      "    Vercel's functions need 0.0.0.0/0 there, as their IPs are not static.\n" +
      "  · Wrong username/password in the URI (special characters must be URL-encoded).\n" +
      "  · The URI still has the literal <password> placeholder in it.",
  );
  process.exitCode = 1;
} finally {
  await client.close();
}
