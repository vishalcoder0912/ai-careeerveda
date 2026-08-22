// Writes public/sitemap.xml from the site's own route table and content.
//
//   npm run sitemap        (also runs automatically before every build)
//
// Generated rather than hand-maintained: a sitemap that lists a program which
// no longer exists, or omits one that does, is worse than none — it teaches the
// crawler that the file is unreliable. Deriving it from the same data the router
// and the pages read means it cannot drift.
//
// The route list itself now lives in scripts/routes.mjs, shared with
// prerender.mjs, so the URLs listed here and the URLs actually built are the
// same set by construction.
//
// Written into public/ rather than dist/ so `vite build` copies it to the root
// alongside robots.txt. That placement matters: vercel.json rewrites every path
// except /api/ to index.html, and Vercel checks the filesystem first, so a real
// file at /sitemap.xml wins over the SPA fallback. Without it a crawler asking
// for the sitemap is handed an HTML document.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {collectRoutes, monthYearToLastmod} from "./routes.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const {SITE_URL} = await import(
  new URL(`file:///${path.join(ROOT, "src/config/siteMeta.js").replace(/\\/g, "/")}`).href
);

// The date parser is the only real logic behind this file, so it checks itself
// on every run — a silently wrong lastmod is exactly the kind of bad hint that
// makes a crawler distrust the whole document.
assert.equal(monthYearToLastmod("July 2026"), "2026-07");
assert.equal(monthYearToLastmod("December 2025"), "2025-12");
assert.equal(monthYearToLastmod("Coming soon"), undefined);
assert.equal(monthYearToLastmod(undefined), undefined);

const routes = collectRoutes();

const escape = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const body = routes
  .map(({loc, priority, changefreq, lastmod}) => {
    const url = loc === "/" ? SITE_URL : `${SITE_URL}${loc}`;
    return [
      "  <url>",
      `    <loc>${escape(url)}</loc>`,
      ...(lastmod ? [`    <lastmod>${escape(lastmod)}</lastmod>`] : []),
      `    <changefreq>${changefreq}</changefreq>`,
      `    <priority>${priority}</priority>`,
      "  </url>",
    ].join("\n");
  })
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

const target = path.join(ROOT, "public", "sitemap.xml");
fs.writeFileSync(target, xml, "utf8");

console.log(`sitemap.xml: ${routes.length} URLs -> ${path.relative(ROOT, target)}`);

// robots.txt is hand-maintained and names this sitemap by absolute URL, so it is
// the one file that can silently disagree with SITE_URL. It already did once:
// after the canonical host moved from www to the apex, every generated document
// followed and robots.txt did not, which points the first request a crawler
// makes at a redirect — and, if the host had not resolved at all, at nothing.
//
// Checked rather than generated: the rest of the file is editorial (the AI
// crawler policy), and rewriting it from a template would mean maintaining that
// prose in a string here instead of in the file people actually read.
const robotsPath = path.join(ROOT, "public", "robots.txt");
const robots = fs.readFileSync(robotsPath, "utf8");
const declared = /^\s*Sitemap:\s*(\S+)\s*$/im.exec(robots)?.[1];
const expected = `${SITE_URL}/sitemap.xml`;

if (declared !== expected) {
  console.error(`  robots.txt declares Sitemap: ${declared ?? "(none)"}`);
  console.error(`  but SITE_URL implies:       ${expected}`);
  console.error("  Update public/robots.txt so both name the same host.");
  process.exitCode = 1;
}

if (!SITE_URL || !SITE_URL.startsWith("http")) {
  console.error("  SITE_URL is not set in src/config/siteMeta.js — the sitemap will be wrong.");
  process.exitCode = 1;
}
