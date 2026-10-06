import {chromium} from "playwright";

const run = async () => {
  const browser = await chromium.launch();
  for (const width of [1440, 1280]) {
    const page = await browser.newPage({viewport: {width, height: 900}});
    await page.goto("http://localhost:5173/", {waitUntil: "domcontentloaded"}).catch(() => {});
    await page.waitForTimeout(6000);
    const d = await page.evaluate(() => {
      const all = (sel) => Array.from(document.querySelectorAll(sel)).map((el) => {
        const b = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          top: Math.round(b.top), h: Math.round(b.height),
          padTop: cs.paddingTop, marginTop: cs.marginTop, transform: cs.transform,
          parent: el.parentElement ? el.parentElement.className : null,
        };
      });
      const nav = document.querySelector("header.site-nav");
      return {
        navBottom: nav ? Math.round(nav.getBoundingClientRect().bottom) : null,
        copies: all(".hero-copy"),
        eyebrows: all(".hero-copy .eyebrow"),
        heroShells: all(".hero-shell"),
      };
    });
    console.log(`\n===== ${width}px (settled 6s) =====  nav bottom: ${d.navBottom}`);
    console.log("  .hero-copy:"); d.copies.forEach((c, i) => console.log(`    [${i}]`, JSON.stringify(c)));
    console.log("  .hero-copy .eyebrow:"); d.eyebrows.forEach((c, i) => console.log(`    [${i}]`, JSON.stringify(c)));
    console.log("  .hero-shell:"); d.heroShells.forEach((c, i) => console.log(`    [${i}]`, JSON.stringify(c)));
    await page.close();
  }
  await browser.close();
};
run().catch((e) => { console.error(e); process.exit(1); });