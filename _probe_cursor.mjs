import {chromium} from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: 1440, height: 900}});
await page.goto("http://localhost:5173/programs/ai-systems-agentic-ai", {waitUntil: "domcontentloaded"}).catch(()=>{});
await page.waitForTimeout(4500);
const out = await page.evaluate(() => {
  const miss = [];
  const sel = "main a, main button, main [role=button], main summary, main label, main input, main select, main textarea, main .pd-modcard, main .pd-cta-card, main .pd-gain, main .pd-job, main .pd-track, main .pd-outcome, main .pd-project, main .pd-milestone, main .pd-credential, main .pd-badge-provider";
  document.querySelectorAll(sel).forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    if (cs.cursor !== "pointer") miss.push({ tag: el.tagName, cls: (typeof el.className === "string" ? el.className.slice(0,50) : ""), cursor: cs.cursor, txt: (el.textContent||"").trim().slice(0,28) });
  });
  const agg = {};
  miss.forEach(m => { const k = m.cls || m.tag; agg[k] = (agg[k]||0)+1; });
  return { count: miss.length, byClass: agg, sample: miss.slice(0,25) };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
