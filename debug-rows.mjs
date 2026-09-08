import { chromium } from 'playwright';
import zlib from 'node:zlib';
import fs from 'node:fs';

function decodePNG(buf) {
  let off = 8, width = 0, height = 0, colorType = 0, interlace = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.subarray(off + 4, off + 8).toString('ascii');
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); colorType = data[9]; interlace = data[12]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (interlace) throw new Error('interlace');
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const channels = colorType === 6 ? 4 : 3;
  const bpp = channels, stride = width * bpp;
  const out = Buffer.alloc(height * stride);
  let p = 0;
  for (let y = 0; y < height; y++) {
    const ft = raw[p++], ls = y * stride, ps = ls - stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[ls + x - bpp] : 0, b = y > 0 ? out[ps + x] : 0, c = x >= bpp && y > 0 ? out[ps + x - bpp] : 0;
      let v = raw[p++];
      if (ft === 1) v = (v + a) & 255;
      else if (ft === 2) v = (v + b) & 255;
      else if (ft === 3) v = (v + ((a + b) >> 1)) & 255;
      else if (ft === 4) {
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      }
      out[ls + x] = v;
    }
  }
  return { width, height, channels, data: out };
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

const info = await page.evaluate(() => {
  const scene = document.querySelector('.spline-scene');
  const r = scene.getBoundingClientRect();
  const hit = document.elementFromPoint(1190, 696);
  return { rect: `${r.x},${r.y},${r.width},${r.height}`, hitTag: hit?.tagName, hitClass: hit?.className?.toString?.().slice(0, 60) };
});
console.log('info', JSON.stringify(info));

const shot = await page.screenshot({ fullPage: true });
const img = decodePNG(shot);
const x0 = 1122, x1 = 1259;
console.log('shot size', img.width, img.height);
let last = 'row';
for (let y = 640; y <= 740; y++) {
  let max = 0, maxX = -1;
  for (let x = x0; x < x1; x++) {
    const i = (y * img.width + x) * img.channels;
    const l = 0.2126 * img.data[i] + 0.7152 * img.data[i + 1] + 0.0722 * img.data[i + 2];
    if (l > max) { max = l; maxX = x; }
  }
  const marker = max > 120 ? '  <== BRIGHT' : '';
  if (y % 4 === 0 || max > 120) console.log('row', y, 'maxL', Math.round(max), 'atX', maxX, marker);
}

// Save a crop for visual inspection
fs.writeFileSync('shot-full.png', shot);
await browser.close();