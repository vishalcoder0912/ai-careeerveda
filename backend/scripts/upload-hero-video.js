import {readFile} from "node:fs/promises";
import path from "node:path";
import {argv} from "node:process";
import {fileURLToPath} from "node:url";

import {toFile} from "@imagekit/nodejs";

import {connectDatabase, disconnectDatabase} from "../src/config/database.js";
import {Program} from "../src/models/Program.js";
import {getImageKit} from "../src/services/imagekit.service.js";

const DRY_RUN = argv.includes("--dry-run");
const EXPLICIT_FILE = argv.find((arg) => !arg.startsWith("-") && arg.toLowerCase().endsWith(".mp4"));
const FILE_NAME = "gen-ai-agentic-ai-hero.mp4";
const FOLDER = "/careerveda/programs";
const PROGRAM_SLUG = "gen-ai-agentic-ai";
const MAX_BYTES = 25 * 1024 * 1024;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_FILE = path.resolve(HERE, "../../Hero Video.mp4");

const fail = (message) => {
  console.error(`\n  ${message}\n`);
  process.exitCode = 1;
};

const run = async () => {
  const source = EXPLICIT_FILE ? path.resolve(EXPLICIT_FILE) : DEFAULT_FILE;
  const buffer = await readFile(source);

  // ftyp is the ISO BMFF box every MP4 starts with. Checking bytes rather than
  // the extension keeps a renamed image or document out of the video field.
  if (buffer.length < 12 || buffer.subarray(4, 8).toString("ascii") !== "ftyp") {
    return fail("That file is not an MP4 (missing the ISO 'ftyp' box).");
  }
  if (buffer.length > MAX_BYTES) {
    return fail(`The video must be under ${Math.round(MAX_BYTES / 1024 / 1024)} MB.`);
  }

  console.log(`Video: ${source} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`Destination: ${FOLDER}/${FILE_NAME}`);

  if (DRY_RUN) {
    console.log("DRY RUN — nothing uploaded, no database write.");
    return undefined;
  }

  await connectDatabase();
  try {
    const uploaded = await getImageKit().files.upload({
      file: await toFile(buffer, FILE_NAME),
      fileName: FILE_NAME,
      folder: FOLDER,
      useUniqueFileName: false,
      isPrivateFile: false,
    });

    const result = await Program.updateOne(
      {slug: PROGRAM_SLUG},
      {
        $set: {
          "heroVideo.url": uploaded.url,
          "heroVideo.fileId": uploaded.fileId,
          "heroVideo.alt": "Gen AI and Agentic AI program hero video",
          "heroVideo.caption": "AI engineering studio hero footage",
        },
      },
    );

    if (!result.matchedCount) return fail(`No program found with slug "${PROGRAM_SLUG}".`);

    console.log(`Uploaded: ${uploaded.url}`);
    console.log(`Stored heroVideo.url on program "${PROGRAM_SLUG}".`);
    return undefined;
  } finally {
    await disconnectDatabase();
  }
};

run().catch((error) => {
  console.error("\n  Upload failed:", error?.message || error, "\n");
  process.exitCode = 1;
});
