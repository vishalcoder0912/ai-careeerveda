// Jest bootstrap, the mirror of tests/setup.js for the vitest suites.
//
// Environment variables are set BEFORE anything imports src/config/env.js,
// which validates and exits on failure at module load. The secrets here are
// throwaway values that exist only to satisfy the 32-character minimum — they
// are not, and must never become, the ones used anywhere real.
//
// Without this file the unit suites pass on a machine with a backend/.env and
// crash the Jest worker on a fresh checkout (CI), where no .env exists: every
// suite that pulls in src/config/logger.js (via jobs, models, middleware)
// imports env.js at module scope and exits 1 with "MONGODB_URI: Required".

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "test-access-secret-not-for-any-real-use-0123456789";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-not-for-any-real-use-0123456789";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/careerveda_test_placeholder";
process.env.LOG_LEVEL = "silent";
