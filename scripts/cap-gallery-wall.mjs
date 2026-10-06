import {chromium} from "playwright";

const VIEWPORTS = [
  {width: 1920, height: 966},
  {width: 1440, height: 900},
  {width: 1280, height: 800},
  {width: 1024, height: 768},
  {width: 768, height: 1024},
  {width: 390, height: 844},
  {width: 360, height: 800},
];

const results = [];
const res = [];
const ok = (n, c, x = "") => res.push(`${c ? "PASS" : "FAIL"} ${n}${x ? ` — ${x}` : ""}`);

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

const measure = (tag) =>
  page.evaluate((t) => {
    const stage = document.querySelector(".ga-gallery-stage");
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    const cards = [...document.querySelectorAll(".ga-gallery-card")].map((el) => {
      const r = el.getBoundingClientRect();
      return {
        st: el.dataset.state,
        x: r.left + r.width / 2,
        y: r.top + r.height / 2,
        w: r.width,
        inline: parseFloat(el.style.width) || 0,
        z: el.style.zIndex,
      };
    });
    const active = cards.filter((c) => c.st === "active");
    const activeIdx = new Set(active.map((c) => cards.indexOf(c)));
    const frontish = cards.filter((c) => c.st !== "back" && !activeIdx.has(cards.indexOf(c)));
    const overlap = [];
    for (let i = 0; i < frontish.length; i += 1) {
      for (let j = i + 1; j < frontish.length; j += 1) {
        const a = frontish[i];
        const b = frontish[j];
        const aw = a.w * 0.62;
        const bw = b.w * 0.62;
        const ox = Math.min(a.x + aw / 2, b.x + bw / 2) - Math.max(a.x - aw / 2, b.x - bw / 2);
        const oy = Math.min(a.y + aw * 1.4 / 2, b.y + bw * 1.4 / 2) - Math.max(a.y - aw * 1.4 / 2, b.y - bw * 1.4 / 2);
        if (ox > 16 && oy > 16) overlap.push([frontish.indexOf(a), frontish.indexOf(b), Math.round(ox), Math.round(oy)]);
      }
    }
    const leftN = frontish.filter((c) => c.x < W / 2).length;
    const rightN = frontish.filter((c) => c.x > W / 2).length;
    const warm = /rgba\(225, ?148|rgba\(240, ?169|rgba\(255, ?176/.test(
      getComputedStyle(document.querySelector(".ga-gallery-bg")).backgroundImage);
    const ringOp = parseFloat(getComputedStyle(document.querySelector(".ga-gallery-ring--outer")).opacity);
    const nav = document.querySelector(".ga-nav");
    const navBg = getComputedStyle(nav).backgroundColor;
    const navBlur = getComputedStyle(nav).backdropFilter || getComputedStyle(nav).webkitBackdropFilter || "";
    const pinH = document.querySelector(".ga-gallery-pin").getBoundingClientRect().height;
    const activeEl = document.querySelector('.ga-gallery-card[data-state="active"]');
    const desc = document.querySelector('[data-state="active"] .ga-gallery-screen-desc');
    const title = document.querySelector('[data-state="active"] .ga-gallery-headline h3');
    return {
      W, H, cards, active, frontish, overlap, leftN, rightN, warm, ringOp,
      navBg, navBlur, pinH,
      descFs: desc ? parseFloat(getComputedStyle(desc).fontSize) : 0,
      titleFs: title ? parseFloat(getComputedStyle(title).fontSize) : 0,
      activeInline: activeEl ? parseFloat(activeEl.style.width) || 0 : 0,
      activeW: activeEl ? activeEl.getBoundingClientRect().width : 0,
      activeX: activeEl ? activeEl.getBoundingClientRect().left + activeEl.getBoundingClientRect().width / 2 : 0,
      activeY: activeEl ? activeEl.getBoundingClientRect().top + activeEl.getBoundingClientRect().height / 2 : 0,
    };
  }, tag);

for (const vp of VIEWPORTS) {
  await page.setViewportSize(vp);
  await page.goto("http://localhost:4173/generative-ai", {waitUntil: "networkidle"});
  const isDesktop = vp.width >= 900;
  const tag = `${vp.width}x${vp.height}`;

  if (isDesktop) {
    await page.locator("#ga-projects").scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    // Deterministic pin head: section top exactly at viewport top (p≈0)
    await page.evaluate(() => {
      const s = document.querySelector("#ga-projects");
      window.scrollTo(0, s.offsetTop);
    });
    // Settle: two consecutive samples 600px apart that agree on ALL major
    // geometry (card centers/widths/inline, active center). The pin scrub
    // lerps with scrub:1.2 + a rAF loop, so wait until it truly rests.
    const settled = async () => {
      let a = await measure(tag);
      for (let k = 0; k < 5; k += 1) {
        await page.waitForTimeout(600);
        const b = await measure(tag);
        const same =
          a.cards.length === b.cards.length &&
          a.cards.every((c, i) =>
            Math.abs(c.x - b.cards[i].x) < 3 && Math.abs(c.y - b.cards[i].y) < 3 &&
            Math.abs(c.w - b.cards[i].w) < 3) &&
          a.active.length === 1 && b.active.length === 1 &&
          Math.abs(a.active[0]?.x - b.active[0]?.x) < 4 && Math.abs(a.active[0]?.y - b.active[0]?.y) < 4;
        if (same) return b;
        a = b;
      }
      return a;
    };
    const m = await settled();

    ok(`${tag} 8 cards`, m.cards.length === 8, `n=${m.cards.length}`);
    ok(`${tag} exactly one active`, m.active.length === 1, `n=${m.active.length} inline=${m.activeInline.toFixed(1)}`);
    ok(`${tag} hero big`, m.activeInline > 0 && m.activeInline / m.W >= 0.29 && m.activeInline / m.W <= 0.44,
      `inline=${m.activeInline.toFixed(0)} ratio=${(m.activeInline / m.W).toFixed(2)}`);
    ok(`${tag} hero centered`, Math.abs(m.activeX - m.W / 2) < m.W * 0.06 && Math.abs(m.activeY - m.H * 0.5) < m.H * 0.12,
      `cx=${m.activeX.toFixed(0)} cy=${m.activeY.toFixed(0)}`);
    const heroFs = {d: m.descFs, t: m.titleFs};
    ok(`${tag} hero text readable`, m.descFs >= 13.5 && m.titleFs >= 22, `desc=${m.descFs} title=${m.titleFs}`);
    ok(`${tag} warm center bg`, m.warm);
    ok(`${tag} floor ring subdued`, m.ringOp < 0.45, `op=${m.ringOp}`);
    ok(`${tag} nav dark while gallery`, m.navBg.startsWith("rgba(8,") && m.navBlur.includes("blur"), `bg=${m.navBg} blur=${m.navBlur}`);
    ok(`${tag} left >=3`, m.leftN >= 3, `left=${m.leftN}`);
    ok(`${tag} right >=3`, m.rightN >= 3, `right=${m.rightN}`);
    ok(`${tag} no overlaps (non-back)`, m.overlap.length === 0, JSON.stringify(m.overlap));
    ok(`${tag} pin ~ viewport tall`, m.pinH >= Math.min(vp.height - 2, 820), `pinH=${m.pinH.toFixed(0)}`);

    // Scrub mid-pin: a DIFFERENT project owns the center (spatial walk works)
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight * 6);
    });
    await page.waitForTimeout(1800);
    const after = await page.evaluate(() => {
      const a = document.querySelector('.ga-gallery-card[data-state="active"] .ga-gallery-headline h3');
      return a ? a.textContent : "";
    });
    ok(`${tag} scroll changes active`, after !== "Enterprise Knowledge Copilot", `id=${after}`);
  } else {
    // Mobile: static vertical list (pin hidden)
    await page.locator("#ga-projects").scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
    const m = await page.evaluate(() => {
      const pin = document.querySelector(".ga-gallery-pin");
      const rows = document.querySelectorAll(".ga-gallery-row");
      const hero = document.querySelector('.ga-gallery-row[data-state="active"] .ga-gallery-headline h3');
      const desc = document.querySelector('.ga-gallery-row[data-state="active"] .ga-gallery-screen-desc');
      const heroRow = document.querySelector('.ga-gallery-row[data-state="active"]');
      return {
        pinHidden: getComputedStyle(pin).display === "none",
        rows: rows.length,
        hero: hero ? hero.textContent : "",
        descFs: desc ? parseFloat(getComputedStyle(desc).fontSize) : 0,
        heroW: heroRow ? heroRow.getBoundingClientRect().width : 0,
        W: window.innerWidth,
      };
    });
    ok(`${tag} list shown / pin hidden`, m.pinHidden && m.rows >= 7, `rows=${m.rows}`);
    ok(`${tag} hero first on mobile`, m.hero === "Enterprise Knowledge Copilot", m.hero);
    ok(`${tag} mobile desc readable`, m.descFs >= 13.5, `fs=${m.descFs}`);
  }
}

ok("no console/page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
await browser.close();
console.log(res.join("\n"));
if (res.some((r) => r.startsWith("FAIL"))) process.exit(1);
