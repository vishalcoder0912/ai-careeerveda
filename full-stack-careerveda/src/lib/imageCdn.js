/* Every picture on the site is served from ImageKit, which resizes and re-encodes
   straight from the URL. The originals are what came out of the camera or the
   image generator — 1122x1402 PNGs, 163 KB JPEGs — and they were being sent at
   full size to fill thumbnails and avatars. A single page pulled close to a
   megabyte of images to paint a few hundred pixels of them.

   cdnImage() asks for the size actually rendered:
     w-<width>  the widest the element is ever drawn, times 2 for retina
     f-auto     WebP/AVIF for browsers that take it, original format for the rest
     q-80       the last quality step where the difference is still invisible

   Anything that is not an ImageKit URL passes through untouched, so a hardcoded
   local path or a third-party image still works. */

const IMAGEKIT_HOST = "ik.imagekit.io";

/* Host equality, not substring containment. "https://evil.example/ik.imagekit.io/x"
   contains the host name but is not served by it, and a substring test would
   have us rewrite a third-party URL into something that looks ImageKit-issued. */
const isImageKit = (url) => {
  if (typeof url !== "string") return false;
  try {
    return new URL(url).hostname === IMAGEKIT_HOST;
  } catch {
    // Relative path or malformed URL — a local asset, which passes through.
    return false;
  }
};

export const cdnImage = (url, width, {quality = 80} = {}) => {
  if (!url || !isImageKit(url)) return url;
  // The URL may already carry ?updatedAt=… , and ImageKit reads tr= from either
  // the query or the path, so append rather than assume we own the query string.
  if (/[?&]tr=/.test(url)) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}tr=w-${Math.round(width)},f-auto,q-${quality}`;
};

/* srcset for the same image at 1x and 2x, for elements whose CSS width is known.
   Lets a phone on a slow connection take the small one. */
export const cdnSrcSet = (url, width, options) => {
  if (!url || !isImageKit(url)) return undefined;
  return `${cdnImage(url, width, options)} 1x, ${cdnImage(url, width * 2, options)} 2x`;
};
