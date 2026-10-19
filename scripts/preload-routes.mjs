// Gives every prerendered route a head start on its own code.
//
//   npm run postbuild → prerender.mjs → preload-routes.mjs → snapshot.mjs
//
// ─────────────────────────────────────────────────────────────────────────────
// The problem this solves
// ─────────────────────────────────────────────────────────────────────────────
// Every route except "/" is a lazy chunk (see src/lib/routeChunks.js). The
// browser cannot know which chunk a URL needs until the entry bundle has
// booted, matched the path against React Router and called the loader — so the
// chunk download STARTS only then. On a throttled phone that stretches the
// swap from prerendered markup to live tree by the better part of a second,
// and it is the whole reason a secondary page's LCP sat seconds behind its
// FCP: the heading ships in the HTML, vanishes when React mounts the shell,
// and comes back when the chunk lands.
//
// But the ROUTE of a prerendered file is static knowledge. This script reads
// Vite's build manifest, resolves each route to its page chunk + CSS, and
// injects
//
//     <link rel="modulepreload" href="/assets/ProgramsPage-….js">
//     <link rel="stylesheet"    href="/assets/ProgramsPage-….css">
//
// into that route's <head>. The downloads then race the app boot instead of
// following it; the chunk is in cache by the time the router asks for it.
//
// The mapping below must cover the same routes as EXACT_ROUTES /
// loaderForPath in src/lib/routeChunks.js. It is duplicated here because the
// loaders are functions of the client bundle, while this runs over built
// files — change one, change the other.

import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {collectRoutes} from "./routes.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const manifestPath = path.join(DIST, ".vite", "manifest.json");

if (!fs.existsSync(manifestPath)) {
  console.error("preload-routes: dist/.vite/manifest.json missing — is build.manifest enabled?");
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

// Lazy page component → its chunk entry in the manifest.
const pageChunks = {};
for (const [id, entry] of Object.entries(manifest)) {
  const match = /pages\/([A-Za-z]+)\.jsx$/.exec(id);
  if (match && entry.isDynamicEntry) pageChunks[match[1]] = entry;
}

// route.loc → the page component whose chunk the route needs. "/" boots with
// the entry itself and needs nothing here; catch-all "/:slug" is PolicyPage,
// mirroring the <Route path="/:slug"> in App.jsx.
const ROUTE_PAGES = {
  "/programs": "ProgramsPage",
  "/jobs": "JobsPage",
  "/achievers": "JobsPage", // redirects to /jobs — warm what it lands on
  "/faculty": "FacultyPage",
  "/blog": "BlogPage",
  "/about": "AboutPage",
  "/contact": "ContactPage",
  "/alumni": "AlumniPage",
  "/enroll": "EnrollPage",
  "/privacy-policy": "PolicyPage",
  "/refund-policy": "PolicyPage",
  "/terms": "PolicyPage",
  "/escalation-policy": "PolicyPage",
};

// Lazy chunks a route needs on screen at boot, beyond its page. The home
// page's consultation form is its own chunk (so its CSS keeps loading after the
// main stylesheet), but it renders in the first paint of a visitor who scrolled
// the prerendered page — so it must race the boot like a page chunk does, or
// the card they were looking at blanks until it lands.
const ROUTE_EXTRA_CHUNKS = {
  "/": ["src/components/ConsultationForm.jsx"],
};

const pageForRoute = (loc) => {
  if (ROUTE_PAGES[loc]) return ROUTE_PAGES[loc];
  if (/^\/programs\/[^/]+\/?$/.test(loc)) return "ProgramDetailPage";
  if (/^\/blog\/[^/]+\/?$/.test(loc)) return "BlogDetailPage";
  if (/^\/[^/]+\/?$/.test(loc)) return "PolicyPage";
  return null;
};

// Collects a chunk's own file plus its css, and recurses into shared chunks
// (a page importing PageShell pulls PageShell's css through its imports).
function assetsFor(entry, seen = new Set()) {
  if (!entry || seen.has(entry.file)) return {files: [], css: []};
  seen.add(entry.file);
  const files = [entry.file];
  const css = [...(entry.css ?? [])];
  for (const importKey of entry.imports ?? []) {
    const nested = assetsFor(manifest[importKey], seen);
    files.push(...nested.files);
    css.push(...nested.css);
  }
  return {files, css};
}

const routes = collectRoutes();
let injected = 0;

for (const route of routes) {
  const page = pageForRoute(route.loc);
  const entries = [
    page && pageChunks[page],
    ...(ROUTE_EXTRA_CHUNKS[route.loc] ?? []).map((id) => manifest[id]),
  ].filter(Boolean);
  if (entries.length === 0) continue;

  const target =
    route.loc === "/" ? path.join(DIST, "index.html") : path.join(DIST, route.loc, "index.html");
  if (!fs.existsSync(target)) continue;

  let html = fs.readFileSync(target, "utf8");
  // Idempotent: a re-run without a rebuild must not stack a second set.
  if (html.includes("data-route-preload")) continue;

  const seen = new Set();
  const files = [];
  const css = [];
  for (const entry of entries) {
    const assets = assetsFor(entry, seen);
    files.push(...assets.files);
    css.push(...assets.css);
  }
  // Manifest "file"/"css" paths are relative to dist/ and already begin with
  // assets/ — do not prepend another segment.
  const tags = [
    ...files.map(
      (file) => `    <link rel="modulepreload" data-route-preload crossorigin href="/${file}" />`,
    ),
    ...[...new Set(css)].map(
      (file) => `    <link rel="stylesheet" data-route-preload crossorigin href="/${file}" />`,
    ),
  ].join("\n");

  if (!tags) continue;
  html = html.replace("</head>", `${tags}\n  </head>`);
  fs.writeFileSync(target, html, "utf8");
  injected += 1;
}

console.log(`preload-routes: ${injected} routes carry their own chunk preloads`);
