import path from "node:path";
import {fileURLToPath} from "node:url";

import {connectDatabase, disconnectDatabase} from "../src/config/database.js";
import {Blog} from "../src/models/Blog.js";
import {toSlug} from "../src/utils/sanitize.js";
import {loadFrontendData} from "./lib/loadFrontendData.js";

const DRY_RUN = process.argv.includes("--dry-run");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_CTA = {label: "Explore CareerVeda programs", url: "/programs"};

// Fallback chain: first non-blank value in order wins (linked-list walk).
const pick = (...values) =>
  values.find((v) => typeof v === "string" && v.trim());

class BlogBackfiller {
  constructor(posts, dryRun = false) {
    this.dryRun = dryRun;
    this.sources = new Map(
      posts.map((p) => [toSlug(p.id || p.title), p]).filter(([s]) => s),
    );
  }

  resolve(blog) {
    const source = this.sources.get(blog.slug) || {};
    const sourceCta = source.cta || DEFAULT_CTA;
    const hasHighlights = Array.isArray(blog.highlights) && blog.highlights.length > 0;
    const data = {
      highlights: hasHighlights ? blog.highlights : source.highlights || [],
      cta: {
        label: pick(blog.cta?.label, sourceCta.label, DEFAULT_CTA.label),
        url: pick(blog.cta?.url, sourceCta.url, DEFAULT_CTA.url),
      },
    };
    const changed =
      !hasHighlights ||
      data.cta.label !== blog.cta?.label ||
      data.cta.url !== blog.cta?.url;
    return {data, changed};
  }

  async run() {
    const blogs = await Blog.find({slug: {$in: [...this.sources.keys()]}})
      .select("slug highlights cta")
      .lean();
    let updated = 0;
    let untouched = 0;

    for (const blog of blogs) {
      const {data, changed} = this.resolve(blog);
      if (!changed) {
        untouched++;
        continue;
      }
      if (!this.dryRun) await Blog.updateOne({_id: blog._id}, {$set: data});
      updated++;
      console.log(`${this.dryRun ? "would backfill" : "backfilled"}: ${blog.slug}`);
    }

    console.log(
      `${this.dryRun ? "Would update" : "Updated"} ${updated}; already complete ${untouched}.`,
    );
  }
}

const main = async () => {
  const {modules, cleanup} = await loadFrontendData(ROOT);
  await connectDatabase();
  try {
    await new BlogBackfiller(modules.blogPosts.default || [], DRY_RUN).run();
  } finally {
    cleanup();
    await disconnectDatabase();
  }
};

main().catch((error) => {
  console.error("Blog reader backfill failed:", error.message);
  process.exitCode = 1;
});
