import {describe, it, expect} from "vitest";
import request from "supertest";

import {createApp} from "../src/app.js";
import {Media} from "../src/models/Media.js";
import {Program} from "../src/models/Program.js";
import {AuditLog, AUDIT_ACTIONS} from "../src/models/AuditLog.js";
import {ROLES} from "../src/config/permissions.js";
import {
  detectImageType,
  validateUpload,
  safeFileName,
  buildImageUrl,
  ALLOWED_FOLDERS,
} from "../src/services/imagekit.service.js";
import {createAdmin, login} from "./helpers/auth.js";

const app = createApp();

// Smallest valid headers for each format, enough for signature detection.
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(64, 1),
]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 2)]);
const GIF = Buffer.concat([Buffer.from("GIF89a"), Buffer.alloc(64, 3)]);
const WEBP = Buffer.concat([
  Buffer.from("RIFF"),
  Buffer.from([0x00, 0x00, 0x00, 0x00]),
  Buffer.from("WEBP"),
  Buffer.alloc(64, 4),
]);
// An SVG that would execute if we accepted it.
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
// A PHP payload wearing a .png name.
const PHP = Buffer.from('<?php system($_GET["c"]); ?>');

describe("file signature detection", () => {
  it("recognises the raster formats we accept", () => {
    expect(detectImageType(PNG)).toBe("image/png");
    expect(detectImageType(JPEG)).toBe("image/jpeg");
    expect(detectImageType(GIF)).toBe("image/gif");
    expect(detectImageType(WEBP)).toBe("image/webp");
  });

  it("refuses SVG, which can carry script and would be same-origin", () => {
    expect(detectImageType(SVG)).toBeNull();
  });

  it("refuses a payload regardless of its filename", () => {
    expect(detectImageType(PHP)).toBeNull();
  });

  it("refuses a file too short to have a signature", () => {
    expect(detectImageType(Buffer.from([0xff]))).toBeNull();
  });
});

describe("upload validation", () => {
  it("accepts a real image", () => {
    expect(validateUpload({buffer: PNG, size: PNG.length, mimetype: "image/png"})).toBeNull();
  });

  it("rejects a declared type that disagrees with the bytes", () => {
    const problem = validateUpload({buffer: PNG, size: PNG.length, mimetype: "image/jpeg"});
    expect(problem).toMatch(/do not match/i);
  });

  it("rejects a file over the size limit", () => {
    const problem = validateUpload({buffer: PNG, size: 20 * 1024 * 1024, mimetype: "image/png"});
    expect(problem).toMatch(/under/i);
  });

  it("rejects an empty upload", () => {
    expect(validateUpload({buffer: Buffer.alloc(0), size: 0})).toMatch(/no file/i);
  });

  it("rejects a PHP payload named as a png", () => {
    const problem = validateUpload({buffer: PHP, size: PHP.length, mimetype: "image/png"});
    expect(problem).toMatch(/not a supported image/i);
  });
});

describe("filename safety", () => {
  it("strips a path traversal attempt", () => {
    const name = safeFileName("../../../etc/passwd", "png");
    expect(name).not.toContain("/");
    expect(name).not.toContain("..");
    expect(name.endsWith(".png")).toBe(true);
  });

  it("strips a null byte and other unsafe characters", () => {
    const name = safeFileName("evil\u0000name;rm -rf.jpg", "jpg");
    expect(name).toMatch(/^[a-zA-Z0-9-_]+\.jpg$/);
  });

  it("produces different names for the same input", () => {
    expect(safeFileName("photo.png", "png")).not.toBe(safeFileName("photo.png", "png"));
  });

  it("falls back to a default for a name with nothing usable", () => {
    expect(safeFileName("///", "png")).toMatch(/^image-[a-f0-9]{8}\.png$/);
  });
});

describe("delivery URL transformations", () => {
  it("adds width, format and quality to an ImageKit URL", () => {
    const url = buildImageUrl("https://ik.imagekit.io/x/photo.png", {width: 400});
    expect(url).toContain("tr=w-400,f-auto,q-80");
  });

  it("leaves a non-ImageKit URL untouched", () => {
    const url = "https://example.com/photo.png";
    expect(buildImageUrl(url, {width: 400})).toBe(url);
  });

  it("does not double-apply an existing transformation", () => {
    const url = "https://ik.imagekit.io/x/photo.png?tr=w-100";
    expect(buildImageUrl(url, {width: 400})).toBe(url);
  });
});

describe("media authorization", () => {
  it("refuses an unauthenticated upload", async () => {
    const response = await request(app)
      .post("/api/v1/admin/media/upload")
      .attach("file", PNG, "photo.png");

    expect(response.status).toBe(401);
  });

  it("refuses a viewer, who lacks media.manage", async () => {
    await createAdmin({email: "viewer@careerveda.test", role: ROLES.VIEWER});
    const {accessToken} = await login(app, {email: "viewer@careerveda.test"});

    const response = await request(app)
      .get("/api/v1/admin/media")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(403);
  });

  it("refuses an unlisted upload folder", async () => {
    await createAdmin();
    const {accessToken} = await login(app);

    const response = await request(app)
      .post("/api/v1/admin/media/upload")
      .set("Authorization", `Bearer ${accessToken}`)
      .field("folder", "/etc")
      .attach("file", PNG, "photo.png");

    expect(response.status).toBe(400);
  });

  it("only allows folders from the fixed list", () => {
    expect(ALLOWED_FOLDERS.every((folder) => folder.startsWith("/careerveda"))).toBe(true);
  });
});

describe("deletion protection", () => {
  const seedMedia = (overrides = {}) =>
    Media.create({
      name: "Test image",
      fileName: "test-abc12345.png",
      url: "https://ik.imagekit.io/test/test-abc12345.png",
      fileId: `file-${Math.random().toString(36).slice(2)}`,
      folder: "/careerveda",
      mimeType: "image/png",
      extension: "png",
      size: 1024,
      ...overrides,
    });

  it("blocks deleting an image a program still uses", async () => {
    await createAdmin();
    const {accessToken} = await login(app);

    const media = await seedMedia();
    await Program.create({
      title: "Uses the image",
      slug: "uses-the-image",
      image: {url: media.url},
      status: "published",
      publishedAt: new Date(),
    });

    const response = await request(app)
      .delete(`/api/v1/admin/media/${media._id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CONFLICT");

    // Still there.
    expect(await Media.countDocuments({_id: media._id, deletedAt: null})).toBe(1);
  });

  it("allows deleting an unreferenced image and audits it", async () => {
    await createAdmin();
    const {accessToken} = await login(app);
    const media = await seedMedia();

    const response = await request(app)
      .delete(`/api/v1/admin/media/${media._id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);

    const stored = await Media.findById(media._id);
    expect(stored.deletedAt).not.toBeNull();

    const entry = await AuditLog.findOne({action: AUDIT_ACTIONS.MEDIA_DELETED});
    expect(entry).not.toBeNull();
  });

  it("reports which content references an image", async () => {
    await createAdmin();
    const {accessToken} = await login(app);
    const media = await seedMedia();

    await Program.create({
      title: "Referencing program",
      slug: "referencing-program",
      image: {url: media.url},
    });

    const response = await request(app)
      .get(`/api/v1/admin/media/${media._id}/references`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].label).toBe("Referencing program");
  });

  it("refuses a permanent delete before a soft delete", async () => {
    await createAdmin();
    const {accessToken} = await login(app);
    const media = await seedMedia();

    const response = await request(app)
      .delete(`/api/v1/admin/media/${media._id}/permanent`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(400);
  });

  it("refuses a permanent delete of an externally-hosted image", async () => {
    await createAdmin();
    const {accessToken} = await login(app);
    const media = await seedMedia({external: true, deletedAt: new Date()});

    const response = await request(app)
      .delete(`/api/v1/admin/media/${media._id}/permanent`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(400);
    expect(response.body.error.message).toMatch(/external/i);
  });

  it("refuses a permanent delete from an admin who is not super-admin", async () => {
    await createAdmin({email: "admin@careerveda.test", role: ROLES.ADMIN});
    const {accessToken} = await login(app, {email: "admin@careerveda.test"});
    const media = await seedMedia({deletedAt: new Date()});

    const response = await request(app)
      .delete(`/api/v1/admin/media/${media._id}/permanent`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(403);
  });
});

describe("metadata editing", () => {
  it("updates alt text and captions but not the URL or fileId", async () => {
    await createAdmin();
    const {accessToken} = await login(app);

    const media = await Media.create({
      name: "Original",
      fileName: "x.png",
      url: "https://ik.imagekit.io/test/x.png",
      fileId: "file-immutable",
      mimeType: "image/png",
    });

    const response = await request(app)
      .patch(`/api/v1/admin/media/${media._id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        alt: "A descriptive alt text",
        caption: "A caption",
        url: "https://evil.example.com/x.png",
        fileId: "hijacked",
      });

    expect(response.status).toBe(200);
    expect(response.body.data.alt).toBe("A descriptive alt text");
    // The identity of the stored object is not the admin's to rewrite.
    expect(response.body.data.url).toBe("https://ik.imagekit.io/test/x.png");
    expect(response.body.data.fileId).toBe("file-immutable");
  });

  it("strips HTML from alt text", async () => {
    await createAdmin();
    const {accessToken} = await login(app);
    const media = await Media.create({
      name: "X",
      fileName: "x.png",
      url: "https://ik.imagekit.io/test/x.png",
      fileId: "file-alt",
    });

    const response = await request(app)
      .patch(`/api/v1/admin/media/${media._id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({alt: '<img src=x onerror=alert(1)>caption'});

    expect(response.body.data.alt).not.toContain("<");
  });
});
