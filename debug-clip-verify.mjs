import { webkit } from 'playwright';
import zlib from 'node:zlib';

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

async function maxLumInPage(img, pageY, pageX0, pageX1, height) {
  // pageY: viewport y is scrollY'ed — fullPage screenshot y coords start at doc top.
  let lumMax = 0;
  for (let y = pageY; y < Math.min(pageY + height, img.height); y++) {
    for (let x = pageX0; x < pageX1; x++) {
      const i = (y * img.width + x) * img.channels;
      if (i + 2 >= img.data.length) continue;
      const l = 0.2126 * img.data[i] + 0.7152 * img.data[i + 1] + 0.0722 * img.data[i + 2];
      if (l > lumMax) lumMax = l;
    }
  }
  return lumMax;
}

const browser = await webkit.launch();
const viewports = [
  { name: 'desktop-1440', w: 1440, h: 900 },
  { name: 'tablet-820', w: 820, h: 1180 },
  { name: 'mobile-390', w: 390, h: 844 },
];
for (const { name, w, h } of viewports) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  // Whem the hero sits below the fold (phone stacked layout) the scene is gated on
  // visibility + first gesture. Force a scroll + gesture to boot it like a user.
  await page.mouse.wheel(0, 300);
  await page.mouse.wheel(0, -300);
  try { await page.waitForSelector('.spline-scene', { timeout: 6000 }); } catch {}
  await page.waitForTimeout(1800);

  const geo = await page.evaluate(() => {
    const el = document.querySelector('.spline-scene');
    if (!el) return { booted: false };
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    // Badge sits 20px above the iframe's bottom edge, 20px from its right, 137x36.
    return {
      booted: true,
      top: r.top + window.scrollY,
      bottom: r.bottom + window.scrollY,
      right: r.right + window.scrollX,
      clip: cs.clipPath,
    };
  });
  if (!geo.booted) { console.log(`[${name}] scene did not boot`); await page.close(); continue; }
  const bx0 = Math.round(geo.right - 20 - 137);
  const bx1 = Math.round(geo.right - 20);
  const by0 = Math.round(geo.bottom - 20 - 36);
  const by1 = Math.round(geo.bottom - 20);
  const shot = await page.screenshot({ fullPage: true });
  const img = decodePNG(shot);
  const badgeMax = await maxLumInPage(img, by0, bx0, bx1, by1 - by0);
  // Control over the deep design band -- nothing there should be bright either, use a slightly higher band
  const designMax = await maxLumInPage(img, by0 - 90, bx0, bx1, 40);
  console.log(`[${name}]`, JSON.stringify({ ...geo, badgeRect: `(${bx0},${by0})..(${bx1},${by1})`, badgeMaxLum: Math.round(badgeMax), controlMaxLum: Math.round(designMax) }));
  await page.close();
}
await browser.close();