// Fills the prerendered pages' <body> with the HTML React actually renders.
//
//   npm run snapshot        (runs automatically after prerender, in postbuild)
//
// ─────────────────────────────────────────────────────────────────────────────
// What this is for
// ─────────────────────────────────────────────────────────────────────────────
// prerender.mjs gives every route its own <head> — title, description, canonical,
// Open Graph. That is enough for the social crawlers, which only ever read the
// head, and enough for Google, which executes JavaScript before indexing.
//
// It is not enough for anything else. The <body> those files ship is still
//
//     <div id="root"></div>
//
// and the clients that matter most for the "why doesn't the AI know about us"
// question do not run a line of JavaScript:
//
//   GPTBot, OAI-SearchBot, ChatGPT-User   (OpenAI)
//   ClaudeBot, Claude-SearchBot           (Anthropic)
//   PerplexityBot                         (Perplexity)
//   Bingbot                               (renders, but far less reliably, and
//                                          Bing's index is what several AI
//                                          assistants search through)
//
// Every one of them was being handed a document containing an empty div. Not a
// thin page — a page with no text in it at all. No amount of meta-tag or
// schema work changes that, because there is nothing for the schema to be
// about. This script is the fix: it loads each route in a real browser, waits
// for the page to finish rendering, and writes the resulting HTML into the file
// the crawler is served.
//
// ─────────────────────────────────────────────────────────────────────────────
// Two things that make the snapshot honest
// ─────────────────────────────────────────────────────────────────────────────
// This is a static snapshot, not a cloak. The markup written here is the same
// markup a visitor's browser builds from the same URL, which is the line
// between "prerendering" and the kind of serve-different-content-to-crawlers
// trick that earns a manual action. Two settings keep it on the right side:
//
//   reducedMotion: "reduce" — the app's own reduced-motion path. Reveal renders
//   with `initial={false}` and no variants for these readers (see
//   components/motionPrimitives.jsx), so the snapshot contains no elements
//   frozen at opacity: 0 by an animation that never got its scroll trigger.
//   Text that is in the HTML but invisible is exactly what a crawler is
//   entitled to be suspicious of, and this avoids producing any.
//
//   A full scroll pass before the snapshot, because DeferUntilVisible and the
//   lazy() sections below the fold do not mount until they are approached. A
//   snapshot taken at scroll position 0 would contain the hero and nothing
//   else, which understates the page rather than overstating it — but it is
//   still the wrong document.
//
// ponytail: the client still calls createRoot().render(), which discards this
// markup and re-renders on mount rather than hydrating it. That is deliberate —
// hydrateRoot against a snapshot of client-rendered output mismatches on
// anything time- or API-dependent, and a hydration mismatch is a real bug for
// every visitor, traded for nothing a crawler can see. The cost is one frame of
// re-render on a page that previously showed nothing at all until JS booted.
// Revisit only if the flash becomes visible in the field.

import {spawn} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {collectRoutes} from "./routes.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const PORT = Number(process.env.SNAPSHOT_PORT || 5181);
const ORIGIN = `http://127.0.0.1:${PORT}`;

// Four at a time. The pages each boot a React app and pull images from
// ImageKit, so this is bounded by network and CPU rather than by anything the
// browser limits — past four the per-page timeouts start firing on a laptop and
// the run gets slower, not faster.
const CONCURRENCY = Number(process.env.SNAPSHOT_CONCURRENCY || 4);

// Playwright is a devDependency and its browsers are a separate download
// (`npx playwright install chromium`). A deploy environment that has neither
// must still produce a working build: the head-only files prerender.mjs already
// wrote are correct, just thinner. So every failure below this point warns and
// leaves them alone rather than failing the build.
const bail = (reason) => {
  console.warn(`snapshot: skipped — ${reason}`);
  console.warn("snapshot: head-only prerender stands; run `npx playwright install chromium` to enable body snapshots.");
  process.exit(0);
};

let chromium;
try {
  ({chromium} = await import("playwright"));
} catch {
  try {
    ({chromium} = await import("@playwright/test"));
  } catch {
    bail("playwright is not installed");
  }
}

if (!fs.existsSync(path.join(DIST, "index.html"))) {
  bail("dist/index.html is missing — run the build first");
}

// ── The static server ────────────────────────────────────────────────────────

// scripts/serve-dist.cjs already resolves <route>/index.html the way Vercel
// does, which is exactly the resolution these snapshots have to be taken
// through — loading the SPA fallback instead would snapshot the right body under
// the wrong head.
function startServer() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(ROOT, "scripts", "serve-dist.cjs")], {
      env: {...process.env, PORT: String(PORT)},
      stdio: ["ignore", "pipe", "pipe"],
    });

    const timer = setTimeout(() => reject(new Error("static server did not start in 15s")), 15000);

    child.stdout.on("data", (chunk) => {
      if (String(chunk).includes("Static preview running")) {
        clearTimeout(timer);
        resolve(child);
      }
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`static server exited with code ${code}`));
    });
  });
}

// ── One page ─────────────────────────────────────────────────────────────────

// Pulls the whole document through the viewport so IntersectionObserver-gated
// sections mount, then returns to the top. Stepped rather than one jump to the
// bottom: an observer with a `once` trigger fires on intersection, and a single
// scrollTo(bottom) skips straight past most of the page without ever
// intersecting the middle of it.
async function scrollThrough(page) {
  // The callback below is serialised and executed inside the browser, not here,
  // so `window` and `document` are the page's — declared for eslint, which
  // lints this file as a node script and is right to flag them otherwise.
  /* global window, document */
  await page.evaluate(async () => {
    // The site ships `html { scroll-behavior: smooth }`. Under smooth behaviour
    // each scrollTo starts an animation the next step retargets, and the final
    // jump to the bottom lands WITHOUT crossing the middle of the page — so
    // IntersectionObserver-gated sections in the middle never intersect, never
    // mount, and the snapshot captures their placeholders. Instant steps put
    // the viewport actually on every band, long enough for observers to fire.
    const previousBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";

    const step = Math.round(window.innerHeight * 0.7);
    const wait = () =>
      new Promise((done) => {
        setTimeout(done, 160);
      });

    try {
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo({top: y, behavior: "instant"});
        await wait();
      }

      window.scrollTo({top: document.body.scrollHeight, behavior: "instant"});
      await wait();
      window.scrollTo({top: 0, behavior: "instant"});
      // Give any lazily-fetched section chunks a beat to resolve before the
      // capture — the networkidle wait below usually covers this too.
      await new Promise((done) => {
        setTimeout(done, 500);
      });
    } finally {
      document.documentElement.style.scrollBehavior = previousBehavior;
    }
  });
}

async function snapshot(context, route) {
  const page = await context.newPage();

  try {
    await page.goto(`${ORIGIN}${route.loc}`, {waitUntil: "domcontentloaded", timeout: 45000});
    // React has taken over from the prerendered markup. The static HTML now
    // satisfies any "#root > *" check the instant it parses — main.jsx boots
    // the app after the first paint, so the document is never empty — so the
    // marker it sets on #root at boot is what actually proves handover. Before
    // that marker, DeferUntilVisible and lazy() sections do not exist yet, and
    // a scroll pass taken now would capture placeholders, not sections.
    await page.waitForFunction(
      () => document.querySelector("#root[data-app-mounted]"),
      {timeout: 30000},
    );

    await scrollThrough(page);

    // A DeferUntilVisible wrapper ships as an empty div carrying only its
    // min-height until its observer fires. Under load (four pages capturing
    // concurrently) a section can sit between two scroll steps and never
    // intersect. Walk every still-empty wrapper, put it centre-viewport, and
    // give its chunk a beat to resolve — bounded, so a genuinely empty section
    // (an admin untick) cannot hang the capture.
    await page.evaluate(async () => {
      const wait = (ms) =>
        new Promise((done) => {
          setTimeout(done, ms);
        });
      const emptyGated = () =>
        [...document.querySelectorAll('#root div[style*="min-height"]')].filter(
          (el) => el.style.minHeight !== "0px" && el.children.length === 0,
        );

      document.documentElement.style.scrollBehavior = "auto";
      try {
        for (let round = 0; round < 3; round += 1) {
          const pending = emptyGated();
          if (!pending.length) break;
          for (const el of pending) {
            el.scrollIntoView({block: "center", behavior: "instant"});
            await wait(350);
          }
        }
        window.scrollTo({top: 0, behavior: "instant"});
        await wait(400);
      } finally {
        document.documentElement.style.scrollBehavior = "";
      }
    });

    // Best-effort. A page with a canvas animation or an open API poll may never
    // reach networkidle, and waiting the full timeout for one that will not is
    // dead time — the content is already rendered by the time this is reached.
    await page.waitForLoadState("networkidle", {timeout: 8000}).catch(() => {});

    const body = await page.$eval("#root", (el) => el.innerHTML);
    // A page that rendered an error boundary or an empty shell is not worth
    // writing over the file that is at least correct in its head.
    if (!body || body.length < 500) throw new Error(`rendered body too small (${body.length} bytes)`);

    // The JSON-LD too, and for the same reason as the body: useJsonLd() appends
    // these <script> blocks to document.head after React mounts, so a crawler
    // that does not run JS was seeing none of them. That is the Course block on
    // every program page, the FAQPage on the home page, the ItemList on
    // /programs and the breadcrumbs — i.e. every machine-readable fact the site
    // publishes about itself was reaching Google and nothing else.
    const jsonLd = await page.$$eval('script[type="application/ld+json"]', (nodes) =>
      nodes.map((node) => node.outerHTML).join("\n    "),
    );

    return {body, jsonLd};
  } finally {
    await page.close();
  }
}

// ── Writing it back ──────────────────────────────────────────────────────────

const targetFor = (loc) =>
  loc === "/" ? path.join(DIST, "index.html") : path.join(DIST, loc, "index.html");

// Fills the root div in the file prerender.mjs wrote and adds the JSON-LD
// ahead of </head>, leaving every tag that script composed exactly as it is.
//
// Anchored on the root div specifically: a file that already carries a
// body (a re-run without a rebuild in between) is left alone rather than having
// a second copy nested inside the first — and because both writes are gated on
// that one check, the schema cannot be appended twice either.
function inject(html, {body, jsonLd}) {
  // An empty #root, however its emptiness is written: bare, or holding nothing
  // but whitespace and comments. The second form matters — a comment left
  // inside the div (as a note about the poster that used to live there) made
  // both patterns below miss and every route shipped an empty document, the
  // largest FCP/LCP regression this page has had. Matching "nothing but
  // comments and space" keeps the guard against double-injection while making
  // the template's internal notes irrelevant.
  const root =
    /<div id="root"><\/div>/.exec(html) ||
    /<div id="root">\s*(?:<!--[\s\S]*?-->\s*)*<\/div>/.exec(html);
  if (!root) return null;

  let out = html.replace(root[0], `<div id="root">${body}</div>`);
  if (jsonLd) out = out.replace("</head>", `    ${jsonLd}\n  </head>`);

  return out;
}

// ── Run ──────────────────────────────────────────────────────────────────────

const routes = collectRoutes();
let server;
let browser;
let written = 0;
const failed = [];

try {
  server = await startServer();
} catch (error) {
  bail(error.message);
}

try {
  browser = await chromium.launch();
} catch (error) {
  server.kill();
  bail(`chromium failed to launch (${error.message.split("\n")[0]})`);
}

const context = await browser.newContext({
  viewport: {width: 1440, height: 1200},
  // See the note at the top: this is what keeps opacity-0 reveal states out of
  // the snapshot, by taking the app's own reduced-motion path.
  reducedMotion: "reduce",
  userAgent:
    "Mozilla/5.0 (compatible; CareerVedaPrerender/1.0; +https://careerveda.in/)",
});

// This script renders every route in a real browser, which means index.html's
// GA4 tag loads and RouteMeta reports a page_view — once per route, every build,
// from localhost. Left alone that is a few dozen fake sessions in the property
// each deploy, indistinguishable from real visitors in the reports. Blocking the
// tag at the network layer is enough: the inline gtag() stub still queues into
// dataLayer, but with googletagmanager.com unreachable nothing is ever sent.
await context.route("**://*.googletagmanager.com/**", (route) => route.abort());

const queue = [...routes];

async function worker() {
  while (queue.length) {
    const route = queue.shift();
    const target = targetFor(route.loc);

    try {
      // No existsSync first. Between the check and the read the file can be
      // gone, and the read is already inside this try — so the check bought a
      // nicer message in exchange for a race and a second stat. readFileSync's
      // own ENOENT says the same thing.
      const rendered = await snapshot(context, route);
      const html = inject(fs.readFileSync(target, "utf8"), rendered);

      if (!html) throw new Error("root div not found or already filled");

      fs.writeFileSync(target, html, "utf8");
      written += 1;
    } catch (error) {
      failed.push(`${route.loc} — ${error.message.split("\n")[0]}`);
    }
  }
}

await Promise.all(Array.from({length: CONCURRENCY}, worker));

await context.close();
await browser.close();
server.kill();

console.log(`snapshot: ${written}/${routes.length} routes filled with rendered HTML`);

if (failed.length) {
  console.warn(`snapshot: ${failed.length} route(s) kept their head-only file:`);
  for (const line of failed) console.warn(`  ${line}`);
}

// Deliberately not a build failure. Every route that failed still has the
// correct head prerender.mjs wrote, which is what the site shipped before this
// script existed — a partial snapshot is strictly better than no build.
