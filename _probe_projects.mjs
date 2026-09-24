import {chromium} from "@playwright/test";

const browser = await chromium.launch({headless: true});
const page = await browser.newPage({viewport: {width: 1440, height: 900}});
await page.goto("http://localhost:5173/generative-ai", {waitUntil: "networkidle", timeout: 60000});
await page.waitForTimeout(1500);

console.log("pin:", await page.locator(".ga-projects-pin").count(), "grid:", await page.locator(".ga-projects-grid").count());

await page.locator("#ga-projects").scrollIntoViewIfNeeded();
await page.waitForTimeout(1200);

const data = await page.evaluate(() => {
  const stage = document.querySelector(".ga-projects-stage");
  const rings = document.querySelector(".ga-projects-orbits");
  const orbit = document.querySelector(".ga-projects-orbit");
  const center = document.querySelector(".ga-projects-center");
  const items = [...document.querySelectorAll(".ga-project-orbit-item")];
  const sr = stage?.getBoundingClientRect();
  const rr = rings?.getBoundingClientRect();
  const cr = center?.getBoundingClientRect();
  const cs = getComputedStyle(document.querySelector(".ga-project-orbit-item"));
  const cardCss = getComputedStyle(document.querySelector(".ga-project"));
  return {
    stage: sr && {w: Math.round(sr.width), h: Math.round(sr.height), top: Math.round(sr.top), left: Math.round(sr.left)},
    rings: rr && {w: Math.round(rr.width), h: Math.round(rr.height), cx: Math.round(rr.left + rr.width / 2), cy: Math.round(rr.top + rr.height / 2)},
    centerEl: cr && {w: Math.round(cr.width), h: Math.round(cr.height), cx: Math.round(cr.left + cr.width / 2), cy: Math.round(cr.top + cr.height / 2)},
    orbitTransform: orbit?.style.transform,
    itemTransition: cs.transition,
    cardTransition: cardCss.transition,
    itemTransitionDelay: cs.transitionDelay,
    items: items.map((el, i) => {
      const r = el.getBoundingClientRect();
      return {i, w: Math.round(r.width), h: Math.round(r.height), cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2), opacity: el.style.opacity, z: el.style.zIndex};
    }),
    caption: (() => {
      const cap = document.querySelector(".ga-projects-caption");
      const on = cap?.querySelector(".ga-project-caption-on");
      const all = [...(cap?.querySelectorAll(".ga-project-caption-frame") || [])].map(f => ({t: f.textContent, w: Math.round(f.getBoundingClientRect().width), left: Math.round(f.getBoundingClientRect().left), on: f.classList.contains("ga-project-caption-on")}));
      const c = cap?.getBoundingClientRect();
      return {w: Math.round(c?.width || 0), left: Math.round(c?.left || 0), right: Math.round(c?.right || 0), top: Math.round(c?.top || 0), h: Math.round(c?.height || 0), frames: all, shown: on?.textContent, overflow: all?.filter(f=>f.t.length>24).length};
    })(),
    overflowX: document.documentElement.scrollWidth - window.innerWidth,
  };
});
console.log(JSON.stringify(data, null, 2));

await page.waitForTimeout(400);
const s1 = await page.evaluate(() => document.querySelector(".ga-project-orbit-item").style.transform);
await page.waitForTimeout(600);
const s2 = await page.evaluate(() => document.querySelector(".ga-project-orbit-item").style.transform);
console.log("shake: no-scroll transform drift:", s1 !== s2);

await browser.close();