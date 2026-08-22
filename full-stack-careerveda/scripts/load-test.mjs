
import {spawn} from "node:child_process";
import {fileURLToPath} from "node:url";

const API_PORT = Number(process.env.E2E_API_PORT || 8081);
const DURATION = Number(process.env.LOAD_SECONDS || 20);
const CONCURRENCY = Number(process.env.LOAD_CONCURRENCY || 25);
const P95_BUDGET_MS = Number(process.env.LOAD_P95_BUDGET_MS || 500);
const MAX_ERROR_RATE = Number(process.env.LOAD_MAX_ERROR_RATE || 0.02);

const BASE = `http://127.0.0.1:${API_PORT}`;
const ENDPOINTS = [
  `${BASE}/health`,
  `${BASE}/api/v1/public/programs?limit=100`,
  `${BASE}/api/v1/public/jobs?limit=100`,
];

const system32 = process.env.SystemRoot ? `${process.env.SystemRoot}\\System32` : "C:\\Windows\\System32";
const taskkillBin = process.platform === "win32" ? `${system32}\\taskkill.exe` : "taskkill";

const killTree = (pid) => {
  if (process.platform === "win32") {
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

const server = spawn(
  process.execPath,
  [fileURLToPath(new URL("../backend/scripts/e2e-server.js", import.meta.url))],
  {
    env: {...process.env, E2E_API_PORT: String(API_PORT)},
    stdio: "ignore",
    windowsHide: true,
    detached: process.platform !== "win32",
  },
);

const waitForHealth = async () => {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE}/health`, {signal: AbortSignal.timeout(2000)});
      if (response.ok) return;
    } catch {
      // Not up yet.
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
  }
  throw new Error(`E2E API on :${API_PORT} did not become healthy within 120s`);
};

const latencies = [];
let ok = 0;
let failures = 0;

const worker = async (deadline) => {
  while (Date.now() < deadline) {
    const endpoint = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];
    const started = performance.now();
    try {
      const response = await fetch(endpoint, {signal: AbortSignal.timeout(10_000)});
      latencies.push(performance.now() - started);
      if (response.ok) ok += 1;
      else failures += 1;
    } catch {
      failures += 1;
    }
  }
};

const percentile = (sorted, p) => {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
};

try {
  await waitForHealth();

  const deadline = Date.now() + DURATION * 1000;
  await Promise.all(Array.from({length: CONCURRENCY}, () => worker(deadline)));

  const sorted = [...latencies].sort((a, b) => a - b);
  const total = ok + failures;
  const errorRate = total === 0 ? 1 : failures / total;
  const p50 = percentile(sorted, 50);
  const p95 = percentile(sorted, 95);
  const p99 = percentile(sorted, 99);

  console.log("Load test result");
  console.log(`  duration   : ${DURATION}s, concurrency ${CONCURRENCY}`);
  console.log(`  requests   : ${total} (${(total / DURATION).toFixed(1)} rps)`);
  console.log(`  errors     : ${failures} (${(errorRate * 100).toFixed(2)}%)`);
  console.log(`  latency    : p50 ${Math.round(p50)}ms  p95 ${Math.round(p95)}ms  p99 ${Math.round(p99)}ms`);
  console.log(`  budgets    : p95 < ${P95_BUDGET_MS}ms, errors < ${(MAX_ERROR_RATE * 100).toFixed(0)}%`);

  const failed = p95 > P95_BUDGET_MS || errorRate > MAX_ERROR_RATE;
  console.log(`  result     : ${failed ? "FAILED" : "PASSED"}`);
  process.exitCode = failed ? 1 : 0;
} catch (error) {
  console.error(`Load test aborted: ${error.message}`);
  process.exitCode = 1;
} finally {
  killTree(server.pid);
}