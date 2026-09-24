import {chromium} from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage();
for (const vp of [{width: 1920, height: 966}, {width: 1440, height: 900}]) {
  await page.setViewportSize(vp);
  await page.goto("http://localhost:4173/generative-ai", {waitUntil: "networkidle"});
  await page.locator("#ga-projects").scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const s = document.querySelector("#ga-projects");
    window.scrollTo(0, s.offsetTop);
  });
  await page.waitForTimeout(1600);
  const out = await page.evaluate(() => {
    const W = innerWidth;
    const out = [];
    document.querySelectorAll(".ga-gallery-card").forEach((el) => {
      const r = el.getBoundingClientRect();
      const inner = el.querySelector(".ga-gallery-card-inner");
      const ir = inner ? inner.getBoundingClientRect() : null;
      out.push({
        st: el.dataset.state,
        wrap: {x: r.x, w: r.width, cx: r.left + r.width / 2, cy: r.top + r.height / 2},
        inlineW: el.style.width,
        innerR: ir ? {x: ir.x, w: ir.width, h: ir.height} : null,
        t: el.style.transform.split(" ").slice(2, 5).join(" "),
      });
    });
    return {W, out};
  });
  console.log(JSON.stringify(out, null, 2));
  console.log("──");
}
await browser.close();