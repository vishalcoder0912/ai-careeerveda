// Audits the built HTML in dist/ — the bytes a crawler is actually served.
//
//   npm run seo:audit          (after a build; `npm run build` already runs
//                               prerender + snapshot into dist/)
//
// ─────────────────────────────────────────────────────────────────────────────
// Why this reads dist/ and not src/
// ─────────────────────────────────────────────────────────────────────────────
// Every other check in this repo runs against source. This one cannot: the
// question it answers is "what does a client that never executes JavaScript
// see", and the answer is produced by three separate steps — vite build, then
// prerender.mjs for the <head>, then snapshot.mjs for the <body> and the
// JSON-LD. Any one of them can silently no-op. snapshot.mjs in particular is
// designed to warn and continue when Playwright is missing, which is correct
// for shipping a build and invisible unless something looks at the output.
//
// So this looks at the output. It is the difference between "the SEO code is
// written" and "the SEO is in the file", and the site has already been on the
// wrong side of that once: seoTags.js and structuredData.js were both complete
// and neither was wired to a single route.
//
// ─────────────────────────────────────────────────────────────────────────────
// Errors vs warnings
// ─────────────────────────────────────────────────────────────────────────────
// Errors are things that are broken: no title, no description, no canonical, no
// H1, an unparseable JSON-LD block, a body with no text in it. These exit 1.
//
// Warnings are judgement calls where the repo has already made a deliberate
// choice, and this must not overrule it. The long blog titles are the example:
// composeTitle() in src/config/pageMeta.js intentionally drops the " |
// CareerVeda" suffix rather than truncating a headline, and the comment there
// explains why at length. Reporting those as failures would mean the honest fix
// is to edit the counter, not the code.

// ─────────────────────────────────────────────────────────────────────────────
// Why jsdom rather than regexes
// ─────────────────────────────────────────────────────────────────────────────
// The first version of this file pulled the title, canonical, headings and body
// text out with regular expressions, and every one of them was wrong in a way
// that only showed up against real output: og:image is wrapped across two lines
// in index.html, so a pattern with a literal space in it silently matched
// nothing and reported all 60 pages as missing an image. CodeQL then flagged the
// tag-stripping for the same underlying reason from the security angle — a
// regex cannot reliably tell you what is and is not markup, so `<SCRIPT>` and
// nested constructs slip through whatever pattern you write next.
//
// Both problems are the same problem, and neither is fixed by a better regex.
// jsdom is already a devDependency (vitest uses it as its test environment), so
// the parser is sitting right here: `document.querySelector` cannot be defeated
// by a line break or a capital letter, and removing script/style nodes before
// reading textContent is exact rather than approximate.
//
// It parses markup only — `runScripts` is left off, so nothing in the page
// executes.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {JSDOM} from "jsdom";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");

// Google renders ~60 characters of title and ~160 of description. Below ~70 a
// description is usually discarded in favour of a snippet lifted from the body.
const TITLE_MAX = 60;
const DESC_MIN = 70;
const DESC_MAX = 160;
// Under this the snapshot almost certainly did not capture the rendered page —
// a real route on this site is several hundred words.
const MIN_WORDS = 150;

if (!fs.existsSync(path.join(DIST, "index.html"))) {
  console.error("seo-audit: dist/index.html is missing — run the build first.");
  process.exit(1);
}

// Asset directories hold no HTML worth auditing, and walking them is the slow
// part of this script.
const SKIP_DIRS = new Set(["assets", "fonts", "images"]);

function findPages(dir, out = []) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) findPages(full, out);
    } else if (entry.name === "index.html") {
      out.push(full);
    }
  }
  return out;
}

function inspect(file) {
  const html = fs.readFileSync(file, "utf8");
  const rel = path.relative(DIST, path.dirname(file)).split(path.sep).join("/");
  const {document, NodeFilter} = new JSDOM(html).window;

  // getAttribute, not the `.href`/`.content` properties: jsdom resolves those
  // against the document URL, which would turn a missing canonical into a
  // file:// path that reads as present.
  const attr = (selector, name) =>
    document.querySelector(selector)?.getAttribute(name)?.trim() || "";

  const schemas = [];
  for (const node of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      for (const entry of [].concat(JSON.parse(node.textContent))) schemas.push(entry["@type"]);
    } catch {
      schemas.push("INVALID");
    }
  }

  // The rendered app, not the whole document — a heading or an image in the
  // static shell is not something snapshot.mjs produced.
  const root = document.getElementById("root");

  // textContent includes the contents of <script> and <style>, so those nodes
  // come out first. This is a throwaway parse; removing them affects nothing on
  // disk.
  for (const node of root?.querySelectorAll("script, style") || []) node.remove();

  // Joining the text nodes rather than reading root.textContent, because
  // textContent concatenates with no separator: "<span>Contact</span><span>us
  // </span>" becomes "Contactus", one word instead of two. On /contact — a page
  // built almost entirely from short inline elements — that undercounted by a
  // third and tripped the floor check below. Joining on a space is what the
  // boundary between two elements actually reads as.
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const parts = [];
  while (walker.nextNode()) parts.push(walker.currentNode.nodeValue);
  const text = parts.join(" ").replace(/\s+/g, " ").trim();

  const images = [...(root?.querySelectorAll("img") || [])];

  return {
    route: `/${rel}`,
    title: document.querySelector("title")?.textContent.trim() || "",
    description: attr('meta[name="description"]', "content"),
    canonical: attr('link[rel="canonical"]', "href"),
    ogImage: attr('meta[property="og:image"]', "content"),
    schemas,
    words: text ? text.split(" ").length : 0,
    headings: root?.querySelectorAll("h1").length || 0,
    imagesWithoutAlt: images.filter((img) => !img.hasAttribute("alt")).length,
  };
}

const pages = findPages(DIST).map(inspect).sort((a, b) => a.route.localeCompare(b.route));

const errors = [];
const warnings = [];

for (const page of pages) {
  const at = page.route;

  if (!page.title) errors.push(`${at}: no <title>`);
  if (!page.description) errors.push(`${at}: no meta description`);
  if (!page.canonical) errors.push(`${at}: no canonical`);
  if (!page.ogImage) errors.push(`${at}: no og:image`);
  if (page.headings === 0) errors.push(`${at}: no <h1>`);
  if (page.headings > 1) errors.push(`${at}: ${page.headings} <h1> elements`);
  if (page.schemas.includes("INVALID")) errors.push(`${at}: JSON-LD does not parse`);
  if (!page.schemas.length) errors.push(`${at}: no JSON-LD`);
  if (page.words < MIN_WORDS) {
    errors.push(`${at}: only ${page.words} words of text — snapshot likely did not run`);
  }

  // Every route except the home page should carry a breadcrumb trail; a
  // single-item trail for "/" says nothing and Google ignores it.
  if (at !== "/" && !page.schemas.includes("BreadcrumbList")) {
    warnings.push(`${at}: no BreadcrumbList`);
  }
  if (page.title.length > TITLE_MAX) {
    warnings.push(`${at}: title ${page.title.length} chars (>${TITLE_MAX}, will be truncated)`);
  }
  if (page.description.length > DESC_MAX) {
    warnings.push(`${at}: description ${page.description.length} chars (>${DESC_MAX})`);
  } else if (page.description && page.description.length < DESC_MIN) {
    warnings.push(`${at}: description ${page.description.length} chars (<${DESC_MIN}, Google will rewrite it)`);
  }
  if (page.imagesWithoutAlt) {
    warnings.push(`${at}: ${page.imagesWithoutAlt} <img> without alt`);
  }
}

// A canonical naming a host the server redirects away from points Google at a
// URL that does not answer, so every page agreeing is not enough — they have to
// agree on the host that is actually served.
const hosts = [...new Set(pages.map((p) => (p.canonical.match(/^https?:\/\/[^/]+/) || ["(none)"])[0]))];
if (hosts.length > 1) errors.push(`canonicals name more than one host: ${hosts.join(", ")}`);

console.log(`seo-audit: ${pages.length} pages in dist/`);
console.log(`  canonical host: ${hosts.join(", ")}`);
console.log(`  with JSON-LD:   ${pages.filter((p) => p.schemas.length).length}/${pages.length}`);
console.log(`  with breadcrumb: ${pages.filter((p) => p.schemas.includes("BreadcrumbList")).length}/${pages.length}`);

if (warnings.length) {
  console.log(`\nwarnings (${warnings.length}):`);
  for (const line of warnings) console.log(`  ${line}`);
}

if (errors.length) {
  console.error(`\nerrors (${errors.length}):`);
  for (const line of errors) console.error(`  ${line}`);
  process.exit(1);
}

console.log("\nno errors.");
