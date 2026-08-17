import {defineConfig, devices} from "@playwright/test";

// End-to-end tests across all three applications.
//
// Playwright starts the whole stack itself, on ports that do not collide with a
// running dev environment, against an in-memory database seeded per run. That is
// what makes it safe to run while you are working: nothing here can touch the
// Atlas database or the ImageKit account the real site uses. See
// backend/scripts/e2e-server.js for how that is enforced.
//
//   backend   8081   in-memory MongoDB, ImageKit disabled
//   frontend  5273   pointed at 8081
//   admin     5274   pointed at 8081

// A workstation often already has the normal frontend/admin dev servers open.
// Let a test run choose three clean ports so `reuseExistingServer` never points
// Playwright at an app configured for a different API. Defaults preserve the
// documented one-command local run; CI can override all three together.
const port = (name, fallback) => {
  const value = Number(process.env[name] || fallback);
  return Number.isInteger(value) && value > 0 ? value : fallback;
};

const API_PORT = port("E2E_API_PORT", 8081);
const FRONTEND_PORT = port("E2E_FRONTEND_PORT", 5273);
const ADMIN_PORT = port("E2E_ADMIN_PORT", 5274);

export const API = `http://localhost:${API_PORT}/api/v1`;

export const FRONTEND = `http://localhost:${FRONTEND_PORT}`;
export const ADMIN = `http://localhost:${ADMIN_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Each spec drives one shared backend and creates records with unique names,
  // but publishing and unpublishing the same seeded record from two workers at
  // once would make failures depend on timing. Serial is slower and honest.
  forbidOnly: !!process.env.CI,
  workers: 1,
  fullyParallel: false,
  // A test that only passes on retry is a flaky test, and locally that is
  // information worth keeping rather than hiding.
  retries: 0,
  timeout: 60_000,
  expect: {timeout: 10_000},
  reporter: [["list"]],

  use: {
    // Artifacts on failure only. A green run leaves nothing behind, which is why
    // test-results/ can stay out of the repository.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },

  projects: [
    {name: "chromium", use: {...devices["Desktop Chrome"]}},
    {name: "mobile-chromium", use: {...devices["Pixel 7"]}},
  ],

  webServer: [
    {
      command: "node scripts/e2e-server.js",
      cwd: "./backend",
      url: `http://localhost:${API_PORT}/health`,
      // Booting downloads-and-starts an in-memory mongod on a cold machine.
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        E2E_API_PORT: String(API_PORT),
        E2E_FRONTEND_URL: FRONTEND,
        E2E_ADMIN_URL: ADMIN,
      },
    },
    {
      command: `node node_modules/vite/bin/vite.js --port ${FRONTEND_PORT} --strictPort`,
      url: FRONTEND,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
      env: {VITE_PUBLIC_API_BASE_URL: API},
    },
    {
      command: `node ../node_modules/vite/bin/vite.js --port ${ADMIN_PORT} --strictPort`,
      cwd: "./admin",
      url: ADMIN,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
      env: {VITE_ADMIN_API_BASE_URL: API, VITE_PUBLIC_SITE_URL: FRONTEND},
    },
  ],
});
