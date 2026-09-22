// Boots the same isolated stack the Playwright suite uses — in-memory MongoDB
// backend, frontend and admin on dedicated Selenium ports (8082 / 5283 / 5284)
// — then runs the WebDriver tests in selenium/ against it. Nothing here can
// touch the Atlas database or the ImageKit account the real site uses. See
// backend/scripts/e2e-server.js for how that is enforced.
//
//   node scripts/selenium.mjs              # headless Chrome (CI-safe)
//   node scripts/selenium.mjs --headed     # a visible Chrome window
//   node scripts/selenium.mjs --browser firefox
//
// Ports and browser can also be set via SELENIUM_API_PORT, SELENIUM_FRONTEND_PORT,
// SELENIUM_ADMIN_PORT and SELENIUM_BROWSER.

import {spawn, spawnSync} from "node:child_process";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";

const port = (name, fallback) => {
  const value = Number(process.env[name] || fallback);
  return Number.isInteger(value) && value > 0 ? value : fallback;
};

const API_PORT = port("SELENIUM_API_PORT", 8082);
const FRONTEND_PORT = port("SELENIUM_FRONTEND_PORT", 5283);
const ADMIN_PORT = port("SELENIUM_ADMIN_PORT", 5284);

const API_URL = `http://localhost:${API_PORT}`;
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;
const ADMIN_URL = `http://localhost:${ADMIN_PORT}`;

const argv = process.argv.slice(2);
const headed = argv.includes("--headed");
const browserArg = argv.indexOf("--browser");
const browser = browserArg >= 0 && argv[browserArg + 1] ? argv[browserArg + 1] : process.env.SELENIUM_BROWSER || "chrome";
const headless = !headed && process.env.SELENIUM_HEADLESS !== "0";

const children = new Set();

const spawnServer = (label, command, args, cwd, env) => {
  const child = spawn(command, args, {
    cwd,
    env: {...process.env, ...env},
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.add(child);
  child.stdout.on("data", (chunk) => process.stdout.write(`[${label}] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[${label}] ${chunk}`));
  child.on("exit", () => children.delete(child));
  return child;
};

const waitFor = async (url, label, timeout = 180_000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url, {signal: AbortSignal.timeout(3_000)});
      if (response.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((resolveIt) => {
      setTimeout(resolveIt, 500);
    });
  }
  console.error(`[selenium] ${label} never came up at ${url}`);
  return false;
};

const killTree = (child) => {
  if (isWin) {
    try {
      spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], {stdio: "ignore"});
    } catch {
      /* already gone */
    }
  } else {
    try {
      child.kill("SIGTERM");
    } catch {
      /* already gone */
    }
  }
};

const shutdown = () => {
  for (const child of children) killTree(child);
  children.clear();
};

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.once(sig, () => {
    console.error(`\n[selenium] ${sig} received — shutting the stack down`);
    shutdown();
    process.exit(130);
  });
}

const run = async () => {
  console.log(`[selenium] isolated stack: API ${API_URL} | frontend ${FRONTEND_URL} | admin ${ADMIN_URL}`);
  console.log(`[selenium] browser=${browser} (${headless ? "headless" : "headed, pass --headed/keep SELENIUM_HEADLESS=0"})`);

  spawnServer("api", process.execPath, ["scripts/e2e-server.js"], join(root, "backend"), {
    E2E_API_PORT: String(API_PORT),
    E2E_FRONTEND_URL: FRONTEND_URL,
    E2E_ADMIN_URL: ADMIN_URL,
  });

  spawnServer(
    "frontend",
    process.execPath,
    ["node_modules/vite/bin/vite.js", "--port", String(FRONTEND_PORT), "--strictPort"],
    root,
    {VITE_PUBLIC_API_BASE_URL: `${API_URL}/api/v1`},
  );

  spawnServer(
    "admin",
    process.execPath,
    ["node_modules/vite/bin/vite.js", "--port", String(ADMIN_PORT), "--strictPort"],
    join(root, "admin"),
    {VITE_ADMIN_API_BASE_URL: `${API_URL}/api/v1`, VITE_PUBLIC_SITE_URL: FRONTEND_URL},
  );

  let code = 1;
  try {
    const apiUp = await waitFor(`${API_URL}/health`, "API");
    const frontendUp = await waitFor(FRONTEND_URL, "frontend", 120_000);
    const adminUp = await waitFor(ADMIN_URL, "admin", 120_000);

    if (!(apiUp && frontendUp && adminUp)) {
      console.error(
        "[selenium] a port is blocked by a stale process — kill it or move the stack via SELENIUM_API_PORT / SELENIUM_FRONTEND_PORT / SELENIUM_ADMIN_PORT",
      );
    } else {
      console.log("[selenium] stack is up — running WebDriver tests (node --test selenium)");
      const run = spawnSync(process.execPath, ["--test", "--test-concurrency=1", "selenium/*.test.mjs"], {
        cwd: root,
        stdio: "inherit",
        env: {
          ...process.env,
          SELENIUM_API_URL: `${API_URL}/api/v1`,
          SELENIUM_FRONTEND_URL: FRONTEND_URL,
          SELENIUM_ADMIN_URL: ADMIN_URL,
          SELENIUM_BROWSER: browser,
          SELENIUM_HEADLESS: headless ? "1" : "0",
        },
      });
      code = run.status ?? 1;
    }
  } finally {
    shutdown();
  }
  process.exit(code);
};

run().catch((error) => {
  console.error("[selenium] unexpected failure:", error);
  shutdown();
  process.exit(1);
});