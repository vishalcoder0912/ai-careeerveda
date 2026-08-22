// Writes one real HTML file per route into dist/, each carrying its own <head>.
//
//   npm run prerender      (runs automatically after every build)
//
// ─────────────────────────────────────────────────────────────────────────────
// The problem this solves
// ─────────────────────────────────────────────────────────────────────────────
// The site is client-rendered and vercel.json rewrites every non-/api path to
// /index.html. So before this existed, a crawler asking for
// /programs/product-management was handed index.html verbatim — which says
//
//     <title>CareerVeda</title>
//     <link rel="canonical" href="https://www.careerveda.in/" />
//
// Every URL on the site claimed, in raw HTML, to be the home page. Two distinct
// consequences, and the second is the expensive one:
//
//   1. Social crawlers — Facebook, LinkedIn, WhatsApp, X — never execute JS.
//      They read that head and stop. Every program and every article shared
//      anywhere rendered the home page's title, description and image.
//
//   2. `canonical` is not a hint, it is an instruction: "the real address of
//      this document is <href>". Google runs JS and eventually sees the tag
//      seoTags.js rewrites, but until it does, ~70 URLs are all telling it they
//      are duplicates of one page. Bing and DuckDuckGo render JS far less
//      reliably and may never get past it.
//
// Writing the file at the path the crawler asks for fixes both, because Vercel
// checks the filesystem before applying a rewrite — the same mechanism that
// makes public/robots.txt work today.
//
// This script writes the <head> only; the <body> it emits is still the empty
// #root div. scripts/snapshot.mjs runs immediately after it and fills that div
// with the HTML React renders, which is what makes the pages readable to the
// crawlers that do not execute JavaScript — Bing and every LLM crawler. The two
// are separate because the head is cheap, deterministic and always correct,
// while the snapshot needs a browser that may not exist in a given deploy
// environment; when it doesn't, the output of this script is what ships.

import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {collectRoutes} from "./routes.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const {SITE_URL, OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT} = await import(
  new URL(`file:///${path.join(ROOT, "src/config/siteMeta.js").replace(/\\/g, "/")}`).href
);

const template = fs.readFileSync(path.join(DIST, "index.html"), "utf8");

// Attribute values, so quotes and angle brackets have to go. A program title
// with an apostrophe or an ampersand in it would otherwise close the attribute
// early and produce a head that parses as something else entirely.
const escape = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Replaces the content of a tag that index.html already ships, rather than
// appending a second one. Two canonicals or two og:titles is not "the last one
// wins" — Google treats a page with conflicting canonicals as having none.
function replaceMeta(html, attr, key, content) {
  const pattern = new RegExp(`(<meta\\s+[^>]*${attr}=["']${key}["'][^>]*content=["'])[^"']*(["'])`, "i");
  if (pattern.test(html)) return html.replace(pattern, `$1${escape(content)}$2`);

  // index.html does not carry this tag yet (og:image:width and friends may not
  // survive a template edit), so add it inside <head> rather than dropping it.
  return html.replace("</head>", `    <meta ${attr}="${key}" content="${escape(content)}" />\n  </head>`);
}

function render(route) {
  const url = route.loc === "/" ? SITE_URL : `${SITE_URL}${route.loc}`;
  let html = template;

  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escape(route.title)}</title>`);
  html = html.replace(
    /(<link\s+rel=["']canonical["']\s+href=["'])[^"']*(["'])/i,
    `$1${escape(url)}$2`,
  );

  html = replaceMeta(html, "name", "description", route.description);

  html = replaceMeta(html, "property", "og:title", route.title);
  html = replaceMeta(html, "property", "og:description", route.description);
  html = replaceMeta(html, "property", "og:url", url);
  html = replaceMeta(html, "property", "og:type", route.type);
  html = replaceMeta(html, "property", "og:image", route.image);
  html = replaceMeta(html, "property", "og:image:width", OG_IMAGE_WIDTH);
  html = replaceMeta(html, "property", "og:image:height", OG_IMAGE_HEIGHT);

  html = replaceMeta(html, "name", "twitter:title", route.title);
  html = replaceMeta(html, "name", "twitter:description", route.description);
  html = replaceMeta(html, "name", "twitter:image", route.image);

  return html;
}

const routes = collectRoutes();
let written = 0;

for (const route of routes) {
  // "/" is dist/index.html itself; everything else becomes <route>/index.html.
  // The directory form rather than "<route>.html" because it is what both
  // Vercel and any plain static server resolve for a trailing-slash-less URL,
  // and because /programs and /programs/product-management can then coexist —
  // a file named programs.html and a directory named programs cannot.
  const target =
    route.loc === "/"
      ? path.join(DIST, "index.html")
      : path.join(DIST, route.loc, "index.html");

  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.writeFileSync(target, render(route), "utf8");
  written += 1;
}

console.log(`prerender: ${written} routes -> dist/`);

// A prerendered head is only worth anything if it names the real host. This is
// the same guard the sitemap carries, for the same reason.
if (!SITE_URL || !SITE_URL.startsWith("http")) {
  console.error("  SITE_URL is not set in src/config/siteMeta.js — every canonical will be wrong.");
  process.exitCode = 1;
}
