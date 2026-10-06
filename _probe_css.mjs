import {chromium} from "playwright";

const run = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport: {width: 1440, height: 900}});
  await page.goto("http://localhost:5173/", {waitUntil: "domcontentloaded"}).catch(() => {});
  await page.waitForTimeout(6000);

  const out = await page.evaluate(() => {
    const el = document.querySelector(".hero-copy");
    const hits = [];
    for (const sheet of Array.from(document.styleSheets)) {
      let rules;
      try { rules = sheet.href ? Array.from(sheet.cssRules) : sheet.cssRules; } catch { continue; }
      const walk = (list, media) => {
        for (const r of Array.from(list || [])) {
          if (r.cssRules) { walk(r.cssRules, r.conditionText || media); continue; }
          if (!r.selectorText || !r.style) continue;
          const pt = r.style.getPropertyValue("padding-top");
          if (!pt) continue;
          let matches = false;
          try { matches = el.matches(r.selectorText); } catch {}
          if (!matches) continue;
          if (!/hero|eyebrow|nav/i.test(r.selectorText)) continue;
          hits.push({
            sel: r.selectorText,
            paddingTop: pt,
            media: media || null,
            href: sheet.href ? sheet.href.split("/").pop() : "inline",
          });
        }
      };
      walk(rules, null);
    }
    return hits;
  });

  out.forEach((h) => console.log(JSON.stringify(h)));
  await browser.close();
};
run().catch((e) => { console.error(e); process.exit(1); });