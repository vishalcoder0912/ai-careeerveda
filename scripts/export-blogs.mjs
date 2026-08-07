// Pulls the blog collection out of MongoDB and into src/data/blogPosts.js.
//
//   npm run blogs:export             preview only — reports, writes nothing
//   npm run blogs:export -- --write  rewrites src/data/blogPosts.js
//   npm run blogs:export -- --write --include-drafts
//
// This is a one-time cutover tool, not part of the build. The blog stopped
// reading from the API (see the note at the top of src/data/blogPosts.js), so
// this exists to carry whatever the database already holds into the file that
// is now the source of truth. Run it once, delete what you don't want by hand,
// and from then on the file is edited directly.
//
// Reads MONGODB_URI from .env, exactly like scripts/check-db.mjs. Never writes
// to the database — the collection is left untouched, so re-running is safe and
// the CMS data stays there if this cutover is ever reversed.

import {readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {MongoClient} from "mongodb";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TARGET = path.join(ROOT, "src/data/blogPosts.js");

const write = process.argv.includes("--write");
const includeDrafts = process.argv.includes("--include-drafts");

const readEnv = () => {
  try {
    for (const line of readFileSync(path.join(ROOT, ".env"), "utf8").split("\n")) {
      const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const [, key, value] = match;
      if (!process.env[key]) process.env[key] = value.replace(/^["']|["']$/g, "");
    }
  } catch {
    console.error("No .env file found — set MONGODB_URI in the environment instead.");
  }
};

readEnv();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "careerveda";

if (!uri) {
  console.error("✗ MONGODB_URI is empty. Nothing to export from.");
  process.exit(1);
}

// Mirrors publiclyVisible() in backend/src/models/plugins/contentPlugin.js. A
// draft is excluded by default because the point of the export is to reproduce
// what the live site currently shows, not the editing backlog behind it.
const visible = () => {
  const now = new Date();
  return {
    deletedAt: null,
    $or: [
      {status: "published", publishedAt: {$lte: now}},
      {status: "published", publishedAt: null},
      {status: "scheduled", scheduledAt: {$lte: now}},
    ],
  };
};

// The inverse of adaptBlogPost in src/lib/contentAdapters.js: an API record back
// into the shape the static file has always used. Mongo bookkeeping (_id, __v,
// timestamps, status, searchText, relatedPosts) is dropped — it means nothing
// once the file is the source of truth.
const toStaticPost = (record) => {
  const post = {
    id: record.slug,
    category: record.category || "",
    tag: record.tag || "",
    title: record.title,
    author: record.author || "CareerVeda Team",
    date: record.date || "",
    readTime: record.readTime || "",
    excerpt: record.excerpt || "",
    // A media reference in the database, a bare URL string in the file.
    image: record.image?.url || "",
    lead: record.lead || "",
    sections: (record.sections || []).map((section) => ({
      heading: section.heading || "",
      body: section.body || [],
    })),
  };

  if (record.highlights?.length) post.highlights = record.highlights;
  if (record.tags?.length) post.tags = record.tags;
  if (record.cta?.label || record.cta?.url) {
    post.cta = {label: record.cta.label, url: record.cta.url};
  }
  // Kept because BlogDetailPage prefers seo.description for the meta tag.
  if (record.seo?.title || record.seo?.description) {
    post.seo = {};
    if (record.seo.title) post.seo.title = record.seo.title;
    if (record.seo.description) post.seo.description = record.seo.description;
  }

  return post;
};

const client = new MongoClient(uri, {serverSelectionTimeoutMS: 8000});

try {
  await client.connect();

  const query = includeDrafts ? {deletedAt: null} : visible();
  const records = await client.db(dbName).collection("blogs").find(query).sort({publishedAt: -1}).toArray();

  console.log(`Connected to "${dbName}" — ${records.length} blog document(s) matched.\n`);

  const {default: existing} = await import(
    new URL(`file:///${TARGET.replace(/\\/g, "/")}`).href
  );

  const byId = new Map(existing.map((post) => [post.id, post]));
  const added = [];
  const updated = [];

  for (const record of records) {
    if (!record.slug) {
      console.warn(`  ! skipped a document with no slug: "${record.title || record._id}"`);
      continue;
    }
    const post = toStaticPost(record);
    if (byId.has(post.id)) updated.push(post.id);
    else added.push(post.id);
    byId.set(post.id, post);
  }

  // File order is what the blog index renders, and the existing order is
  // hand-tuned newest-first. Keep it, and put database-only posts on top since
  // they are the newer ones.
  const merged = [
    ...added.map((id) => byId.get(id)),
    ...existing.map((post) => byId.get(post.id)),
  ];

  console.log(`  ${added.length} post(s) only in the database (will be added):`);
  for (const id of added) console.log(`    + ${id}`);
  console.log(`\n  ${updated.length} post(s) in both (database copy wins):`);
  for (const id of updated) console.log(`    ~ ${id}`);
  console.log(`\n  ${merged.length} post(s) total after merge.`);

  if (!write) {
    console.log("\nPreview only. Re-run with --write to update src/data/blogPosts.js.");
  } else {
    const body = `// The blog, as plain data. This file is the source of truth.
//
// The public blog used to render whatever the API returned and fall back to
// this file only when the backend was unreachable. It no longer does: /blog and
// /blog/:slug read this array and nothing else, so editing a post here is what
// changes the site, and a post removed here is gone once deployed.
//
// Generated once by scripts/export-blogs.mjs from the old CMS collection, and
// hand-edited from then on. Each entry needs at least { id, title, sections };
// \`id\` is the URL segment (/blog/<id>) and must stay unique and stable, because
// it is the permalink search engines have indexed. Everything else is optional
// and degrades to a sensible default.

const blogPosts = ${JSON.stringify(merged, null, 2)};

export default blogPosts;
`;
    writeFileSync(TARGET, body, "utf8");
    console.log(`\n✓ Wrote ${path.relative(ROOT, TARGET)} (${merged.length} posts).`);
    console.log("  Review the diff, delete anything you don't want, then rebuild.");
  }
} catch (error) {
  console.error(`✗ Export failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.close();
}
