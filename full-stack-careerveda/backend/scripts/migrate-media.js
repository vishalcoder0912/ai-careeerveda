// Copies every image referenced by content from the old ImageKit account into
// the one this backend holds keys for, registers each as a Media Library
// record, and repoints the content at the new URL.
//
//   npm run migrate:media:dry-run   report what would move, change nothing
//   npm run migrate:media           apply
//
// We have no API key for the source account, but we do not need one: the files
// are publicly readable, and ImageKit's upload API accepts an HTTPS URL and
// fetches it server-side. So this is a copy, not a re-upload of bytes we hold.
//
// Idempotent. A URL that already has a Media record is reused rather than
// uploaded again, so a re-run repairs a partial migration instead of creating
// a second copy of everything.
//
// Reversible. Every Media record keeps `originalUrl`, and the old account is
// left untouched — nothing is deleted from it.

import {connectDatabase, disconnectDatabase} from "../src/config/database.js";
import {Media} from "../src/models/Media.js";
import {RESOURCES} from "../src/config/resources.js";
import {env} from "../src/config/env.js";
import {getImageKit, detectImageType, safeFileName} from "../src/services/imagekit.service.js";
import {hashBuffer} from "../src/services/imagekit.service.js";

const DRY_RUN = process.argv.includes("--dry-run");

// Only this host is copied from. An allow-list rather than "any URL we find in
// the database": this script fetches whatever it is pointed at, and a content
// record is admin-editable, so an unrestricted version would be an SSRF with a
// migration script for a front end.
const SOURCE_HOST = "ik.imagekit.io";
const SOURCE_ACCOUNT = "anwnlsdyv";

// Which fields on each model can hold an image, and which are arrays.
const IMAGE_FIELDS = {
  programs: [["image", "single"], ["heroMedia", "single"], ["gallery", "array"]],
  faculty: [["photo", "single"], ["coverImage", "single"]],
  alumni: [["image", "single"], ["companyLogo", "single"]],
  blogs: [["image", "single"], ["gallery", "array"]],
  jobs: [["companyLogo", "single"]],
  policies: [],
  faqs: [],
};

// Which folder a given resource's images land in, so the new account has a
// structure rather than one flat dump.
const FOLDER_FOR = {
  programs: "/careerveda/programs",
  faculty: "/careerveda/faculty",
  alumni: "/careerveda/alumni",
  blogs: "/careerveda/blogs",
  jobs: "/careerveda/jobs",
};

const report = {copied: 0, reused: 0, failed: 0, repointed: 0, skipped: 0, details: []};

// Host equality and an account-prefixed path, not two substring tests. This
// value decides what the script will fetch, so "https://evil.example/ik.imagekit.io/anwnlsdyv/x"
// passing the allow-list is exactly the SSRF the comment above is guarding against.
const isOldAccountUrl = (url) => {
  if (typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return parsed.hostname === SOURCE_HOST && parsed.pathname.startsWith(`/${SOURCE_ACCOUNT}/`);
  } catch {
    return false;
  }
};

// The stored URLs carry things ImageKit added — %20 in names, ?updatedAt=…,
// sometimes an existing ?tr= transform. The transform must be dropped before
// copying or we would archive a resized derivative as though it were the
// original.
const sourceUrlFor = (url) => {
  const [base] = url.split("?");
  return base;
};

const nameFromUrl = (url) => {
  const last = decodeURIComponent(sourceUrlFor(url).split("/").pop() || "image");
  return last.replace(/\.[^.]*$/, "") || "image";
};

const EXTENSION_FOR = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
};

// Downloads the original so we can hash it and confirm it really is an image
// before handing the URL to ImageKit. Hashing here is what makes duplicate
// detection work across the whole migration: the same picture used by three
// programs is copied once.
const fetchOriginal = async (url) => {
  const response = await fetch(sourceUrlFor(url), {redirect: "follow"});

  if (!response.ok) throw new Error(`source returned ${response.status}`);

  const buffer = Buffer.from(await response.arrayBuffer());
  const detected = detectImageType(buffer);

  if (!detected) throw new Error("source is not a supported image format");

  return {buffer, mimeType: detected, size: buffer.length};
};

const copyOne = async (url, {folder, label}) => {
  // Already copied on an earlier run, or shared with another record.
  const existing = await Media.findOne({originalUrl: sourceUrlFor(url)});
  if (existing) {
    report.reused += 1;
    return existing;
  }

  const {buffer, mimeType, size} = await fetchOriginal(url);
  const contentHash = hashBuffer(buffer);

  // The same image reachable under two different old URLs.
  const byHash = await Media.findOne({contentHash});
  if (byHash) {
    report.reused += 1;
    return byHash;
  }

  const extension = EXTENSION_FOR[mimeType];
  const fileName = safeFileName(nameFromUrl(url), extension);

  if (DRY_RUN) {
    report.copied += 1;
    report.details.push(`  + ${label}: ${nameFromUrl(url)}.${extension} (${Math.round(size / 1024)} KB) -> ${folder}`);
    // A stand-in so the caller can continue walking the graph in dry-run.
    return {url: `${env.IMAGEKIT_URL_ENDPOINT}${folder}/${fileName}`, _id: null, __dryRun: true};
  }

  const imagekit = getImageKit();

  // The URL form: ImageKit fetches it server-side, so the bytes never make a
  // second trip through this process.
  const uploaded = await imagekit.files.upload({
    file: sourceUrlFor(url),
    fileName,
    folder,
    useUniqueFileName: false,
  });

  const media = await Media.create({
    name: nameFromUrl(url),
    fileName,
    url: uploaded.url,
    thumbnailUrl: uploaded.thumbnailUrl || "",
    fileId: uploaded.fileId,
    filePath: uploaded.filePath || "",
    folder,
    mimeType,
    extension,
    size: uploaded.size || size,
    width: uploaded.width || null,
    height: uploaded.height || null,
    contentHash,
    originalUrl: sourceUrlFor(url),
  });

  report.copied += 1;
  report.details.push(`  + ${label}: ${fileName} (${Math.round(size / 1024)} KB)`);

  return media;
};

// Rewrites one media subdocument in place, preserving the alt text and caption
// an editor may already have written.
const repoint = (target, media) => {
  target.url = media.url;
  target.thumbnailUrl = media.thumbnailUrl || "";
  target.fileId = media.fileId || "";
  if (media._id) target.media = media._id;
  if (media.width) target.width = media.width;
  if (media.height) target.height = media.height;
};

const migrateResource = async (resource) => {
  const fields = IMAGE_FIELDS[resource.name] || [];
  if (fields.length === 0) return;

  const folder = FOLDER_FOR[resource.name] || "/careerveda";
  const documents = await resource.model.find({});

  console.log(`\n${resource.label} (${documents.length} records)`);

  for (const document of documents) {
    let changed = false;

    for (const [field, kind] of fields) {
      if (kind === "single") {
        const target = document[field];
        if (!target || !isOldAccountUrl(target.url)) continue;

        try {
          const media = await copyOne(target.url, {
            folder,
            label: `${document.title || document.name || document.slug}`,
          });
          if (!DRY_RUN) {
            repoint(target, media);
            changed = true;
          }
        } catch (error) {
          report.failed += 1;
          report.details.push(`  ! ${document.slug}.${field}: ${error.message}`);
        }
      }

      if (kind === "array") {
        for (const entry of document[field] || []) {
          if (!isOldAccountUrl(entry.url)) continue;

          try {
            const media = await copyOne(entry.url, {folder, label: document.slug});
            if (!DRY_RUN) {
              repoint(entry, media);
              changed = true;
            }
          } catch (error) {
            report.failed += 1;
            report.details.push(`  ! ${document.slug}.${field}[]: ${error.message}`);
          }
        }
      }
    }

    if (changed && !DRY_RUN) {
      // markModified is required: these are nested subdocuments on a schema
      // path Mongoose does not always see as dirty after an in-place edit.
      for (const [field] of fields) document.markModified(field);
      await document.save();
      report.repointed += 1;
    }
  }
};

const run = async () => {
  console.log(
    DRY_RUN
      ? "\nDRY RUN — nothing will be uploaded or changed\n"
      : `\nCopying images into ${env.IMAGEKIT_URL_ENDPOINT}\n`,
  );

  if (!env.imagekitConfigured) {
    console.error("  ImageKit is not configured. Set the three IMAGEKIT_ variables.\n");
    process.exitCode = 1;
    return;
  }

  await connectDatabase();

  for (const resource of Object.values(RESOURCES)) {
    await migrateResource(resource);
  }

  console.log("\n" + report.details.join("\n"));
  console.log(
    `\nCopied ${report.copied} · reused ${report.reused} · records repointed ${report.repointed} · failed ${report.failed}\n`,
  );

  if (report.failed > 0) process.exitCode = 1;
};

run()
  .catch((error) => {
    console.error("\nMedia migration failed:", error.message, "\n");
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
