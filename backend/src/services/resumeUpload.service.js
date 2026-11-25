import crypto from "crypto";
import ImageKit, {toFile} from "@imagekit/nodejs";
import {env} from "../config/env.js";
import {badRequest, serviceUnavailable} from "../utils/apiError.js";
import {isImageKitUrl} from "./imagekit.service.js";

export const RESUME_MAX_BYTES = 5 * 1024 * 1024;
export const RESUME_ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const RESUME_FOLDER_ROOT = "/careerveda/resumes";
export const RESUME_UPLOAD_TOKEN_TTL_MS = 30 * 60 * 1000;

const EXT_BY_MIME = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

// Browsers, proxies and object stores relabel documents with generic or legacy
// MIME types. The type is sniffed from the bytes below, so an unknown label is
// not a contradiction — it only means the sender did not know what it had.
const GENERIC_MIME = new Set(["application/octet-stream", "binary/octet-stream"]);
const MIME_ALIASES = {
  "application/pdf": new Set(["application/x-pdf", "application/acrobat", "application/x-acrobat"]),
  "application/msword": new Set(["application/x-msword"]),
};
const declaredTypeMatches = (detected, declared) => {
  const given = String(declared || "").trim().toLowerCase();
  if (!given || GENERIC_MIME.has(given) || given === detected) return true;
  return Boolean(MIME_ALIASES[detected]?.has(given));
};

let client = null;

const getClient = () => {
  if (!env.imagekitConfigured) {
    throw serviceUnavailable("Resume uploads are not configured on this server.");
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

const readResponseBytes = async (response, maxBytes) => {
  const declared = Number(response.headers?.get?.("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw badRequest("That resume is larger than the 5 MB limit.");
  }

  const reader = response.body?.getReader?.();
  if (!reader) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > maxBytes) throw badRequest("That resume is larger than the 5 MB limit.");
    return bytes;
  }

  const chunks = [];
  let received = 0;
  for (;;) {
    const {done, value} = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel?.().catch(() => {});
      throw badRequest("That resume is larger than the 5 MB limit.");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
};

const fetchFileBytes = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, {signal: controller.signal});
    if (!response.ok) {
      throw serviceUnavailable("We couldn't verify the uploaded resume right now. Please try again.");
    }
    return await readResponseBytes(response, RESUME_MAX_BYTES + 1);
  } catch (error) {
    if (error?.name === "AbortError") {
      throw serviceUnavailable("We couldn't verify the uploaded resume right now. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};


// Polyglots are rejected structurally, not by scanning for ASCII strings.
// An earlier version searched the first 8 KB of every file for substrings like
// "<svg" or "javascript:" and refused any match. Real PDFs routinely contain
// those strings in XMP metadata, vector artwork and link annotations, so
// perfectly good resumes were rejected as "active content".
//
// The checks below are stronger and have no false positives:
//   • detectResumeType() requires the document's binary signature at the very
//     start (ignoring only PDF-legal BOM/whitespace), so a browser can never
//     fall back to rendering the file as HTML/SVG;
//   • storeResumeFile() uploads with the MIME type we detected from the bytes,
//     not one a client declared, so the file is only ever served as a document;
//   • validateResumeFile() binds the filename extension to that detected type.
// A file whose bytes really are HTML or SVG has no document signature and is
// rejected by detectResumeType() before any of this runs.

// A ZIP signature alone is not a Word document: any archive can be renamed to
// .docx. Require the two OOXML entry names Word actually writes, plus the ZIP
// end-of-central-directory record, which is present in every complete archive.
const isOoxmlDocument = (buffer) => {
  // latin1 maps bytes 1:1, so ASCII entry names can be searched without turning
  // a binary archive into replacement characters. The files are capped at 5 MB,
  // so scanning all of it is cheap and avoids false negatives for entries whose
  // names sit far into the archive.
  const text = Buffer.from(buffer).toString("latin1");
  return (
    text.includes("[Content_Types].xml") &&
    text.includes("word/document.xml") &&
    text.includes("PK\x05\x06")
  );
};

export const detectResumeType = (buffer) => {
  if (!buffer || buffer.length < 8) return null;
  // A few PDF writers prepend a UTF-8 BOM or whitespace before the header and
  // every PDF reader skips it. Skip only those bytes — never arbitrary markup,
  // which is how an HTML/SVG polyglot would try to get past the signature.
  let start = 0;
  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) start = 3;
  while (
    start < buffer.length &&
    start < 1024 &&
    [0x00, 0x09, 0x0a, 0x0c, 0x0d, 0x20].includes(buffer[start])
  ) start += 1;
  // PDF: %PDF-
  if (
    buffer[start] === 0x25 && buffer[start + 1] === 0x50 &&
    buffer[start + 2] === 0x44 && buffer[start + 3] === 0x46 &&
    buffer[start + 4] === 0x2d
  ) {
    return "application/pdf";
  }
  // DOCX is a ZIP/OOXML package starting PK..
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    return isOoxmlDocument(buffer)
      ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : null;
  }
  // Legacy DOC (OLE Compound File): D0 CF 11 E0 A1 B1 1A E1
  if (
    buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0 &&
    buffer[4] === 0xa1 && buffer[5] === 0xb1 && buffer[6] === 0x1a && buffer[7] === 0xe1
  ) {
    return "application/msword";
  }
  return null;
};

export const validateResumeFile = ({buffer, mimetype, size, originalname}) => {
  if (!buffer || !size) return "No resume file was uploaded.";
  if (size > RESUME_MAX_BYTES) return "Resume must be 5 MB or smaller.";
  const detected = detectResumeType(buffer);
  if (!detected || !RESUME_ALLOWED_MIME.has(detected)) {
    return "Only PDF and Word resumes (.pdf, .doc, .docx) are allowed.";
  }
  if (!declaredTypeMatches(detected, mimetype)) {
    return "The file contents do not match its declared type.";
  }
  const name = String(originalname || "");
  if (!/\.(pdf|doc|docx)$/i.test(name) || !name.toLowerCase().endsWith(`.${EXT_BY_MIME[detected]}`)) {
    return "Resume file extension must be .pdf, .doc, or .docx.";
  }
  return null;
};

export const safeResumeName = (original, mimeType) => {
  const ext = EXT_BY_MIME[mimeType] || "pdf";
  const base = String(original || "resume")
    .replace(/\.[^.]*$/, "")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "resume";
  const unique = crypto.randomBytes(6).toString("hex");
  return `${base}-${Date.now()}-${unique}.${ext}`;
};



const uploadTokenKey = () =>
  crypto.createHmac("sha256", env.JWT_ACCESS_SECRET).update("careerveda:resume-upload:v1").digest();

const newResumeFolder = (jobSlug) => {
  const safeJob = String(jobSlug || "job")
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "job";
  return `${RESUME_FOLDER_ROOT}/${safeJob}/${crypto.randomBytes(16).toString("hex")}`;
};

const signUploadToken = ({jobSlug, folder, expiresAt}) => {
  const payload = Buffer.from(
    JSON.stringify({v: 1, job: String(jobSlug), folder, exp: expiresAt}),
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", uploadTokenKey())
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
};

const invalidUploadToken = () =>
  badRequest("Your resume upload has expired. Please upload it again.", {
    resume: "Your resume upload has expired. Please upload it again.",
  });

export const verifyResumeUploadToken = ({token, jobSlug}) => {
  if (!token || typeof token !== "string") throw invalidUploadToken();
  const parts = token.split(".");
  if (parts.length !== 2) throw invalidUploadToken();
  const [payload, signature] = parts;

  const expected = crypto
    .createHmac("sha256", uploadTokenKey())
    .update(payload)
    .digest();
  let actual;
  try {
    actual = Buffer.from(signature, "base64url");
  } catch {
    throw invalidUploadToken();
  }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    throw invalidUploadToken();
  }

  let data;
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw invalidUploadToken();
  }

  if (
    !data ||
    data.v !== 1 ||
    data.job !== String(jobSlug) ||
    typeof data.folder !== "string" ||
    !data.folder.startsWith(`${RESUME_FOLDER_ROOT}/`) ||
    !Number.isFinite(data.exp) ||
    data.exp < Date.now()
  ) {
    throw invalidUploadToken();
  }

  return {folder: data.folder, expiresAt: data.exp};
};

export const getResumeUploadAuth = ({jobSlug}) => {
  // No ImageKit credentials are returned. ImageKit's signature does not bind
  // the folder, so handing the browser a token/signature pair let it upload to
  // any folder in the account. The browser gets only an opaque token naming a
  // random folder; the bytes are posted back to us and we upload them.
  const folder = newResumeFolder(jobSlug);
  const expiresAt = Date.now() + RESUME_UPLOAD_TOKEN_TTL_MS;

  return {
    folder,
    jobSlug,
    uploadToken: signUploadToken({jobSlug, folder, expiresAt}),
    uploadTokenExpiresAt: new Date(expiresAt).toISOString(),
  };
};

// The browser never talks to ImageKit. It posts the bytes here, we inspect them
// ourselves, and only then does the SDK put them in the folder named by the
// signed token. This is what makes the server authoritative rather than a
// notary for whatever the client claims the file is.
export const storeResumeFile = async ({buffer, mimetype, originalname, folder}) => {
  if (!buffer || !buffer.byteLength) throw badRequest("No resume file was uploaded.");
  if (typeof folder !== "string" || !folder.startsWith(`${RESUME_FOLDER_ROOT}/`)) {
    throw badRequest("Uploaded resume could not be verified.", {
      resume: "Please upload your resume again.",
    });
  }
  const problem = validateResumeFile({
    buffer,
    mimetype,
    size: buffer.byteLength,
    originalname,
  });
  if (problem) throw badRequest(problem, {resume: problem});

  const detected = detectResumeType(buffer);
  const fileName = safeResumeName(originalname, detected);
  const ik = getClient();
  let uploaded;
  try {
    uploaded = await ik.files.upload({
      // Without an explicit type the SDK builds a File with no MIME type.
      // ImageKit then stores the resume as application/octet-stream and the
      // submit-time re-check rejects an otherwise valid PDF.
      file: await toFile(Buffer.from(buffer), fileName, {type: detected}),
      fileName,
      folder,
      // The name already carries a random suffix; let ImageKit keep it so the
      // stored record and the metadata we return cannot disagree.
      useUniqueFileName: false,
    });
  } catch {
    throw serviceUnavailable("We couldn't store the uploaded resume right now. Please try again.");
  }
  if (!uploaded?.fileId || !uploaded?.url || !isImageKitUrl(uploaded.url)) {
    throw serviceUnavailable("We couldn't store the uploaded resume right now. Please try again.");
  }
  return {
    resumeUrl: String(uploaded.url),
    resumeFileId: String(uploaded.fileId),
    resumeFileName: String(uploaded.name || fileName),
    resumeFileSize: Number(uploaded.size || buffer.byteLength),
    resumeMimeType: detected,
    imageKitFilePath: String(uploaded.filePath || `${folder}/${fileName}`),
  };
};

export const verifyResumeFileOnServer = async ({fileId, expectedFolder}) => {
  const ik = getClient();
  if (!fileId) throw badRequest("Resume file id is required.");
  if (!expectedFolder) {
    throw badRequest("Uploaded resume could not be verified.", {
      resume: "Please upload your resume again.",
    });
  }
  let details;
  try {
    if (typeof ik.files.get === "function") {
      details = await ik.files.get(fileId);
    } else if (typeof ik.getFileDetails === "function") {
      details = await ik.getFileDetails(fileId);
    } else if (ik.files && typeof ik.files.details === "function") {
      details = await ik.files.details(fileId);
    } else {
      throw new Error("unsupported");
    }
  } catch (error) {
    if (error?.status === 404 || error?.code === 404) throw badRequest("Uploaded resume could not be verified.");
    throw serviceUnavailable("Could not verify the uploaded resume right now.");
  }
  if (!details || !details.fileId) throw badRequest("Uploaded resume could not be verified.");
  const path = String(details.filePath || details.file_path || "");
  const folder = String(expectedFolder).replace(/\/+$/, "");
  // Strict, not advisory: a file outside the folder this request authorised is
  // either an old record or someone else's upload, and must never be attached.
  if (!path || (path !== folder && !path.startsWith(`${folder}/`))) {
    throw badRequest("Uploaded resume does not belong to this application.", {
      resume: "Please upload your resume again.",
    });
  }
  const mime = String(details.mime || details.mimeType || "");
  const name = String(details.name || path.split("/").pop() || "");
  const url = String(details.url || "");
  const declaredSize = Number(details.size || 0);
  if (!url || !isImageKitUrl(url)) throw badRequest("Uploaded resume URL is missing.");
  if (declaredSize > RESUME_MAX_BYTES) throw badRequest("Resume must be 5 MB or smaller.");

  // The URL came back from ImageKit for a file id looked up with our private
  // key, so it belongs to this account. Prefer a short-lived signed delivery
  // URL so private files can be verified too, and fall back to the URL from
  // the API response when the SDK has no signing helper.
  let verificationUrl = url;
  try {
    const signed = ik.helper?.buildSrc?.({
      src: path,
      urlEndpoint: env.IMAGEKIT_URL_ENDPOINT,
      signed: true,
      expiresIn: 60,
    });
    if (signed && isImageKitUrl(signed)) verificationUrl = signed;
  } catch {
    // Keep the API-provided URL.
  }

  // Fetch the real bytes and check the content: metadata alone is
  // attacker-controlled at direct-upload time.
  const buffer = await fetchFileBytes(verificationUrl);
  const validationError = validateResumeFile({
    buffer,
    mimetype: mime,
    size: buffer.byteLength,
    originalname: name,
  });
  if (validationError) throw badRequest(validationError, {resume: validationError});
  const detectedMime = detectResumeType(buffer);

  return {
    resumeUrl: url,
    resumeFileId: String(details.fileId),
    resumeFileName: name || "resume",
    resumeFileSize: buffer.byteLength,
    resumeMimeType: detectedMime,
    uploadedAt: details.createdAt ? new Date(details.createdAt) : new Date(),
    imageKitFilePath: path,
  };
};

export const deleteResumeFile = async (fileId) => {
  if (!fileId) return;
  const ik = getClient();
  try {
    if (typeof ik.files.delete === "function") await ik.files.delete(fileId);
    else if (typeof ik.deleteFile === "function") await ik.deleteFile(fileId);
  } catch {
    // best-effort cleanup
  }
};
