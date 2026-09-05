import {chromium} from "playwright";

const browser = await chromium.launch();
const context = await browser.newContext({viewport: {width: 1440, height: 900}});
const page = await context.newPage();

await page.goto("http://localhost:5173/faculty", {waitUntil: "domcontentloaded"});
await page.waitForTimeout(1500);
for (let i = 0; i < 30; i++) {
  await page.mouse.wheel(0, 700);
  await page.waitForTimeout(100);
}
await page.waitForTimeout(2000);

const res = await page.evaluate(async () => {
  await new Promise((resolve) => {
    let tries = 0;
    const check = () => {
      const pending = Array.from(document.querySelectorAll("img")).filter((i) => i.src && !i.complete);
      if (pending.length === 0 || tries > 80) return resolve();
      tries += 1;
      setTimeout(check, 150);
    };
    check();
  });
  const imgs = Array.from(document.querySelectorAll("img")).map((el) => {
    const u = new URL(el.currentSrc || el.src, location.href);
    return {
      file: u.pathname.split("/").slice(-2).join("/"),
      ok: el.complete && el.naturalWidth > 0,
      broken: el.complete && el.naturalWidth === 0,
      cls: (el.className || "").toString().slice(0, 40),
    };
  });
  return {
    imgs,
    broken: imgs.filter((i) => i.broken),
    monograms: document.querySelectorAll("[class*=monogram], [class*=initials], [class*=avatar]").length,
    mentorCards: document.querySelectorAll("[class*=mentor-card], [class*=Mentor], [class*=faculty-card]").length,
  };
});

console.log(JSON.stringify(res, null, 2));
await browser.close();