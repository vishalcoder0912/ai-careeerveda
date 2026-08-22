// Every public URL on the site, with the meta each one needs, in one list.
//
// Two build steps read it: generate-sitemap.mjs (which URLs exist) and
// prerender.mjs (what each URL's <head> should say). They used to be one script
// with the route table inlined; splitting the table out is what stops the
// sitemap listing a URL the prerender never wrote, or the prerender baking a
// page the sitemap never mentions. Both failures are silent — the file is fine,
// it just describes a site that is not the one deployed.
//
// The data modules are plain ESM with no Vite-only syntax, so they import
// directly under node. Keep it that way: adding a `.jsx` or an asset import to
// anything reachable from here breaks both build steps at once.

import path from "node:path";
import {fileURLToPath} from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const load = (relative) =>
  import(new URL(`file:///${path.join(ROOT, relative).replace(/\\/g, "/")}`).href);

const {OG_IMAGE} = await load("src/config/siteMeta.js");
const {pageMeta, composeTitle, programMeta, blogMeta, DEFAULT_DESCRIPTION} =
  await load("src/config/pageMeta.js");
const {programCatalog} = await load("src/data/programCatalog.js");
const {default: blogPosts} = await load("src/data/blogPosts.js");
const {publishedPolicies} = await load("src/data/policies.js");

// "July 2026" -> "2026-07". The sitemap spec accepts a W3C date truncated to
// the month, so a human "Month YYYY" maps across without inventing a day we do
// not know. Anything that does not parse gets no lastmod rather than a guess —
// a wrong date is the kind of bad hint that makes a crawler discount the file.
const MONTHS =
  "january february march april may june july august september october november december".split(" ");

export function monthYearToLastmod(value) {
  const [month, year] = String(value ?? "").trim().toLowerCase().split(/\s+/);
  const index = MONTHS.indexOf(month);
  if (index < 0 || !/^\d{4}$/.test(year ?? "")) return undefined;
  return `${year}-${String(index + 1).padStart(2, "0")}`;
}

// priority and changefreq are hints, and Google has said publicly it ignores
// both. They are kept because Bing and several smaller crawlers still read
// them, and they cost nothing.
const STATIC_ROUTES = [
  {loc: "/", priority: "1.0", changefreq: "weekly"},
  {loc: "/programs", priority: "0.9", changefreq: "weekly"},
  {loc: "/faculty", priority: "0.8", changefreq: "monthly"},
  {loc: "/alumni", priority: "0.8", changefreq: "monthly"},
  {loc: "/jobs", priority: "0.7", changefreq: "daily"},
  {loc: "/blog", priority: "0.8", changefreq: "weekly"},
  {loc: "/about", priority: "0.6", changefreq: "monthly"},
  {loc: "/contact", priority: "0.6", changefreq: "monthly"},
  {loc: "/enroll", priority: "0.7", changefreq: "monthly"},
];

// Returns [{loc, priority, changefreq, lastmod?, title, description, image, type}].
// `title` is already composed ("Our Programs | CareerVeda") because that is what
// both the <title> tag and og:title want.
export function collectRoutes() {
  const routes = [];

  for (const route of STATIC_ROUTES) {
    const meta = pageMeta[route.loc];
    routes.push({
      ...route,
      title: composeTitle(meta?.title),
      description: meta?.description || DEFAULT_DESCRIPTION,
      image: OG_IMAGE,
      type: "website",
    });
  }

  for (const program of programCatalog) {
    const meta = programMeta(program);
    routes.push({
      loc: `/programs/${program.id}`,
      priority: "0.9",
      changefreq: "monthly",
      title: composeTitle(meta.title),
      description: meta.description,
      image: program.image || OG_IMAGE,
      // Not "website": these are specific offerings, and the type is what makes
      // a share render as a rich card rather than a bare link.
      type: "article",
    });
  }

  // The static collection is the offline floor for the public blog, so these
  // durable article URLs belong in the build-time output. Database-only posts
  // are still fully routable; their discoverability is handled by the CMS/API
  // deployment rather than a stale static file.
  for (const post of blogPosts) {
    if (!post.id) continue;
    const meta = blogMeta(post);
    routes.push({
      loc: `/blog/${post.id}`,
      priority: "0.7",
      changefreq: "monthly",
      lastmod: monthYearToLastmod(post.date),
      title: composeTitle(meta.title),
      description: meta.description,
      image: post.image || OG_IMAGE,
      type: "article",
    });
  }

  // Only published policies. A draft policy's URL redirects home, and listing a
  // redirect is a soft-404 waiting to be reported in Search Console.
  for (const {slug, title} of publishedPolicies) {
    const meta = pageMeta[`/${slug}`];
    routes.push({
      loc: `/${slug}`,
      priority: "0.3",
      changefreq: "yearly",
      title: composeTitle(meta?.title || title),
      description: meta?.description || DEFAULT_DESCRIPTION,
      image: OG_IMAGE,
      type: "website",
    });
  }

  // /achievers is deliberately absent: it is a permanent redirect to /jobs, and
  // a sitemap should list destinations, not the URLs that bounce to them.
  return routes;
}
