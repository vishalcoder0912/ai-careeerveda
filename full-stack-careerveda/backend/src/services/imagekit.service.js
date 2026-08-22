import {createHash} from "node:crypto";

import ImageKit, {toFile} from "@imagekit/nodejs";

import {env} from "../config/env.js";
import {badRequest, serviceUnavailable} from "../utils/apiError.js";

// The ImageKit private key exists in this module and nowhere else. Nothing in
// this file is importable by the frontend, and no response built here includes
// a credential.

// The only host we will ever rewrite a URL for. See isImageKitUrl below.
export const IMAGEKIT_HOST = "ik.imagekit.io";

let client = null;

export const getImageKit = () => {
  if (!env.imagekitConfigured) {
    throw serviceUnavailable("Media uploads are not configured on this server.");
  }

  if (!client) {
    client = new ImageKit({
      privateKey: env.IMAGEKIT_PRIVATE_KEY,
      publicKey: env.IMAGEKIT_PUBLIC_KEY,
      urlEndpoint: env.IMAGEKIT_URL_ENDPOINT,
    });
  }

  return client;
};

// ── Upload validation ───────────────────────────────────────────────────────

// SVG is deliberately absent. An SVG is an XML document that can carry
// <script>, and serving one from our own domain makes it same-origin — a
// stored XSS with extra steps. Raster formats only; a logo that must be vector
// can be added to the repo by a developer, where it gets code review.
const ALLOWED = {
  "image/jpeg": {extensions: ["jpg", "jpeg"], magic: [[0xff, 0xd8, 0xff]]},
  "image/png": {extensions: ["png"], magic: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]]},
  "image/gif": {extensions: ["gif"], magic: [[0x47, 0x49, 0x46, 0x38]]},
  // RIFF....WEBP — the format marker is at offset 8, checked separately below.
  "image/webp": {extensions: ["webp"], magic: [[0x52, 0x49, 0x46, 0x46]]},
  // ISO-BMFF: "ftyp" at offset 4. Same structural check as webp.
  "image/avif": {extensions: ["avif"], magic: null},
};

export const ALLOWED_MIME_TYPES = Object.keys(ALLOWED);
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

const startsWith = (buffer, bytes) => bytes.every((byte, index) => buffer[index] === byte);

// Content sniffing, not extension trust.
//
// A browser sends whatever Content-Type it likes and a filename is just a
// string, so "payload.php" renamed to "cat.png" with a png Content-Type passes
// both. The first bytes of the actual file do not lie.
export const detectImageType = (buffer) => {
  if (!buffer || buffer.length < 12) return null;

  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(buffer, [0x47, 0x49, 0x46, 0x38])) return "image/gif";

  // RIFF <4-byte size> WEBP
  if (startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
    return "image/webp";
  }

  // ....ftyp<brand>, brand avif or avis
  if (buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buffer.subarray(8, 12).toString("ascii");
    if (brand === "avif" || brand === "avis") return "image/avif";
  }

  return null;
};

export const validateUpload = (file) => {
  if (!file || !file.buffer || file.buffer.length === 0) {
    return "No file was uploaded.";
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return `Images must be under ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`;
  }

  const detected = detectImageType(file.buffer);

  if (!detected) {
    return "That file is not a supported image (JPEG, PNG, GIF, WebP or AVIF).";
  }

  // The declared type must also agree with the bytes. A mismatch is not a
  // user mistake worth accommodating — it is the signature of an attempt.
  if (file.mimetype && file.mimetype !== detected) {
    return "The file contents do not match its declared type.";
  }

  return null;
};

// The stored name is rebuilt rather than sanitised. Accepting a caller-supplied
// path fragment ("../../etc/passwd", or a name with a null byte) and trying to
// clean it is a losing game; deriving a safe name from scratch is not.
export const safeFileName = (original, extension) => {
  const base = String(original || "image")
    .replace(/\.[^.]*$/, "")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "image";

  // A short random suffix avoids collisions without ImageKit having to rename.
  const unique = createHash("sha1").update(`${base}${Date.now()}${Math.random()}`).digest("hex").slice(0, 8);

  return `${base}-${unique}.${extension}`;
};

// Folders are chosen from a fixed list, not free text. An admin-supplied folder
// path is a way to write outside the intended tree.
export const ALLOWED_FOLDERS = [
  "/careerveda",
  "/careerveda/programs",
  "/careerveda/faculty",
  "/careerveda/alumni",
  "/careerveda/blogs",
  "/careerveda/jobs",
  "/careerveda/pages",
  "/careerveda/logos",
  // Brand marks (logo, favicon) and press/outlet logos. Separate from /logos so
  // the site's own identity is not mixed in with third-party mastheads.
  "/careerveda/brand",
  "/careerveda/press",
];

export const hashBuffer = (buffer) => createHash("sha256").update(buffer).digest("hex");

export const uploadImage = async ({buffer, fileName, folder}) => {
  const imagekit = getImageKit();

  if (!ALLOWED_FOLDERS.includes(folder)) throw badRequest("That folder is not allowed.");

  const result = await imagekit.files.upload({
    // The SDK's `file` takes an Uploadable, not a raw Buffer — passing one
    // produces "400 Your request is missing file" from the API, because the
    // buffer never becomes a multipart part. toFile() wraps it with the name
    // and type the upload needs. Base64 would also work and costs 33% more
    // bytes on every upload for no benefit.
    file: await toFile(buffer, fileName),
    fileName,
    folder,
    // Off: ImageKit's automatic uniquification would silently rename our
    // already-unique name and make the stored fileName disagree with reality.
    useUniqueFileName: false,
    // We do not want ImageKit deriving tags or alt text; those are editorial
    // fields an admin owns.
    isPrivateFile: false,
  });

  return result;
};

export const deleteImage = async (fileId) => {
  const imagekit = getImageKit();
  return imagekit.files.delete(fileId);
};

// Optimised delivery URL. Mirrors what src/lib/imageCdn.js already does on the
// frontend — w- for the rendered width, f-auto to let the browser take WebP or
// AVIF, q-80 as the last quality step where the difference is invisible.
//
// Host equality rather than a substring test: "https://evil.example/ik.imagekit.io/x"
// contains the host name without being served by it, and appending our transform
// to a stranger's URL would make it look like a managed asset.
export const isImageKitUrl = (url) => {
  if (typeof url !== "string") return false;
  try {
    return new URL(url).hostname === IMAGEKIT_HOST;
  } catch {
    return false;
  }
};

export const buildImageUrl = (url, {width, quality = 80} = {}) => {
  if (!isImageKitUrl(url)) return url;
  if (/[?&]tr=/.test(url)) return url;
  if (!width) return url;

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}tr=w-${Math.round(width)},f-auto,q-${quality}`;
};
