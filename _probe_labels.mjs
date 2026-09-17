import {chromium} from "playwright";

const BASE = "http://localhost:5173/";

const run = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport: {width: 1440, height: 900}});

  for (const w of [1920, 1440, 1200, 1100, 1024]) {
    await page.setViewportSize({width: w, height: 900});
    await page.goto(BASE, {waitUntil: "domcontentloaded"}).catch(() => {});
    await page.waitForTimeout(1200);
    const d = await page.evaluate(() => {
      const stage = document.querySelector(".hero-spline-stage");
      const sr = stage ? stage.getBoundingClientRect() : null;
      const labels = [...document.querySelectorAll(".floating-labels .ai-label")].map((el) => {
        const b = el.getBoundingClientRect();
        return {
          cls: el.className.replace("ai-label ", ""),
          text: el.textContent,
          left: Math.round(b.left),
          top: Math.round(b.top),
          right: Math.round(b.right),
          bottom: Math.round(b.bottom),
          w: Math.round(b.width),
          visible: b.width > 0 && b.height > 0,
        };
      });
      return {
        labelsWrapVisible: (() => {
          const fl = document.querySelector(".floating-labels");
          return fl ? getComputedStyle(fl).display !== "none" : false;
        })(),
        stage: sr ? {left: Math.round(sr.left), right: Math.round(sr.right), w: Math.round(sr.width)} : null,
        labels,
        ov: document.documentElement.scrollWidth - window.innerWidth,
      };
    });
    const offscreen = d.labels.filter((l) => l.left < 0 || l.right > w).map((l) => l.cls);
    console.log(`\n=== ${w} ov=${d.ov} ringVisible=${d.labelsWrapVisible} shown=${d.labels.filter((l) => l.visible).length}/${d.labels.length} offscreen=[${offscreen.join(",")}] ===`);
    d.labels.forEach((l) => console.log(`  ${l.visible ? " " : "x"} ${l.cls.padEnd(18)} "${l.text}"  x=[${l.left}..${l.right}] y=[${l.top}..${l.bottom}] w=${l.w}`));
  }

  await browser.close();
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
