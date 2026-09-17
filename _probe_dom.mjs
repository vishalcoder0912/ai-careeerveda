import {chromium} from "playwright";

const BASE = "http://localhost:5173/";

const run = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport: {width: 1440, height: 900}});
  await page.goto(BASE, {waitUntil: "domcontentloaded"}).catch(() => {});
  await page.waitForTimeout(3500);

  const pts = [
    [850, 763, "verified label center"],
    [850, 800, "just below verified"],
    [820, 720, "above-left of verified"],
    [1046, 491, "robot center"],
  ];
  for (const [x, y, name] of pts) {
    const els = await page.evaluate(({x, y}) => {
      return document.elementsFromPoint(x, y).slice(0, 8).map((el) => {
        const cs = getComputedStyle(el);
        return `<${el.tagName.toLowerCase()}.${(el.className || "").toString().slice(0, 40)}> bg=${cs.backgroundImage !== "none" ? "img" : cs.backgroundColor} r=${cs.borderRadius} z=${cs.zIndex}`;
      });
    }, {x, y});
    console.log(`\n(${x},${y}) ${name}:`);
    els.forEach((e) => console.log("  ", e));
  }
  await browser.close();
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
