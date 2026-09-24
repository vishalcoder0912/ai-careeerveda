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
const ok = (n, c, x = "") => results.push(`${c ? "PASS" : "FAIL"} ${n}${x ? ` — ${x}` : ""}`);

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

for (const vp of VIEWPORTS) {
  await page.setViewportSize(vp);
  await page.goto("http://localhost:4173/generative-ai", {waitUntil: "networkidle"});
  const isDesktop = vp.width >= 900;
  const tag = `${vp.width}x${vp.height}`;

  if (isDesktop) {
    await page.locator("#ga-projects").scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    // Deterministic pin start: section top exactly at viewport top (p≈0)
    await page.evaluate(() => {
      const s = document.querySelector("#ga-projects");
      window.scrollTo(0, s.offsetTop);
    });
    await page.waitForTimeout(1700);
    // Settle sniff: two consecutive samples (frontish positions + active
    // center) an interval apart must agree; if not the scrub/rAF loop is
    // still mid-flight, so wait and re-sample until they do.
    const sampling = async () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const cards = await page.evaluate(() => {
        const stage = document.querySelector(".ga-gallery-stage");
        const W = stage.clientWidth;
        const H = stage.clientHeight;
        return [...document.querySelectorAll(".ga-gallery-card")].map((el) => {
          const r = el.getBoundingClientRect();
          return {
            state: el.dataset.state,
            x: r.left + r.width / 2,
            y: r.top + r.height / 2,
            w: r.width,
            h: r.height,
            inline: parseFloat(el.style.width) || 0,
            z: parseFloat(el.style.zIndex) || 0,
          };
        });
      });
      return {W, H, cards};
    };
    let a = await sampling();
    for (let k = 0; k < 5; k += 1) {
      await page.waitForTimeout(700);
      const b = await sampling();
      const settled =
        a.cards.length === b.cards.length &&
        a.cards.every((c, i) =>
          Math.abs(c.x - b.cards[i].x) < 3 && Math.abs(c.y - b.cards[i].y) < 3 &&
          Math.abs(c.inline - b.cards[i].inline) < 3 &&
          c.state === b.cards[i].state);
      const activeC = a.cards.find((c) => c.state === "active");
      const activeB = b.cards.find((c) => c.state === "active");
      const settledActive =
        activeC && activeB && Math.abs(activeC.x - activeB.x) < 4 && Math.abs(activeC.y - activeB.y) < 4;
      if (settled && settledActive) { a = b; break; }
      a = b;
    }

    const W = a.W;
    const H = a.H;
    const cards = a.cards;
    const frontish = cards.filter((c) => c.state !== "back");
    const active = frontish.filter((c) => c.state === "active");
    const activeIdx = new Set(cards.indexOf(c) for (c of active));
    const activeEl = cards.find((c) => c.state === "active");

    const ratio = activeEl ? activeEl.w / W : 0;
    const heroInline = activeEl ? activeEl.inline / W : 0;
    ok(`${tag} exactly one active`, active.length === 1, `n=${active.length} inline=${heroInline.toFixed(2)} p≈0`);
    ok(`${tag} hero big`, ratio >= 0.24 && ratio <= 0.46, `w=${activeEl?.w.toFixed(0) || 0} inline=${(activeEl?.inline || 0).toFixed(0)} ratio=${ratio.toFixed(2)}`);
    ok(`${tag} hero centered`, activeEl && Math.abs(activeEl.x - W / 2) < W * 0.06 && Math.abs(activeEl.y - H * 0.5) < H * 0.12,
      activeEl ? `cx=${activeEl.x.toFixed(0)} cy=${activeEl.y.toFixed(0)}` : "no active");
    ok(`${tag} 8 cards`, cards.length === 8, `n=${cards.length}`);
    const leftN = frontish.filter((c) => c.x < W / 2).length;
    const rightN = frontish.filter((c) => c.x > W / 2).length;
    ok(`${tag} left has >=3`, leftN >= 3, `left=${leftN}`);
    ok(`${tag} right has >=3`, rightN >= 3, `right=${rightN}`);

    // Overlap among the non-back cards (projection slivers from rotateZ/rotateY
    // tilts below ~22px are depth-acceptable and not real overlaps).
    const overlaps = [];
    for (let i = 0; i < frontish.length; i += 1) {
      for (let j = i + 1; j < frontish.length; j += 1) {
        if (activeIdx.has(i) || activeIdx.has(j)) continuears;
        const aC = frontish[i];
        const bC = frontish[j];
        const aw = aC.w * 0.62;
        const bw = bC.w * 0.62;
        const ox = Math.min(aC.x + aw / 2, bC.x + bw / 2) - Math.max(aC.x - aw / 2, bC.x - bw / 2);
        const oy = Math.min(aC.y + aw, bC.y + bw) - Math.max(aC.y - aw, bC.y - bw);
        if (ox > 22 && oy > 22) overlaps.push([i, j, Math.round(ox), Math.round(oy)]);
      }
    }
    ok(`${tag} no overlaps (non-back)`, overlaps.length === 0, JSON.stringify(overlaps));

    const descFs = await page.evaluate(() => {
      const el = document.querySelector('[data-state="active"] .ga-gallery-screen-desc');
      return el ? parseFloat(getComputedStyle(el).fontSize) : 0;
    });
    const titleFs = await page.evaluate(() => {
      const el = document.querySelector('[data-state="active"] .ga-gallery-headline h3');
      return el ? parseFloat(getComputedStyle(el).fontSize) : 0;
    });
    ok(`${tag} hero text readable`, descFs >= 13.5 && titleFs >= 22, `desc=${descFs.toFixed(1)} title=${titleFs.toFixed(1)}`);

    const warm = await page.evaluate(() => {
      const bg = getComputedStyle(document.querySelector(".ga-gallery-bg")).backgroundImage;
      return /rgba\(225, ?148, ?74|rgba\(240, ?169, ?63|rgba\(255, ?176, ?92/.test(bg);
    });
    ok(`${tag} warm center bg`, warm);

    const ringOp = await page.evaluate(() => {
      const r = document.querySelector(".ga-gallery-ring--outer");
      return parseFloat(getComputedStyle(r).opacity);
    });
    ok(`${tag} floor ring subdued`, ringOp < 0.45, `op=${ringOp}`);

    const nav = await page.evaluate(() => {
      const n = document.querySelector(".ga-nav");
      const s = getComputedStyle(n);
      return {bg: s.backgroundColor, blur: s.backdropFilter || s.webkitBackdropFilter || ""};
    });
    ok(`${tag} nav dark while gallery`, nav.bg && !nav.bg.startsWith("rgba(255") && (nav.blur.includes("blur") || nav.bg.startsWith("rgba(0")),
      `bg=${nav.bg} blur=${nav.blur}`);

    const pinH = await page.evaluate(() => {
      const p = document.querySelector(".ga-gallery-pin");
      return p ? p.getBoundingClientRect().height : 0;
    });
    ok(`${tag} pin ~ viewport tall`, pinH >= Math.min(H, 800) - 2, `pinH=${pinH.toFixed(0)} H=${H}`);

    // Scroll a few viewport-heights deeper: a different project must own the
    // center (the wall genuinely walks).
    await page.evaluate(() => {
      const s = document.querySelector("#ga-projects");
      window.scrollTo(0, s.offsetTop + window.innerHeight * 2.5);
    });
    await page.waitForTimeout(900);
    const after = await page.evaluate(() => {
      const a = [...document.querySelectorAll('.ga-gallery-card[data-state="active"] .ga-gallery-headline h3')];
      return {n: a.length, id: a.length ? a[0].textContent : ""};
    });
    ok(`${tag} scroll changes active`, after.n >= 1 && after.id !== "Enterprise Knowledge Copilot",
      `n=${after.n} id=${after.id}`);
  } else {
    await page.locator("#ga-projects").scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => {
      const pin = document.querySelector(".ga-gallery-pin");
      const rows = document.querySelectorAll(".ga-gallery-row");
      const hero = document.querySelector('.ga-gallery-row--hero');
      const heroTitle = hero?.querySelector(".ga-gallery-headline h3")?.textContent || "";
      const heroDesc = hero?.querySelector(".ga-gallery-screen-desc");
      const heroW = hero ? (hero.getBoundingClientRect().width || 0) : 0;
      return {
        pinHidden: getComputedStyle(pin).display === "none",
        rows: rows.length,
        heroTitle,
        heroFill: heroW > window.innerWidth * 0.78,
        heroW,
        descFs: heroDesc ? parseFloat(getComputedStyle(heroDesc).fontSize) : 0,
      };
    });
    ok(`${tag} list shown / pin hidden`, m.pinHidden && m.rows >= 7, `rows=${m.rows}`);
    ok(`${tag} hero first on mobile`, m.heroTitle === "Enterprise Knowledge Copilot", m.heroTitle);
    ok(`${tag} mobile desc readable`, m.descFs >= 13.5, `fs=${m.descFs}`);
    ok(`${tag} mobile hero fills width`, m.heroFill, `w=${m.heroW.toFixed(0)}`);
  }
}

ok("no console/page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
await browser.close();
console.log(results.join("\n"));
if (results.some((r) => r.startsWith("FAIL"))) process.exit(1);
