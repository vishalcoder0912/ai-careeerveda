import {chromium} from "playwright";

const browser = await chromium.launch();
const context = await browser.newContext({viewport: {width: 1440, height: 900}});
const page = await context.newPage();

await page.goto("http://localhost:5173/", {waitUntil: "domcontentloaded"});
await page.waitForTimeout(1200);
for (let i = 0; i < 40; i++) {
  await page.mouse.wheel(0, 700);
  await page.waitForTimeout(100);
}
await page.waitForTimeout(1200);

const res = await page.evaluate(async () => {
  await new Promise((resolve) => {
    let tries = 0;
    const check = () => {
      const pending = Array.from(document.querySelectorAll("img")).filter((i) => i.src && !i.complete);
      if (pending.length === 0 || tries > 60) return resolve();
      tries += 1;
      setTimeout(check, 150);
    };
    check();
  });
  const logos = ["musigma", "tcs", "finbox"];
  const out = {};
  for (const slug of logos) {
    const imgs = Array.from(document.querySelectorAll(`img[src*="${slug}"]`));
    out[slug] = imgs.map((el) => {
      const u = new URL(el.currentSrc || el.src, location.href);
      return {file: u.pathname.split("/").pop(), ok: el.complete && el.naturalWidth > 0};
    });
  }
  const fallbacks = Array.from(document.querySelectorAll(".tc-card__fallback")).map((el) => el.textContent.trim());
  return {
    matches: Object.keys(out).reduce((a, k) => ((a[k] = out[k]), a), {}),
    textFallbacks: fallbacks,
    totalCards: document.querySelectorAll(".tc-card").length,
    totalImgs: document.querySelectorAll(".tc-card img").length,
  };
});

console.log(JSON.stringify(res, null, 2));
await browser.close();