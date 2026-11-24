// Writes the ads.txt Google requires at https://careerveda.in/ads.txt.
//
// The file MUST contain the real publisher ID from the AdSense account. A
// guessed or placeholder ID is worse than no file: Google treats a wrong
// ads.txt as a claim by an unauthorised seller. So when no ID is configured we
// deliberately write nothing and say why, instead of shipping a fake.
//
// The same VITE_ADSENSE_CLIENT_ID is baked into the browser bundle by Vite and
// read here by Node at build time — one value to configure, two outputs.

import fs from "node:fs";
import path from "node:path";

const id = (process.env.VITE_ADSENSE_CLIENT_ID || "").trim();
const target = path.resolve(process.cwd(), "dist", "ads.txt");

if (!id) {
  console.log("ads.txt: no VITE_ADSENSE_CLIENT_ID set; skipping (no placeholder written)");
  process.exit(0);
}

if (!/^pub-\d+$/.test(id)) {
  console.error(`ads.txt: VITE_ADSENSE_CLIENT_ID must look like pub-1234567890123456, got "${id}"`);
  process.exit(1);
}

const line = `google.com, ${id}, DIRECT, f08c47fec0942fa0\n`;
fs.mkdirSync(path.dirname(target), {recursive: true});
fs.writeFileSync(target, line, "utf8");
console.log(`ads.txt: wrote ${line.trim()}`);
