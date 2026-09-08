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

const img = decodePNG(fs.readFileSync('shot-full.png'));
// Crop region around the bright pixels: x 1000-1270, y 640-730
const X0 = 1000, Y0 = 640, W = 270, H = 90;
const pad = Buffer.alloc((W * 2 + 2) * (H + 2));
pad.write('H' + `\0${W * 2}\0${H * 2}\08\0\0\0\0\0`);
let p = 8;
for (let y = 0; y < H + 2; y++) { pad.writeUInt8(0, p); p += 1 + W * 2; }
for (let y = 0; y < H + 2; y++) { pad.writeUInt8(0, p); p += 1 + W * 2; }
// filter bytes are written as part of rows above; assemble raw
const rows = [];
for (let y = Y0; y < Y0 + H; y++) {
  const row = Buffer.alloc(1 + W * 2 * 2);
  row[0] = 0;
  for (let x = X0; x < X0 + W; x++) {
    const i = (y * img.width + x) * img.channels;
    const idx = 1 + ((x - X0) * 2 * 2);
    // downscale 2x2 to keep texture on transparent bg: write rgb but make alpha=255 where dark-on-light not needed
    row[idx] = img.data[i];
    row[idx + 1] = img.data[i + 1];
    row[idx + 2] = img.data[i + 2];
    row[idx + 3] = 255;
    row[idx + 4] = img.data[i];
    row[idx + 5] = img.data[i + 1];
    row[idx + 6] = img.data[i + 2];
    row[idx + 7] = 255;
  }
  rows.push(row);
}
const raw = Buffer.concat(rows);
const stride = W * 2 * 2;
const out = Buffer.alloc(H * stride);
let q = 0;
for (let y = 0; y < H; y++) {
  const ft = raw[q++], ls = y * stride, ps = ls - stride;
  for (let x = 0; x < stride; x++) {
    const a = x >= 8 ? out[ls + x - 8] : 0, b = y > 0 ? out[ps + x] : 0, c = x >= 8 && y > 0 ? out[ps + x - 8] : 0;
    let v = raw[q++];
    if (ft === 4) {
      const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
      v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
    } else v = (v + a) & 255;
    out[ls + x] = v;
  }
}
function crc32(b) { let c = ~0; for (let i = 0; i < b.length; i++) { c ^= b[i]; for (let k = 0; k < 8; k++) c = c >>> 1 ? (c >>> 1) ^ 0xEDB88320 : c >>> 1; } return (c ^ ~0) >>> 0; }
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W * 2, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
const deflated = zlib.deflateSync(out);
fs.writeFileSync('crop.png', Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), chunk('IHDR', ihdr), chunk('IDAT', deflated), chunk('IEND', Buffer.alloc(0))]));
console.log('wrote crop.png', W * 2, H);