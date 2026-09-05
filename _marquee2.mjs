import {chromium} from "playwright";

const browser = await chromium.launch();
const context = await browser.newContext({viewport: {width: 1440, height: 900}});
const page = await context.newPage();

const logs = [];
page.on("console", (m) => { if (m.type() === "error" && /image|load|net::|resource/i.test(m.text())) logs.push(m.text()); });

await page.goto("http://localhost:5173/", {waitUntil: "domcontentloaded"});
await page.waitForTimeout(1000);
for (let i = 0; i < 40; i++) {
  await page.mouse.wheel(0, 700);
  await page.waitForTimeout(100);
}

const snap = () =>
  page.evaluate(() => {
    const arr = [];
    for (const slug of ["finbox", "musigma", "tcs"]) {
      Array.from(document.querySelectorAll(`img[src*="/companies/${slug}."]`)).forEach((el) => {
        const u = new URL(el.currentSrc || el.src, location.href);
        const file = u.pathname.split("/").pop();
        arr.push({slug, file, ok: el.complete && el.naturalWidth > 0, complete: el.complete});
      });
    }
    return arr;
  });

for (let t = 0; t < 10; t++) {
  const s = await snap();
  const broken = s.filter((x) => !x.ok);
  console.log(`t=${t}s  states=${JSON.stringify(s)}  broken=${broken.length}`);
  if (broken.length === 0) break;
  await page.waitForTimeout(1000);
}

console.log("console errors:", logs.length ? logs.slice(0, 10) : "none");
await browser.close();