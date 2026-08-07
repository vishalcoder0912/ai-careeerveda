// Restores the reader fields that older migrations dropped from static blogs.
//
//   npm run backfill:blog-reader:dry-run  report proposed changes
//   npm run backfill:blog-reader          fill only missing values
//
// This is intentionally narrower than re-running migrate-content: it never
// copies titles, sections, publication state, or any editor changes back from
// the static source. It only fills an empty highlights/CTA field for a known
// legacy static slug, and is safe to run repeatedly.

import path from "node:path";
import {fileURLToPath} from "node:url";

import {connectDatabase, disconnectDatabase} from "../src/config/database.js";
import {Blog} from "../src/models/Blog.js";
import {toSlug} from "../src/utils/sanitize.js";
import {loadFrontendData} from "./lib/loadFrontendData.js";

const DRY_RUN = process.argv.includes("--dry-run");
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_CTA = {label: "Explore CareerVeda programs", url: "/programs"};

const nonBlank = (value) => (typeof value === "string" ? value.trim() : "");

const run = async () => {
  const {modules, cleanup} = await loadFrontendData(PROJECT_ROOT);
  const posts = modules.blogPosts.default || [];
  const sourceBySlug = new Map(
    posts
      .map((post) => [toSlug(post.id || post.title), post])
      .filter(([slug]) => Boolean(slug)),
  );

  await connectDatabase();

  try {
    const blogs = await Blog.find({slug: {$in: [...sourceBySlug.keys()]}})
      .select("slug highlights cta")
      .lean();
    let updated = 0;
    let untouched = 0;

    for (const blog of blogs) {
      const source = sourceBySlug.get(blog.slug);
      const sourceCta = source.cta || DEFAULT_CTA;
      const highlights = Array.isArray(blog.highlights) && blog.highlights.length > 0
        ? blog.highlights
        : (source.highlights || []);
      const cta = {
        label: nonBlank(blog.cta?.label) || sourceCta.label || DEFAULT_CTA.label,
        url: nonBlank(blog.cta?.url) || sourceCta.url || DEFAULT_CTA.url,
      };
      const needsHighlights = !Array.isArray(blog.highlights) || blog.highlights.length === 0;
      const needsCta = cta.label !== blog.cta?.label || cta.url !== blog.cta?.url;

      if (!needsHighlights && !needsCta) {
        untouched += 1;
        continue;
      }

      if (!DRY_RUN) {
        await Blog.updateOne({_id: blog._id}, {$set: {highlights, cta}});
      }
      updated += 1;
      console.log(`${DRY_RUN ? "would backfill" : "backfilled"}: ${blog.slug}`);
    }

    console.log(`${DRY_RUN ? "Would update" : "Updated"} ${updated}; already complete ${untouched}.`);
  } finally {
    cleanup();
    await disconnectDatabase();
  }
};

run().catch((error) => {
  console.error("Blog reader backfill failed:", error.message);
  process.exitCode = 1;
});
