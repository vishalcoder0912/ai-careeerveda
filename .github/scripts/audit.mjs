#!/usr/bin/env node
//
// The dependency gate: fails when a high or critical advisory affects the
// production dependencies of any workspace.
//
// This exists instead of a bare `npm audit` because npm has no way to say "this
// one, for this reason, until this date". Without that the only options when an
// advisory has no fix are to leave the build red — which teaches everyone to
// ignore a red X — or to drop --audit-level, which switches the gate off
// entirely. Both are worse than a written-down exception.
//
// Run it exactly as CI does:  node .github/scripts/audit.mjs

import {execSync} from "node:child_process";

const WORKSPACES = [".", "backend", "admin"];
const BLOCKING = new Set(["high", "critical"]);

// Advisories that do not gate the build, each with the reason it does not and a
// date the reason must be re-argued. An entry past its date fails the build:
// that is the point — an exception nobody revisits is just a hole with a comment
// next to it.
const ALLOWED = [
  {
    id: "GHSA-qwww-vcr4-c8h2",
    package: "react-router",
    until: "2026-10-01",
    reason:
      "RSC-mode CSRF bypass: a server Action can run before the 400 response. " +
      "Both apps are client-only Vite SPAs on BrowserRouter/Routes — no " +
      "RouterProvider, no data-mode loaders or actions, no server entry, so the " +
      "vulnerable path is not built into either bundle. " +
      "A patched release now exists — 8.3.0 — but taking it is not a version " +
      "bump. v8 deletes the react-router-dom package outright (31 files import " +
      "from it), and requires Vite 7 and Node >=22.22.0 while both apps are on " +
      "Vite ^6.0.7. That is two major migrations to close a hole neither app " +
      "has. Deferred deliberately, not overlooked. Do it on the next Vite major, " +
      "or immediately if either app adopts RSC or framework mode.",
  },
];

const today = new Date().toISOString().slice(0, 10);

// `npm audit` exits non-zero when it finds something, which is the whole point,
// so a non-zero exit is a normal outcome here rather than a failure to run.
const auditJson = (directory) => {
  try {
    // One fixed command string rather than execFileSync: on Windows npm is a
    // .cmd shim, which Node 20+ refuses to spawn directly (EINVAL), and passing
    // an args array with shell:true trips a deprecation warning. Every argument
    // here is a literal, so there is nothing for a shell to interpolate.
    return execSync("npm audit --omit=dev --json", {
      cwd: directory,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (error) {
    if (error.stdout) return error.stdout;
    throw error;
  }
};

// npm nests the real advisory records inside `via`, and a package can appear
// only because something it depends on is vulnerable — those entries are
// strings, not objects, and would otherwise be counted as findings of their own.
const findings = (report) =>
  Object.values(report.vulnerabilities || {}).flatMap((entry) =>
    (entry.via || [])
      .filter((via) => typeof via === "object" && BLOCKING.has(via.severity))
      .map((via) => ({
        id: (via.url || "").split("/").pop(),
        package: via.name,
        title: via.title,
        severity: via.severity,
        url: via.url,
      })),
  );

let blocking = 0;
const waived = new Set();

for (const directory of WORKSPACES) {
  const report = JSON.parse(auditJson(directory));
  const seen = new Map();

  for (const finding of findings(report)) {
    if (!seen.has(finding.id)) seen.set(finding.id, finding);
  }

  console.log(`\n── ${directory} ${"─".repeat(Math.max(0, 60 - directory.length))}`);

  if (seen.size === 0) {
    console.log("   no high or critical advisories");
    continue;
  }

  for (const finding of seen.values()) {
    const exception = ALLOWED.find((entry) => entry.id === finding.id);

    if (exception && exception.until >= today) {
      waived.add(finding.id);
      console.log(`   WAIVED   ${finding.package}  ${finding.id}  (review by ${exception.until})`);
      continue;
    }

    if (exception) {
      blocking += 1;
      console.log(
        `   EXPIRED  ${finding.package}  ${finding.id}  — the exception lapsed on ${exception.until}.`,
      );
      console.log("            Re-check whether it is fixed or still inapplicable, then move the date.");
      continue;
    }

    blocking += 1;
    console.log(`   BLOCKING ${finding.package}  ${finding.severity}  ${finding.title}`);
    console.log(`            ${finding.url}`);
  }
}

// An allowlist entry for something that no longer shows up is stale. Not a
// build failure — it means the problem went away — but it should not linger.
for (const entry of ALLOWED) {
  if (!waived.has(entry.id) && entry.until >= today) {
    console.log(`\n   STALE    ${entry.id} is allowlisted but no longer reported — delete the entry.`);
  }
}

console.log("");

if (blocking > 0) {
  console.log(`${blocking} advisory/advisories must be fixed before this can ship.`);
  process.exit(1);
}

console.log("Dependency audit passed.");
