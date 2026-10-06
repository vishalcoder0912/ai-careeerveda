import {chromium} from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: 1440, height: 900}});
await page.goto("http://localhost:5173/programs/ai-systems-agentic-ai", {waitUntil: "domcontentloaded"}).catch(()=>{});
await page.waitForTimeout(5000);
// Walk every element, resolve the effective cursor at its own centre point
const out = await page.evaluate(() => {
  const hidden = [];
  document.querySelectorAll("*").forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.display === "none") return;
    if (cs.cursor === "none") hidden.push({ cls: (typeof el.className === "string" ? el.className.slice(0,70) : el.tagName), tag: el.tagName });
  });
  const styles = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    const walk = (list) => {
      for (const r of list) {
        if (r.cssRules) { walk(r.cssRules); continue; }
        if (!r.selectorText || !r.style) continue;
        if (r.style.cursor || /cursor/i.test(r.cssText)) styles.push({ sel: r.selectorText.slice(0,80), cursor: r.style.cursor, href: (sheet.href||"inline").split("/").pop() });
      }
    };
    try { walk(rules); } catch {}
  }
  const noneRules = styles.filter(s => s.cursor === "none");
  return { hiddenCount: hidden.length, hidden: hidden.slice(0,20), cursorRules: styles.length, noneRules };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
