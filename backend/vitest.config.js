import {defineConfig} from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    // tests/unit is Jest's (see jest.config.js) and imports @jest/globals, which
    // throws outside the Jest runtime. Each runner owns one directory and neither
    // collects the other's files.
    exclude: ["**/node_modules/**", "tests/unit/**"],
    // Loads env vars and spins up the in-memory MongoDB before any suite runs,
    // so no test needs the real Atlas cluster.
    setupFiles: ["./tests/setup.js"],
    // Suites share one database. Running files in parallel would let one
    // suite's cleanup delete another's fixtures mid-assertion.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
