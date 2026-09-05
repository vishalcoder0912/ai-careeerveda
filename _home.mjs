import {chromium} from "playwright";

const BASE = "http://localhost:5173";
const browser = await chromium.launch();
const context = await browser.newContext({viewport: {width: 1440, height: 900}});
const page = await context.newPage();

const failedImgs = [];
const badRequests = new Set();

page.on("response", (resp) => {
  if (resp.status() >= 400 && /\.(png|jpe?g|gif|webp|svg|avif|ico)(\?|$)/i.test(resp.url())) badRequests.add(`${resp.url()} [${resp.status()}]`);
});
page.on("requestfailed", (req) => {
  if (/\.(png|jpe?g|gif|webp|svg|avif|ico)(\?|$)/i.test(req.url())) badRequests.add(`${req.url()} [failed ${req.failure()?.errorText || ""}]`);
});

await page.goto(BASE + "/", {waitUntil: "domcontentloaded"});
await page.waitForTimeout(1500);

// Real user scroll: wheel events (Lenis consumes these).
for (let i = 0; i < 60; i++) {
  await page.mouse.wheel(0, 700);
  await page.waitForTimeout(120);
}
await page.waitForTimeout(1500);

// Also make sure we reached the bottom.
const result = await page.evaluate(async () => {
  const imgs = Array.from(document.querySelectorAll("img"));
  // Wait for all currently-mounted images to finish.
  await new Promise((resolve) => {
    let tries = 0;
    const check = () => {
      const pending = Array.from(document.querySelectorAll("img")).filter((i) => i.src && !i.complete && !i.loading);
      if (pending.length === 0 || tries > 60) return resolve();
      tries += 1;
      setTimeout(check, 150);
    };
    check();
  });
  return {
    scrollY: window.scrollY,
    bodyH: document.body.scrollHeight,
    imgCount: imgs.length,
    broken: Array.from(document.querySelectorAll("img"))
      .map((el) => ({src: el.currentSrc || el.src, bad: el.complete && el.naturalWidth === 0, cls: (el.className || "").toString().slice(0, 60)}))
      .filter((x) => x.bad),
    samples: Array.from(document.querySelectorAll("img")).slice(0, 8).map((el) => (el.currentSrc || el.src).replace(/^.*\/([^/?]+)\?.*$/, "$1")),
    sections: {
      companies: !!document.querySelector(".trusted-companies"),
      press: !!document.querySelector(".press-section, [class*=press]"),
      programs: !!document.querySelector("[class*=program-card], [class*=ProgramCard]"),
    },
  };
});

console.log(JSON.stringify(result, null, 2));
console.log("badRequests:", badRequests.size ? Array.from(badRequests).join("\n") : "none");

await browser.close();