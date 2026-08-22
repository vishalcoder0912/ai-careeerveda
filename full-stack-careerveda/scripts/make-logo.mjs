// Renders the CareerVeda wordmark to public/brand/careerveda-logo.png.
//
//   npm run logo
//
// The logo is pure type, so it is drawn by the browser's own text engine rather
// than an image editor: the colours are the exact brand hexes, the typeface is
// the same Manrope the site already ships, and re-running this after a palette
// change regenerates the asset instead of leaving a PNG nobody can edit.
//
// The fonts are inlined as data URIs so this needs no server and no build — it
// reads the woff2 files straight out of public/fonts and hands them to the page.
//
// Rendered at 3x and exported with a transparent background, so the navbar and
// both footers can scale it down freely and it stays sharp on a retina display.

import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public", "brand");
const OUT = path.join(OUT_DIR, "careerveda-logo.png");

// The mark is drawn at display sizes and exported at 2x. Rendering it larger and
// letting the browser shrink it only buys a file several times the size: the
// navbar shows it around 50px tall, so 2x of the design below already covers a
// retina display with room to spare.
const SCALE = 2;

// ── The brand, as data ───────────────────────────────────────────────────────
// Everything a redesign would touch lives here rather than inside the markup.
const BRAND = {
  career: "#F1F3F5",
  veda: {top: "#2FC8F5", middle: "#178DD2", bottom: "#0B5DAA"},
  tagline: "#F6A34B",
  taglineText: "Learn. Analyze. Lead.",
};

const fontDataUri = (file) => {
  const bytes = fs.readFileSync(path.join(ROOT, "public", "fonts", file));
  return `url(data:font/woff2;base64,${bytes.toString("base64")}) format('woff2')`;
};

const html = `<!doctype html>
<meta charset="utf-8">
<style>
  @font-face {
    font-family: 'Manrope';
    font-weight: 200 800;
    font-style: normal;
    src: ${fontDataUri("manrope-var-latin.woff2")};
  }
  @font-face {
    font-family: 'Inter';
    font-weight: 100 900;
    font-style: normal;
    src: ${fontDataUri("inter-var-latin.woff2")};
  }

  html, body { margin: 0; background: transparent; }

  .logo {
    display: inline-block;
    /* Room for the drop shadow to fall inside the exported bounds — without it
       the shadow is clipped at the element edge and the mark looks cut off. */
    padding: 8px 11px 9px;
    /* The shadow goes on the container, not on the text. A text-shadow under
       background-clip: text shows through the translucent glyph fill and muddies
       the gradient; a drop-shadow filter traces the rendered result instead. */
    filter: drop-shadow(0 2px 5px rgba(3, 12, 26, 0.55));
  }

  .wordmark {
    font-family: 'Manrope', sans-serif;
    font-weight: 800;
    font-size: 72px;
    line-height: 1;
    /* Slightly tight: at ExtraBold the default fit reads loose at display size. */
    letter-spacing: -0.02em;
    white-space: nowrap;
  }

  .career { color: ${BRAND.career}; }

  /* Vertical gradient across the glyphs themselves. background-clip: text is why
     the fill has to be transparent — the text becomes a window onto the gradient. */
  .veda {
    background-image: linear-gradient(
      180deg,
      ${BRAND.veda.top} 0%,
      ${BRAND.veda.middle} 50%,
      ${BRAND.veda.bottom} 100%
    );
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  .tagline {
    font-family: 'Inter', sans-serif;
    font-weight: 500;
    font-size: 16px;
    color: ${BRAND.tagline};
    letter-spacing: 0.22em;
    /* The wordmark's -0.02em tracking pulls its first glyph a hair left of the
       text origin; nudging the tagline by the same amount lines the two left
       edges up optically rather than only in the box model. */
    margin-left: -0.02em;
    margin-top: 10px;
    white-space: nowrap;
  }
</style>
<div class="logo">
  <div class="wordmark"><span class="career">Career</span><span class="veda">Veda</span></div>
  <div class="tagline">${BRAND.taglineText}</div>
</div>
`;

const browser = await chromium.launch();
const page = await browser.newPage({deviceScaleFactor: SCALE});
await page.setContent(html, {waitUntil: "load"});
// Serialised and run inside the browser, not here — declared for eslint, which
// lints this file as a node script and is right to flag it otherwise.
/* global document */
// Without this the screenshot can race the inlined @font-face and capture the
// fallback face instead of Manrope.
await page.evaluate(() => document.fonts.ready);

fs.mkdirSync(OUT_DIR, {recursive: true});
await page.locator(".logo").screenshot({path: OUT, omitBackground: true});

const {width, height} = await page.locator(".logo").boundingBox();
await browser.close();

const kb = (fs.statSync(OUT).size / 1024).toFixed(1);
console.log(
  `logo: ${Math.round(width)}x${Math.round(height)} css px at ${SCALE}x -> ${path.relative(ROOT, OUT)} (${kb} KB)`,
);
