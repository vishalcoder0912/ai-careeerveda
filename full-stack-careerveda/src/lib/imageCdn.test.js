import {describe, expect, it} from "vitest";

import {cdnImage, cdnSrcSet} from "./imageCdn.js";

// The host check is the whole security surface here. Before, it was
// url.includes("ik.imagekit.io"), which is true of any URL that merely *mentions*
// the host — so a third-party image got our transform appended and came back
// looking like a managed asset. These pin the equality check that replaced it.

const REAL = "https://ik.imagekit.io/careerveda/programs/data.jpg";

describe("cdnImage host matching", () => {
  it("transforms a genuine ImageKit URL", () => {
    expect(cdnImage(REAL, 320)).toBe(`${REAL}?tr=w-320,f-auto,q-80`);
  });

  it("leaves a look-alike host untouched", () => {
    for (const imposter of [
      "https://evil.example/ik.imagekit.io/careerveda/a.jpg",
      "https://ik.imagekit.io.evil.example/careerveda/a.jpg",
      "https://evil.example/?next=https://ik.imagekit.io/careerveda/a.jpg",
    ]) {
      expect(cdnImage(imposter, 320)).toBe(imposter);
      expect(cdnSrcSet(imposter, 320)).toBeUndefined();
    }
  });

  it("passes local and malformed values through rather than throwing", () => {
    expect(cdnImage("/images/local.png", 320)).toBe("/images/local.png");
    expect(cdnImage("", 320)).toBe("");
    expect(cdnImage(null, 320)).toBeNull();
    expect(cdnImage(undefined, 320)).toBeUndefined();
    expect(cdnImage(42, 320)).toBe(42);
  });

  it("does not stack a second transform onto a URL that already has one", () => {
    const already = `${REAL}?tr=w-100`;
    expect(cdnImage(already, 320)).toBe(already);
  });

  it("appends to an existing query string instead of starting a new one", () => {
    expect(cdnImage(`${REAL}?updatedAt=1`, 320)).toBe(`${REAL}?updatedAt=1&tr=w-320,f-auto,q-80`);
  });

  it("builds a 1x/2x srcset for a real URL", () => {
    expect(cdnSrcSet(REAL, 320)).toBe(
      `${REAL}?tr=w-320,f-auto,q-80 1x, ${REAL}?tr=w-640,f-auto,q-80 2x`,
    );
  });
});
