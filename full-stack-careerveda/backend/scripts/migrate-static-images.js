// Copies the images still referenced by the *frontend source files* into the
// managed ImageKit account, and rewrites those files to point at the copies.
//
//   npm run migrate:static-images:dry-run
//   npm run migrate:static-images
//
// migrate-media.js moved the images referenced by database records. This handles
// what that missed: assets hard-coded in src/ and index.html — the brand logo,
// the favicon, the press and news-media mastheads, and the copies of the
// programme art embedded in RecommendedCourses1. None of them were ever in a
// content collection, so nothing had touched them.
//
// It matters beyond tidiness: pointing the site's og:image at the new account
// before the favicon had been copied would have produced a 404 on every social
// share, which is worse than the old URL that at least worked.
//
// Reuses a Media record when one already exists for the same source URL, so an
// asset shared between the database and a source file is stored once.

import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {connectDatabase, disconnectDatabase} from "../src/config/database.js";
import {Media} from "../src/models/Media.js";
import {getImageKit, detectImageType, safeFileName, hashBuffer} from "../src/services/imagekit.service.js";
import {escapeRegex} from "../src/utils/sanitize.js";

const DRY_RUN = process.argv.includes("--dry-run");
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const OLD_ACCOUNT = "https://ik.imagekit.io/anwnlsdyv";

// Only these trees are rewritten. index.html is included because the favicon
// and apple-touch-icon live there.
const SCAN = ["src", "index.html"];

// Path fragment in the old URL -> folder in the new account.
const FOLDER_RULES = [
  [/\/website\//i, "/careerveda/brand"],
  [/\/News-media\/|\/press\//i, "/careerveda/press"],
  [/faculty/i, "/careerveda/faculty"],
  [/Achiever|Arjun|Niharika|Riya|Sanya|SYED|Screenshot/i, "/careerveda/alumni"],
];
const DEFAULT_FOLDER = "/careerveda/programs";

const folderFor = (url) => {
  for (const [pattern, folder] of FOLDER_RULES) if (pattern.test(url)) return folder;
  return DEFAULT_FOLDER;
};

const EXTENSION_FOR = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
};

const report = {copied: 0, reused: 0, failed: 0, filesRewritten: 0, details: []};

const listFiles = (target) => {
  const full = path.join(PROJECT_ROOT, target);
  if (!fs.existsSync(full)) return [];
  if (fs.statSync(full).isFile()) return [full];

  return fs
    .readdirSync(full, {withFileTypes: true})
    .flatMap((entry) =>
      entry.isDirectory()
        ? listFiles(path.join(target, entry.name))
        : [path.join(full, entry.name)],
    )
    .filter((file) => /\.(jsx?|html|css)$/.test(file));
};

// The URL as written in source may be percent-encoded and may carry a query.
// The bare, decoded path is what identifies the asset.
const canonicalSource = (url) => url.split("?")[0];

const collectUrls = (files) => {
  const found = new Map();
  // escapeRegex, not a hand-rolled character class: the one written inline here
  // before was mis-escaped and never matched, which left every "." in the host
  // as a wildcard — "ikXimagekitYio/anwnlsdyv/..." was harvested as one of ours.
  //
  // The leading group pins the match to a delimiter, so a URL of ours quoted
  // inside someone else's (…/redirect?to=https://ik.imagekit.io/…) is not
  // mistaken for a reference we should rewrite.
  const pattern = new RegExp(`(^|["'\`(\\s=])(${escapeRegex(OLD_ACCOUNT)}/[^"'\`)\\s]+)`, "g");

  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    // matchAll, so the delimiter the pattern anchors on stays out of the URL.
    for (const [, , url] of source.matchAll(pattern)) {
      // Strip a trailing query so two references to the same asset with
      // different cache-busters collapse to one upload.
      const bare = canonicalSource(url);
      if (!found.has(bare)) found.set(bare, []);
      if (!found.get(bare).includes(file)) found.get(bare).push(file);
    }
  }

  return found;
};

const copyOne = async (sourceUrl) => {
  // Already copied — by migrate-media.js, or by an earlier run of this script.
  const existing = await Media.findOne({originalUrl: sourceUrl});
  if (existing) {
    report.reused += 1;
    return existing;
  }

  const response = await fetch(sourceUrl, {redirect: "follow"});
  if (!response.ok) throw new Error(`source returned ${response.status}`);

  const buffer = Buffer.from(await response.arrayBuffer());
  const mimeType = detectImageType(buffer);

  // SVG reaches here (daily_hunt.svg). It is refused for the same reason the
  // upload endpoint refuses it: an SVG is an executable document, and one
  // served from our own origin is same-origin script. Left on the old account,
  // where it is already being served from a domain that is not ours.
  if (!mimeType) throw new Error("not a supported raster image (SVG is refused by design)");

  const contentHash = hashBuffer(buffer);
  const byHash = await Media.findOne({contentHash});
  if (byHash) {
    report.reused += 1;
    return byHash;
  }

  const extension = EXTENSION_FOR[mimeType];
  const folder = folderFor(sourceUrl);
  const baseName = decodeURIComponent(sourceUrl.split("/").pop()).replace(/\.[^.]*$/, "");
  const fileName = safeFileName(baseName, extension);

  if (DRY_RUN) {
    report.copied += 1;
    return {url: `NEW${folder}/${fileName}`, __dryRun: true};
  }

  const uploaded = await getImageKit().files.upload({
    file: sourceUrl,
    fileName,
    folder,
    useUniqueFileName: false,
  });

  const media = await Media.create({
    name: baseName,
    fileName,
    url: uploaded.url,
    thumbnailUrl: uploaded.thumbnailUrl || "",
    fileId: uploaded.fileId,
    filePath: uploaded.filePath || "",
    folder,
    mimeType,
    extension,
    size: uploaded.size || buffer.length,
    width: uploaded.width || null,
    height: uploaded.height || null,
    contentHash,
    originalUrl: sourceUrl,
  });

  report.copied += 1;
  return media;
};

const run = async () => {
  console.log(DRY_RUN ? "\nDRY RUN — nothing uploaded, no file rewritten\n" : "\nCopying static images\n");

  const files = SCAN.flatMap(listFiles);
  const urls = collectUrls(files);

  console.log(`Found ${urls.size} distinct old-account URLs across ${files.length} scanned files\n`);

  await connectDatabase();

  // sourceUrl -> new URL, applied to the files in one pass at the end so a
  // failure partway through does not leave a file half-rewritten.
  const replacements = new Map();

  for (const [sourceUrl, usedIn] of urls) {
    try {
      const media = await copyOne(sourceUrl);
      replacements.set(sourceUrl, media.url);
      report.details.push(`  + ${path.basename(decodeURIComponent(sourceUrl))} (${usedIn.length} file${usedIn.length === 1 ? "" : "s"})`);
    } catch (error) {
      report.failed += 1;
      report.details.push(`  ! ${path.basename(decodeURIComponent(sourceUrl))}: ${error.message}`);
    }
  }

  if (!DRY_RUN && replacements.size > 0) {
    for (const file of files) {
      let source = fs.readFileSync(file, "utf8");
      const before = source;

      for (const [oldUrl, newUrl] of replacements) {
        // Replace the bare URL only. Any query string that follows it in the
        // source (?tr=…, ?updatedAt=…) is left attached to the new URL —
        // transformations are account-independent and still apply.
        source = source.split(oldUrl).join(newUrl);
      }

      if (source !== before) {
        fs.writeFileSync(file, source, "utf8");
        report.filesRewritten += 1;
      }
    }
  }

  console.log(report.details.join("\n"));
  console.log(
    `\nCopied ${report.copied} · reused ${report.reused} · failed ${report.failed} · files rewritten ${report.filesRewritten}\n`,
  );
};

run()
  .catch((error) => {
    console.error("\nStatic image migration failed:", error.message, "\n");
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
