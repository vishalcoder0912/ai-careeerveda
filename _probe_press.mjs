import {chromium} from "playwright";

const BASE = "http://localhost:5173/";
const widths = [360, 390, 430, 480, 600, 720, 768, 1024, 1440];

const browser = await chromium.launch();
const page = await browser.newPage();

for (const w of widths) {
  await page.setViewportSize({width: w, height: 900});
  await page.goto(BASE, {waitUntil: "networkidle"});
  await page.waitForTimeout(700);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForSelector("#press", {timeout: 15000}).catch(() => {});
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelector("#press")?.scrollIntoView({behavior: "instant", block: "start"}));
  await page.waitForSelector(".press-card, .press-section", {timeout: 15000}).catch(() => {});
  await page.waitForTimeout(1000);

  const data = await page.evaluate(() => {
    const card = document.querySelector(".press-card");
    if (!card) return null;
    const head = document.querySelector(".press-card-head");
    const copy = document.querySelector(".press-card-copy");
    const h3 = card?.querySelector("h3");
    const excerpt = card?.querySelector(".press-excerpt");
    const statRow = card?.querySelector(".press-stat-row");
    const stats = [...(statRow?.querySelectorAll(".press-stat") || [])];
    const high = card?.querySelector(".press-highlights");
    const sources = card?.querySelector(".press-sources");
    const sourceChips = [...(sources?.querySelectorAll("a") || [])];
    const wallArea = document.querySelector(".press-card--wall");
    const wallGrid = wallArea?.querySelector(".press-wall-grid");

    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        fs: cs.fontSize,
        lh: cs.lineHeight,
        pad: cs.padding,
        maxw: cs.maxWidth,
        cols: cs.gridTemplateColumns?.split(" ").length,
      };
    };

    const statBoxes = stats.map((s) => {
      const r = s.getBoundingClientRect();
      return {x: Math.round(r.x), w: Math.round(r.width), h: Math.round(r.height)};
    });

    return {
      card: box(card),
      copy: box(copy),
      h3: box(h3),
      excerpt: box(excerpt),
      statRow: box(statRow),
      stats: statBoxes,
      high: box(high),
      sources: box(sources),
      sourceRows: sourceChips.map((c) => Math.round(c.getBoundingClientRect().y)),
      sourceRowsCount: new Set(sourceChips.map((c) => Math.round(c.getBoundingClientRect().y))).size,
      wall: box(wallGrid),
      overflowRight: wallArea
        ? Math.max(0, Math.round(wallGrid.getBoundingClientRect().right) - wallArea.getBoundingClientRect().right)
        : 0,
      bodyScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  if (!data) {
    console.log(`\n=== ${w}px ===   (no .press-card found)`);
    continue;
  }
  console.log(`\n=== ${w}px ===`);
  console.log(
    `  card w=${data.card.w} pad=${data.card.pad}  h3 fs=${data.h3.fs}  excerpt fs=${data.excerpt.fs} lh=${data.excerpt.lh}`
  );
  console.log(
    `  stats row w=${data.statRow.w} cols=${data.cols} | cells: ${data.stats.map((s) => `${s.w}px@x${s.x}`).join(" ")}`
  );
  console.log(`  highlights w=${data.high.w}  sources w=${data.sources.w} rows="${data.sourceRowsCount}"`);
  console.log(`  wall w=${data.wall?.w} overflowRight=${data.overflowRight}  bodyX=${data.bodyScroll}`);
}

await browser.close();
console.log("\ndone");