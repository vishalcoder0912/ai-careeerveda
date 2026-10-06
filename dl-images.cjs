const fs = require("fs");
const path = require("path");

/*
 * Curated, topic-matched timeline imagery (Wikimedia Commons, exact titles).
 * Picked via targeted Commons searches for each curriculum phase:
 */
const PICKS = [
  {file: "tl-01.jpg", title: "File:Screen-python-code-matplotlib-physics-simulation.jpg"}, //  Engineering Foundations — python code on a monitor
  {file: "tl-02.jpg", title: "File:Concept of machine learning.png"},                       //  Data, ML & Deep Learning
  {file: "tl-03.jpg", title: "File:Smartphone with ChatGPT app and laptop (52917381683).jpg"}, // Generative AI & RAG — ChatGPT on laptop+phone
  {file: "tl-04.jpg", title: "File:Atlas connecting a hose.jpg"},                           //  Agent Engineering — agent using a tool (Atlas)
  {file: "tl-05.jpg", title: "File:Network cables and switch.jpg"},                          //  Multi-Agent & Interop — interlinked systems
  {file: "tl-06.jpg", title: "File:Data storage Centre, CERN.jpg"},                          //  Production AI — world-class compute
];

const OUT = path.join(__dirname, "public", "images", "timeline");
const USER_AGENT = "Hiraya-Alumni-Page/2.0 (curriculum timeline imagery; contact: hello@hiraya.dev)";
const THUMB_W = 1280;
const THUMB_H = 860;

async function get(url) {
  const res = await fetch(url, {headers: {"User-Agent": USER_AGENT}});
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res;
}

async function info(title) {
  const api =
    "https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo" +
    `&titles=${encodeURIComponent(title)}&iiprop=url|size|mime|extmetadata` +
    `&iiurlwidth=${THUMB_W}&iiurlheight=${THUMB_H}&format=json`;
  const j = await (await get(api)).json();
  const pages = Object.values(j?.query?.pages || {});
  return pages[0]?.imageinfo?.[0] || null;
}

(async () => {
  fs.mkdirSync(OUT, {recursive: true});
  let ok = 0;
  for (const item of PICKS) {
    const file = path.join(OUT, item.file);
    try {
      const ii = await info(item.title);
      if (!ii) throw new Error("not found");
      if (!/jpeg|png/.test(ii.mime)) throw new Error(`bad mime ${ii.mime}`);
      const buf = Buffer.from(await (await get(ii.thumburl)).arrayBuffer());
      fs.writeFileSync(file, buf);
      console.log(
        "OK", item.file, Math.round(buf.length / 1024) + "KB",
        `[${ii.width}x${ii.height}]`,
        "<-", item.title
      );
      ok++;
    } catch (e) {
      console.log("FAIL", item.file, e.message, "<-", item.title);
    }
  }
  console.log("done", ok + "/" + PICKS.length);
})();