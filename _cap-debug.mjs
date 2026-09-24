import {chromium} from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({width: 1920, height: 966});
await page.goto("http://localhost:4173/generative-ai", {waitUntil: "networkidle"});
await page.locator("#ga-projects").scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
await page.evaluate(() => {
  const s = document.querySelector("#ga-projects");
  window.scrollTo(0, s.offsetTop + 10);
});
await page.waitForTimeout(900);

const dump = await page.evaluate(() => {
  const stage = document.querySelector(".ga-gallery-stage");
  const cards = document.querySelector(".ga-gallery-cards");
  const pin = document.querySelector(".ga-gallery-pin");
  const section = document.querySelector("#ga-projects");
  const sr = stage.getBoundingClientRect();
  const pr = pin.getBoundingClientRect();
  const secRect = section.getBoundingClientRect();
  const active = [...document.querySelectorAll(".ga-gallery-card")].map((el) => {
    const r = el.getBoundingClientRect();
    return {
      st: el.dataset.state,
      w: r.width,
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
      inlineW: el.style.width,
      transform: el.style.transform,
      filter: el.style.filter,
      zi: el.style.zIndex,
    };
  });
  return {
    viewport: {w: innerWidth, h: innerHeight},
    stage: {cw: stage.clientWidth, ch: stage.clientHeight, rect: {x: sr.x, y: sr.y, w: sr.width, h: sr.height}},
    pin: {cw: pin.clientWidth, ch: pin.clientHeight, rect: {x: pr.x, y: pr.y, w: pr.width, h: pr.height}},
    section: {rect: {x: secRect.x, y: secRect.y, w: secRect.width, h: secRect.height},
      pinned: section.style.position, mt: section.style.marginTop},
    cardsTransform: cards.style.transform,
    bodyClass: document.body.className,
    scrollY,
    active,
  };
});
console.log(JSON.stringify(dump, null, 2));
await browser.close();