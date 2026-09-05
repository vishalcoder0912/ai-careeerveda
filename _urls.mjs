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
];

const urlRe = /https:\/\/ik\.imagekit\.io\/[^\s"'`)\]]+/g;
const all = new Map();

for (const f of files) {
  const txt = fs.readFileSync(path.resolve(f), "utf8");
  const found = txt.match(urlRe) || [];
  for (const m of found) {
    const clean = m.replace(/[,\])}]+$/, "");
    if (!all.has(clean)) all.set(clean, f);
  }
}

const urls = [...all.keys()];
console.log("unique imagekit URLs in data:", urls.length);
urls.forEach((u, i) => console.log(`${i}. ${u}`));