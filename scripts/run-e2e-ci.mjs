// CI watchdog for the end-to-end suite.
//
// On the Jenkins box the Playwright runner has occasionally stopped exiting
// after the last test (no summary, workers never torn down, webServers left
// alive), and a hung `bat` step then stalls the whole pipeline until the stage
// timeout — while the node/vite/mongod children survive even an abort and hold
// the e2e ports for the next build.
//
// This wrapper is the safety valve: it runs the same suite `npm run test:e2e`
// runs, streams the output straight through, and if the runner has not exited
// within the cap it force-kills the entire process tree plus anything still
// listening on the e2e ports, then fails the stage fast so the post-action can
// archive the artifacts. A run that finishes normally passes its exit code
// through untouched.
//
// Run from the repository root:  node scripts/run-e2e-ci.mjs

import {spawn} from "node:child_process";
import {fileURLToPath} from "node:url";

const CAP_MINUTES = Number(process.env.E2E_WATCHDOG_MINUTES || 40);

// Same defaults and overrides as playwright.config.js. In CI these come from
// the Jenkinsfile, so the kill list always matches the ports in use.
const ports = [
  process.env.E2E_API_PORT || "8081",
  process.env.E2E_FRONTEND_PORT || "5273",
  process.env.E2E_ADMIN_PORT || "5274",
];

// The Jenkins service PATH lacks System32, so netstat/taskkill must be reached
// by full path, exactly as the Jenkinsfile does.
const system32 = process.env.SystemRoot ? `${process.env.SystemRoot}\\System32` : "C:\\Windows\\System32";
const netstatBin = process.platform === "win32" ? `${system32}\\netstat.exe` : "netstat";
const taskkillBin = process.platform === "win32" ? `${system32}\\taskkill.exe` : "taskkill";

const killTree = (pid) => {
  if (process.platform === "win32") {
    // /T kills the whole tree: playwright, vite, mongod, browsers.
    spawn(taskkillBin, ["/F", "/T", "/PID", String(pid)], {stdio: "ignore", windowsHide: true});
  } else {
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      try {
        process.kill(pid, "SIGKILL");
      } catch {
        // Already gone.
      }
    }
  }
};

// Anything still bound to the e2e ports has to be a leftover from this run —
// the ports are the offset ones nothing else on the machine uses.
const killPortOwners = () => {
  if (process.platform !== "win32") return;
  const netstat = spawn(netstatBin, ["-ano"], {windowsHide: true});
  let out = "";
  netstat.stdout.on("data", (chunk) => (out += chunk));
  netstat.on("error", () => {});
  netstat.on("close", () => {
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      if (!line.includes("LISTENING")) continue;
      if (!ports.some((port) => line.includes(`:${port}`))) continue;
      const match = line.match(/(\d+)\s*$/);
      if (match) pids.add(match[1]);
    }
    for (const pid of pids) killTree(pid);
  });
};

const cli = fileURLToPath(new URL("../node_modules/@playwright/test/cli.js", import.meta.url));

const child = spawn(process.execPath, [cli, "test", "--grep-invert", "@visual"], {
  stdio: "inherit",
  windowsHide: true,
  detached: process.platform !== "win32",
});

child.on("error", (error) => {
  console.error(`[watchdog] could not start Playwright: ${error.message}`);
  process.exit(1);
});

let timedOut = false;

const watchdog = setTimeout(() => {
  timedOut = true;
  console.error(`\n[watchdog] E2E run exceeded ${CAP_MINUTES} minutes - force killing the process tree.`);
  killTree(child.pid);
  killPortOwners();
}, CAP_MINUTES * 60_000);
watchdog.unref();

child.on("exit", (code) => {
  clearTimeout(watchdog);
  if (timedOut) {
    // Give taskkill a moment, then fail regardless of what survived.
    killPortOwners();
    setTimeout(() => process.exit(1), 3000).unref();
  } else {
    process.exit(code ?? 1);
  }
});