import {chromium} from "playwright";
const browser = await chromium.launch();
const url = "http://localhost:5173/programs/ai-systems-agentic-ai";
const audit = async (w, h, name) => {
  const page = await browser.newPage({viewport: {width: w, height: h}});
  await page.goto(url, {waitUntil: "domcontentloaded"}).catch(()=>{});
  await page.waitForTimeout(4500);
  const data = await page.evaluate(() => {
    const clipped = [], spill = [], grids = [];
    const desc = (el) => (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).slice(0,2).join(".") : el.tagName);
    document.querySelectorAll("main *").forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") return;
      if (cs.overflowX === "auto" || cs.overflowX === "scroll" || cs.overflow === "hidden") return;
      if (el.scrollWidth - el.clientWidth > 2 && el.clientWidth > 0) clipped.push({ el: desc(el), txt: (el.textContent||"").trim().slice(0,40), over: el.scrollWidth - el.clientWidth });
    });
    document.querySelectorAll("main *").forEach((el) => {
      const p = el.parentElement; if (!p) return;
      const cs = getComputedStyle(p); if (cs.display === "none") return;
      const r = el.getBoundingClientRect(), pr = p.getBoundingClientRect();
      if (!r.width || !pr.width) return;
      const pl = parseFloat(cs.paddingLeft), prr = parseFloat(cs.paddingRight);
      if (r.right > pr.right - prr + 2 && getComputedStyle(el).position !== "absolute") spill.push({ el: desc(el), over: Math.round(r.right - (pr.right - prr)), txt: (el.textContent||"").trim().slice(0,30) });
    });
    document.querySelectorAll("main *").forEach((g) => {
      const cs = getComputedStyle(g);
      if (!cs.display.includes("grid")) return;
      const kids = Array.from(g.children).filter(k => k.getBoundingClientRect().height > 0);
      if (kids.length < 2) return;
      const heights = new Set(kids.map(k => Math.round(k.getBoundingClientRect().height)));
      const tops = kids.map(k => Math.round(k.getBoundingClientRect().top));
      const rows = {};
      kids.forEach(k => { const t = Math.round(k.getBoundingClientRect().top); rows[t] = (rows[t]||0)+1; });
      const rowSizes = Object.values(rows);
      grids.push({ el: desc(g), cols: cs.gridTemplateColumns, kids: kids.length, heights: [...heights].slice(0,8), rowSizes, hasAlign: cs.alignItems, justify: cs.justifyItems });
    });
    return { clipped: clipped.slice(0,30), spill: spill.slice(0,30), grids: grids.slice(0,30) };
  });
  console.log("\n===== " + name + " =====");
  console.log("-- CLIPPED (scrollWidth > clientWidth):"); data.clipped.forEach(c => console.log("  ", c.el, "+" + c.over + "px", JSON.stringify(c.txt)));
  console.log("-- SPILL past parent padding:"); data.spill.forEach(c => console.log("  ", c.el, "+" + c.over + "px", JSON.stringify(c.txt)));
  console.log("-- GRIDS:"); data.grids.forEach(g => console.log("  ", g.el, "kids:" + g.kids, "align:" + g.hasAlign, "justify:" + g.justify, "rowSizes:" + JSON.stringify(g.rowSizes), "heights:" + JSON.stringify(g.heights), "cols:" + g.cols.slice(0,60)));
  await page.close();
};
await audit(1440, 900, "desktop 1440");
await audit(390, 844, "mobile 390");
await browser.close();
