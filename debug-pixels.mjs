import { webkit } from 'playwright';
import zlib from 'node:zlib';

function decodePNG(buf) {
  const sig = '89504e470d0a1a0a';
  if (buf.subarray(0, 8).toString('hex') !== sig) throw new Error('not png');
  let off = 8;
  let width = 0, height = 0, colorType = 0, bitDepth = 0;
  const idat = [];
  let interlace = 0;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.subarray(off + 4, off + 8).toString('ascii');
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9]; interlace = data[12];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (interlace !== 0) throw new Error('interlace unsupported');
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const bpp = channels; // 8-bit
  const stride = width * bpp;
  const out = Buffer.alloc(height * stride);
  let p = 0;
  for (let y = 0; y < height; y++) {
    const ft = raw[p++];
    const lineStart = y * stride;
    const prevStart = lineStart - stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[lineStart + x - bpp] : 0;
      const b = y > 0 ? out[prevStart + x] : 0;
      const c = x >= bpp && y > 0 ? out[prevStart + x - bpp] : 0;
      let v = raw[p++];
      if (ft === 1) v = (v + a) & 255;
      else if (ft === 2) v = (v + b) & 255;
      else if (ft === 3) v = (v + ((a + b) >> 1)) & 255;
      else if (ft === 4) {
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        v = (v + pr) & 255;
      }
      out[lineStart + x] = v;
    }
  }
  return { width, height, channels, data: out };
}

function sampleRegion(img, x0, y0, x1, y1) {
  // average color of region, plus min/max luminance
  let r = 0, g = 0, b = 0, n = 0, minL = 256, maxL = -1;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * img.width + x) * img.channels;
      r += img.data[i]; g += img.data[i + 1]; b += img.data[i + 2];
      const l = 0.2126 * img.data[i] + 0.7152 * img.data[i + 1] + 0.0722 * img.data[i + 2];
      if (l < minL) minL = l;
      if (l > maxL) maxL = l;
      n++;
    }
  }
  return { avg: [Math.round(r / n), Math.round(g / n), Math.round(b / n)], lumMin: Math.round(minL), lumMax: Math.round(maxL), n };
}

const browser = await webkit.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

const shot = await page.locator('.spline-scene').screenshot();
const img = decodePNG(shot);
console.log('IFRAME SHOT', img.width, 'x', img.height);

// The iframe is 420x492. Sample horizontal bands at x in [0.55w..0.95w] (right side, where badge sits):
for (const band of [
  ['band y 420-432', 420, 432],
  ['band y 432-492', 432, 492],
  ['badge zone ~436-472', 436, 472],
]) {
  const s = sampleRegion(img, (img.width * 0.54) | 0, band[1], (img.width * 0.98) | 0, band[2]);
  console.log(band[0], JSON.stringify(s));
}

// Vertical content profile: for each 6px-high row, is there any bright (design) pixel in the right 45%?
const rightStart = (img.width * 0.55) | 0;
const rows = [];
for (let y = 300; y < img.height; y += 6) {
  let maxC = 0;
  for (let yy = y; yy < Math.min(y + 6, img.height); yy++) {
    for (let x = rightStart; x < img.width - 10; x++) {
      const i = (yy * img.width + x) * img.channels;
      const l = 0.2126 * img.data[i] + 0.7152 * img.data[i + 1] + 0.0722 * img.data[i + 2];
      if (l > maxC) maxC = l;
    }
  }
  rows.push({ y, maxL: Math.round(maxC) });
}
console.log('RIGHT-SIDE CONTENT PROFILE (max luminance per band, 300..492)');
console.log(JSON.stringify(rows));

// Full-width bottom profile: is there ANY design-bearing brightness in rows 400-492?
const rowsFull = [];
for (let y = 400; y < img.height; y += 2) {
  let maxL = 0;
  for (let yy = y; yy < Math.min(y + 2, img.height); yy++) {
    for (let x = 0; x < img.width - 1; x++) {
      const i = (yy * img.width + x) * img.channels;
      const l = 0.2126 * img.data[i] + 0.7152 * img.data[i + 1] + 0.0722 * img.data[i + 2];
      if (l > maxL) maxL = l;
    }
  }
  rowsFull.push({ y, maxL: Math.round(maxL) });
}
console.log('FULL-WIDTH BOTTOM PROFILE (400..492)');
console.log(JSON.stringify(rowsFull));
const rowsAll = [];
for (let y = 380; y < img.height; y += 4) {
  let maxL = 0;
  for (let yy = y; yy < Math.min(y + 4, img.height); yy++) {
    for (let x = (img.width * 0.30) | 0; x < (img.width * 0.70) | 0; x++) {
      const i = (yy * img.width + x) * img.channels;
      const l = 0.2126 * img.data[i] + 0.7152 * img.data[i + 1] + 0.0722 * img.data[i + 2];
      if (l > maxL) maxL = l;
    }
  }
  rowsAll.push({ y, maxL: Math.round(maxL) });
}
console.log('CENTER-CONTENT PROFILE (x 30-70%, 380..492)');
console.log(JSON.stringify(rowsAll));
await browser.close();