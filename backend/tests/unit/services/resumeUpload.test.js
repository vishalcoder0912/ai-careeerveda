import {afterEach, beforeEach, describe, expect, it, jest} from "@jest/globals";

// The service talks to ImageKit, so the SDK is replaced with a fake that returns
// whatever file details a case needs. unstable_mockModule must run before the
// service is imported (see tests/unit/README.md).
const filesGet = jest.fn();
const filesUpload = jest.fn();
const fetchMock = jest.fn();
const originalFetch = globalThis.fetch;

jest.unstable_mockModule("@imagekit/nodejs", async () => ({
  // Mirror the SDK: build a real File so tests can assert the MIME type the
  // service hands to ImageKit.
  toFile: jest.fn(async (bits, name, options) => new File(bits, name, options)),
  default: class FakeImageKit {
    getAuthenticationParameters() {
      return {token: "upload-token", expire: 1_700_000_000, signature: "upload-signature"};
    }

    files = {
      get: (...args) => filesGet(...args),
      upload: (...args) => filesUpload(...args),
    };
  },
}));

const {env} = await import("../../../src/config/env.js");
const {
  getResumeUploadAuth,
  verifyResumeUploadToken,
  verifyResumeFileOnServer,
  validateResumeFile,
  storeResumeFile,
  RESUME_FOLDER_ROOT,
  RESUME_UPLOAD_TOKEN_TTL_MS,
} = await import("../../../src/services/resumeUpload.service.js");

const JOB = "data-analyst";

const detail = (overrides = {}) => ({
  fileId: "file_123",
  filePath: `${RESUME_FOLDER_ROOT}/${JOB}/abcdef/file.pdf`,
  name: "resume.pdf",
  url: "https://ik.imagekit.io/careerveda/resume.pdf",
  mime: "application/pdf",
  size: 1024,
  ...overrides,
});

const bytesResponse = (bytes) => ({
  ok: true,
  headers: {get: (name) => (name.toLowerCase() === "content-length" ? String(bytes.length) : null)},
  arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
});

const asciiBytes = (text) => Uint8Array.from(Buffer.from(text, "utf8"));

beforeEach(() => {
  filesGet.mockReset();
  filesUpload.mockReset();
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
  env.imagekitConfigured = true;
  env.IMAGEKIT_PUBLIC_KEY = "public";
  env.IMAGEKIT_PRIVATE_KEY = "private";
  env.IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/careerveda";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  jest.useRealTimers();
});

describe("resume upload binding", () => {
  it("issues a fresh random folder per upload and a token naming it", () => {
    const first = getResumeUploadAuth({jobSlug: JOB});
    const second = getResumeUploadAuth({jobSlug: JOB});

    expect(first.folder).toMatch(new RegExp(`^${RESUME_FOLDER_ROOT}/${JOB}/[a-f0-9]{32}$`));
    expect(second.folder).not.toBe(first.folder);

    expect(verifyResumeUploadToken({token: first.uploadToken, jobSlug: JOB})).toMatchObject({
      folder: first.folder,
    });
  });

  it("refuses a token issued for a different job", () => {
    const auth = getResumeUploadAuth({jobSlug: JOB});

    expect(() => verifyResumeUploadToken({token: auth.uploadToken, jobSlug: "another-job"})).toThrow(
      /upload has expired/i,
    );
  });

  it("refuses a tampered token", () => {
    const auth = getResumeUploadAuth({jobSlug: JOB});
    const [payload, signature] = auth.uploadToken.split(".");
    // Flipping the last base64url character is not reliable: for a 32-byte
    // digest the final character carries only two significant bits, and Node
    // ignores the unused padding bits. Mutate a decoded byte instead so the
    // HMAC is always different.
    const bytes = Buffer.from(signature, "base64url");
    bytes[0] ^= 0x01;
    const tampered = `${payload}.${bytes.toString("base64url")}`;

    expect(() => verifyResumeUploadToken({token: tampered, jobSlug: JOB})).toThrow(/upload has expired/i);
  });

  it("refuses a token once its lifetime has passed", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const auth = getResumeUploadAuth({jobSlug: JOB});

    jest.setSystemTime(new Date(Date.now() + RESUME_UPLOAD_TOKEN_TTL_MS + 1));

    expect(() => verifyResumeUploadToken({token: auth.uploadToken, jobSlug: JOB})).toThrow(
      /upload has expired/i,
    );
  });

  it("requires a token at all", () => {
    expect(() => verifyResumeUploadToken({token: "", jobSlug: JOB})).toThrow(/upload has expired/i);
  });

  it("never hands ImageKit credential material to the browser", () => {
    const auth = getResumeUploadAuth({jobSlug: JOB});
    for (const key of ["token", "signature", "expire", "publicKey", "privateKey"]) {
      expect(auth).not.toHaveProperty(key);
    }
    expect(auth.uploadToken).toEqual(expect.any(String));
  });
});

describe("verifyResumeFileOnServer", () => {
  const folder = `${RESUME_FOLDER_ROOT}/${JOB}/abcdef`;

  it("accepts a file inside the folder the token authorised when its bytes are a real PDF", async () => {
    filesGet.mockResolvedValue(detail({filePath: `${folder}/resume.pdf`}));
    fetchMock.mockResolvedValue(bytesResponse(asciiBytes("%PDF-1.4\nreal pdf content")));

    await expect(verifyResumeFileOnServer({fileId: "file_123", expectedFolder: folder})).resolves.toMatchObject({
      resumeFileId: "file_123",
      imageKitFilePath: `${folder}/resume.pdf`,
      resumeMimeType: "application/pdf",
      resumeFileSize: 25,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://ik.imagekit.io/careerveda/resume.pdf",
      expect.objectContaining({signal: expect.any(AbortSignal)}),
    );
  });

  it("accepts a PDF that ImageKit labels with a generic MIME type", async () => {
    // The SDK used to upload without an explicit type, so stored files can
    // come back as octet-stream. The bytes still prove it is a PDF.
    filesGet.mockResolvedValue(detail({filePath: `${folder}/resume.pdf`, mime: "application/octet-stream"}));
    fetchMock.mockResolvedValue(bytesResponse(asciiBytes("%PDF-1.7\n<svg> javascript:void(0)")));

    await expect(verifyResumeFileOnServer({fileId: "file_123", expectedFolder: folder})).resolves.toMatchObject({
      resumeMimeType: "application/pdf",
    });
  });

  it("accepts a docx whose bytes are an OOXML zip", async () => {
    // A complete OOXML package: a ZIP local header, the two entries Word always
    // writes, and the end-of-central-directory record at the tail.
    const zip = asciiBytes(
      "PK\x03\x04[Content_Types].xml word/document.xml rest of package PK\x05\x06",
    );
    filesGet.mockResolvedValue(
      detail({
        filePath: `${folder}/resume.docx`,
        name: "resume.docx",
        mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
    );
    fetchMock.mockResolvedValue(bytesResponse(zip));

    await expect(verifyResumeFileOnServer({fileId: "file_123", expectedFolder: folder})).resolves.toMatchObject({
      resumeMimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  });

  it("rejects a file from another candidate's folder", async () => {
    filesGet.mockResolvedValue(detail({filePath: `${RESUME_FOLDER_ROOT}/${JOB}/someone-else/file.pdf`}));

    await expect(verifyResumeFileOnServer({fileId: "file_123", expectedFolder: folder})).rejects.toMatchObject({
      status: 400,
      fields: {resume: expect.stringMatching(/upload your resume again/i)},
    });
  });

  it("rejects a sibling path that only shares the folder prefix", async () => {
    filesGet.mockResolvedValue(detail({filePath: `${folder}-evil/file.pdf`}));

    await expect(verifyResumeFileOnServer({fileId: "file_123", expectedFolder: folder})).rejects.toMatchObject({
      status: 400,
    });
  });

  it("refuses to verify without an expected folder", async () => {
    await expect(verifyResumeFileOnServer({fileId: "file_123"})).rejects.toMatchObject({status: 400});
    expect(filesGet).not.toHaveBeenCalled();
  });

  it("still enforces the 5 MB ceiling from ImageKit metadata", async () => {
    filesGet.mockResolvedValue(detail({filePath: `${folder}/resume.pdf`, size: 5 * 1024 * 1024 + 1}));

    await expect(verifyResumeFileOnServer({fileId: "file_123", expectedFolder: folder})).rejects.toMatchObject({
      status: 400,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a file whose bytes are not a resume even when metadata claims pdf", async () => {
    filesGet.mockResolvedValue(detail({filePath: `${folder}/resume.pdf`}));
    fetchMock.mockResolvedValue(bytesResponse(asciiBytes("<html><body>not a resume</body></html>")));

    await expect(verifyResumeFileOnServer({fileId: "file_123", expectedFolder: folder})).rejects.toMatchObject({
      status: 400,
      fields: {resume: expect.stringMatching(/only pdf and word/i)},
    });
  });

  it("rejects a MIME that does not match the real bytes", async () => {
    filesGet.mockResolvedValue(detail({filePath: `${folder}/resume.doc`, name: "resume.doc", mime: "application/msword"}));
    fetchMock.mockResolvedValue(bytesResponse(asciiBytes("%PDF-1.4\nreal pdf content")));

    await expect(verifyResumeFileOnServer({fileId: "file_123", expectedFolder: folder})).rejects.toMatchObject({
      status: 400,
      fields: {resume: expect.stringMatching(/contents do not match/i)},
    });
  });

  it("rejects an extension that does not match the real bytes", async () => {
    filesGet.mockResolvedValue(detail({filePath: `${folder}/resume.exe`, name: "resume.exe"}));
    fetchMock.mockResolvedValue(bytesResponse(asciiBytes("%PDF-1.4\nreal pdf content")));

    await expect(verifyResumeFileOnServer({fileId: "file_123", expectedFolder: folder})).rejects.toMatchObject({
      status: 400,
      fields: {resume: expect.stringMatching(/extension must be/i)},
    });
  });

  it("rejects more than 5 MB of actual bytes even if metadata understates the size", async () => {
    const oversized = new Uint8Array(5 * 1024 * 1024 + 1);
    oversized.set(asciiBytes("%PDF-1.4\n"));
    filesGet.mockResolvedValue(detail({filePath: `${folder}/resume.pdf`, size: 10}));
    fetchMock.mockResolvedValue(bytesResponse(oversized));

    await expect(verifyResumeFileOnServer({fileId: "file_123", expectedFolder: folder})).rejects.toMatchObject({
      status: 400,
      fields: {resume: expect.stringMatching(/5 MB/i)},
    });
  });

  it("will not fetch a delivery URL off our ImageKit host", async () => {
    filesGet.mockResolvedValue(detail({url: "https://evil.example/resume.pdf"}));

    await expect(verifyResumeFileOnServer({fileId: "file_123", expectedFolder: folder})).rejects.toMatchObject({
      status: 400,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("validateResumeFile", () => {
  const check = (bytes, overrides = {}) =>
    validateResumeFile({
      buffer: bytes,
      mimetype: "application/pdf",
      size: bytes.byteLength,
      originalname: "resume.pdf",
      ...overrides,
    });

  it("accepts a real PDF with matching metadata", () => {
    expect(check(asciiBytes("%PDF-1.7\nreal resume"))).toBeNull();
  });

  it("rejects a ZIP that is not a Word document", () => {
    expect(
      check(asciiBytes("PK\x03\x04random archive"), {
        mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        originalname: "resume.docx",
      }),
    ).toMatch(/only pdf and word/i);
  });

  it("accepts a real PDF whose metadata mentions svg or javascript links", () => {
    // Those strings appear in ordinary XMP metadata, vector art and link
    // annotations. They are inert when the file is served as a PDF.
    const bytes = asciiBytes("%PDF-1.7\n<svg xmlns='http://www.w3.org/2000/svg'> javascript:void(0) data:text/html");
    expect(check(bytes)).toBeNull();
  });

  it("rejects an HTML/SVG file disguised as a PDF", () => {
    // Polyglots are caught by the signature check: it has no %PDF header.
    expect(check(asciiBytes("<!doctype html><svg onload='alert(1)'></svg>"))).toMatch(/only pdf and word/i);
  });

  it("accepts generic and legacy declared MIME types for a valid PDF", () => {
    const bytes = asciiBytes("%PDF-1.4\nreal resume");
    expect(check(bytes, {mimetype: "application/octet-stream"})).toBeNull();
    expect(check(bytes, {mimetype: "application/x-pdf"})).toBeNull();
  });

  it("accepts a PDF with a leading BOM and whitespace", () => {
    const bytes = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf, 0x0a]), asciiBytes("%PDF-1.4\nreal")]);
    expect(check(bytes)).toBeNull();
  });

  it("binds the extension to the detected content, not the declared name", () => {
    expect(check(asciiBytes("%PDF-1.4\nreal"), {originalname: "resume.exe"})).toMatch(/extension must be/i);
  });

  it("rejects a declared type that disagrees with the bytes", () => {
    expect(check(asciiBytes("%PDF-1.4\nreal"), {mimetype: "application/msword"})).toMatch(
      /contents do not match/i,
    );
  });

  it("rejects files larger than 5 MB", () => {
    const oversized = new Uint8Array(5 * 1024 * 1024 + 1);
    oversized.set(asciiBytes("%PDF-1.4\n"));
    expect(check(oversized)).toMatch(/5 MB/i);
  });
});

describe("storeResumeFile", () => {
  const folder = `${RESUME_FOLDER_ROOT}/${JOB}/abcdef`;
  const pdf = () => ({
    buffer: Buffer.from("%PDF-1.4\nreal resume content"),
    mimetype: "application/pdf",
    originalname: "My Resume.pdf",
    folder,
  });

  const stored = (overrides = {}) => ({
    fileId: "file_new",
    url: "https://ik.imagekit.io/careerveda/my-resume.pdf",
    name: "my-resume.pdf",
    size: 42,
    filePath: `${folder}/my-resume.pdf`,
    ...overrides,
  });

  it("checks the bytes itself before uploading and returns safe metadata", async () => {
    filesUpload.mockResolvedValue(stored());

    await expect(storeResumeFile(pdf())).resolves.toMatchObject({
      resumeFileId: "file_new",
      resumeFileName: "my-resume.pdf",
      resumeMimeType: "application/pdf",
      imageKitFilePath: `${folder}/my-resume.pdf`,
    });
    expect(filesUpload).toHaveBeenCalledWith(
      expect.objectContaining({folder, fileName: expect.stringMatching(/\.pdf$/)}),
    );
  });

  it("uploads a real PDF even when its metadata contains svg/script strings", async () => {
    filesUpload.mockResolvedValue(stored());
    await expect(
      storeResumeFile({
        ...pdf(),
        buffer: Buffer.from("%PDF-1.4\n<svg> javascript:void(0)"),
      }),
    ).resolves.toMatchObject({resumeMimeType: "application/pdf"});
    expect(filesUpload).toHaveBeenCalledWith(
      expect.objectContaining({file: expect.any(File)}),
    );
  });

  it("passes the detected MIME type to ImageKit so PDFs survive re-checking", async () => {
    filesUpload.mockResolvedValue(stored());
    await storeResumeFile(pdf());
    const file = filesUpload.mock.calls[0][0].file;
    expect(file.type).toBe("application/pdf");
  });

  it("does not upload a renamed executable", async () => {
    await expect(storeResumeFile({...pdf(), originalname: "resume.exe"})).rejects.toMatchObject({status: 400});
    expect(filesUpload).not.toHaveBeenCalled();
  });

  it("does not upload non-resume bytes", async () => {
    await expect(
      storeResumeFile({...pdf(), buffer: Buffer.from("<html>not a resume</html>")}),
    ).rejects.toMatchObject({status: 400});
    expect(filesUpload).not.toHaveBeenCalled();
  });

  it("refuses a destination outside the resume folder root", async () => {
    await expect(storeResumeFile({...pdf(), folder: "/anything-else"})).rejects.toMatchObject({status: 400});
    expect(filesUpload).not.toHaveBeenCalled();
  });

  it("rejects an upload whose delivery URL is off our ImageKit host", async () => {
    filesUpload.mockResolvedValue(stored({url: "https://evil.example/resume.pdf"}));
    await expect(storeResumeFile(pdf())).rejects.toMatchObject({status: 503});
  });
});
