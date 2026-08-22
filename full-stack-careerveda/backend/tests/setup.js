// Test bootstrap.
//
// Environment variables are set BEFORE anything imports src/config/env.js,
// which validates and exits on failure at module load. The secrets here are
// throwaway values that exist only to satisfy the 32-character minimum — they
// are not, and must never become, the ones used anywhere real.

import {beforeAll, afterAll, afterEach} from "vitest";
import {MongoMemoryServer} from "mongodb-memory-server";
import mongoose from "mongoose";

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "test-access-secret-not-for-any-real-use-0123456789";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-not-for-any-real-use-0123456789";
process.env.MONGODB_DB_NAME = "careerveda_test";
process.env.LOG_LEVEL = "silent";

// A placeholder, not the URI anything connects to — the real one comes from the
// in-memory server in beforeAll and is passed to connectDatabase explicitly.
// It has to be set here because env.js validates at import time, and that import
// happens when a test file pulls in src/app.js, which is before any hook runs.
// A developer's backend/.env supplied the value by accident and hid this; on a
// machine without one (CI) every suite exited 1 at load with "MONGODB_URI:
// Required" before a single test ran.
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/careerveda_test_placeholder";

let memoryServer;

beforeAll(async () => {
  // An in-memory server rather than a shared test database: suites can drop
  // collections freely without any chance of pointing at real data.
  memoryServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = memoryServer.getUri();

  const {connectDatabase} = await import("../src/config/database.js");
  await connectDatabase(process.env.MONGODB_URI);
});

// Between tests, empty every collection but keep the indexes. Dropping the
// database instead would discard unique indexes, and the tests that assert
// duplicate-key behaviour would then silently pass for the wrong reason.
afterEach(async () => {
  const {collections} = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await mongoose.connection.close();
  if (memoryServer) await memoryServer.stop();
});
