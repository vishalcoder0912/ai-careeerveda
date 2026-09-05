import fs from "fs";
import path from "path";

const files = [
  "src/data/blogPosts.js",
  "src/data/programCatalog.js",
  "src/data/alumniSpotlight.js",
  "src/data/pressArticles.js",
  "src/data/mentors.js",
  "src/data/siteData.js",
  "src/config/siteMeta.js",
  "src/config/pageMeta.js",
];

const urlRe = /https:\/\/ik\.imagekit\.io\/[^\s"'`)\]]+/g;
const all = new Map();
for (const f of files) {
  const txt = fs.readFileSync(path.resolve(f), "utf8");
  const found = txt.match(urlRe) || [];
  for (const m of found) all.set(m.replace(/[,\])}]+$/, ""), f);
}

const urls = [...all.keys()];
const CHUNK = 8;
const results = [];
let idx = 0;

async function worker() {
  while (idx < urls.length) {
    const u = urls[idx++];
    try {
      const res = await fetch(u, {method: "GET", headers: {"accept": "image/avif,image/webp,image/*,*/*"}, signal: AbortSignal.timeout(25000)});
      const ct = (res.headers.get("content-type") || "").split(";")[0];
      await res.body?.cancel?.().catch(() => {});
      results.push({url: u, status: res.status, ct});
    } catch (e) {
      results.push({url: u, status: "ERR", ct: e.name});
    }
  }
}

await Promise.all(Array.from({length: CHUNK}, worker));

const bad = results.filter((r) => r.status !== 200 && r.status !== 206);
const good = results.filter((r) => r.status === 200 || r.status === 206);
console.log(`good: ${good.length}/${results.length}`);
for (const r of bad) console.log(`${r.status}  ${r.ct}  ${r.url}`);
console.log("\nDistinct non-image responses among good:");
for (const r of good.filter((x) => !x.ct.startsWith("image/"))) console.log(`${r.status}  ${r.ct}  ${r.url}`);