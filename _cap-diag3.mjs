import {chromium} from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));
page.on("console", (m) => m.type() === "error" && errs.push(m.text()));

for (const vp of [
  {width: 1920, height: 966},
  {width: 1440, height: 900},
]) {
  await page.setViewportSize(vp);
  await page.goto("http://localhost:4173/generative-ai", {waitUntil: "networkidle"});
  await page.locator("#ga-projects").scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const s = document.querySelector("#ga-projects");
    window.scrollTo(0, s.offsetTop);
  });
  await page.waitForTimeout(2000);

  const out = await page.evaluate(() => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const cards = [...document.querySelectorAll(".ga-gallery-card")].map((el) => {
      const r = el.getBoundingClientRect();
      return {
        st: el.dataset.state,
        x: r.left + r.width / 2,
        y: r.top + r.height / 2,
        w: r.width,
        inline: el.style.width,
        z: el.style.zIndex,
      };
    });
    const nonBack = cards.filter((c) => c.st !== "back");
    const overlap = [];
    for (let i = 0; i < nonBack.length; i += 1) {
      for (let j = i + 1; j < nonBack.length; j += 1) {
        const a = nonBack[i];
        const b = nonBack[j];
        const aw = a.w * 0.62;
        const bw = b.w * 0.62;
        const ox = Math.min(a.x + aw / 2, b.x + bw / 2) - Math.max(a.x - aw / 2, b.x - bw / 2);
        const oy = Math.min(a.y + aw * 1.5 / 2, b.y + bw * 1.5 / 2) - Math.max(a.y - aw * 1.5 / 2, b.y - bw * 1.5 / 2);
        if (ox > 6 && oy > 6) overlap.push([nonBack.indexOf(a), nonBack.indexOf(b), Math.round(ox), Math.round(oy)]);
      }
    }
    const left = nonBack.filter((c) => c.x < W / 2).length;
    const right = nonBack.filter((c) => c.x > W / 2).length;
    return {
      W,
      H,
      cards,
      left,
      right,
      overlap,
      navBg: getComputedStyle(document.querySelector(".ga-nav")).backgroundColor,
      navBlur: getComputedStyle(document.querySelector(".ga-nav")).backdropFilter,
      ringOp: parseFloat(getComputedStyle(document.querySelector(".ga-gallery-ring--outer")).opacity),
      pinH: document.querySelector(".ga-gallery-pin").getBoundingClientRect().height,
      activeId: document.querySelector('.ga-gallery-card[data-state="active"] .ga-gallery-headline h3')?.textContent || "",
    };
  });

  console.log(`\n== ${vp.width}x${vp.height} — W=${out.W} H=${out.H} left=${out.left} right=${out.right} ringOp=${out.ringOp} nav=${out.navBg}${out.navBlur ? " blur" : ""} pinH=${out.pinH?.toFixed(0)} active="${out.activeId}"`);
  console.log(`  overlaps=${JSON.stringify(out.overlap)}`);
  for (const c of out.cards) {
    console.log(`  [${String(out.cards.indexOf(c)).padStart(2)}] ${c.st.padEnd(7)} cx=${c.x.toFixed(0).padStart(5)} cy=${c.y.toFixed(0).padStart(4)} w=${c.w.toFixed(0).padStart(4)} ${c.inline.padEnd(9)} zi=${c.z}`);
  }
}
console.log(`errors: ${errs.length ? errs.join(" | ") : "none"}`);
await browser.close();
