import {chromium} from "playwright";

const BASE = "http://localhost:5173/";

const run = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport: {width: 1440, height: 900}});
  await page.goto(BASE, {waitUntil: "domcontentloaded"}).catch(() => {});
  await page.waitForTimeout(4000);
  await page.screenshot({path: "_hero_1440.png"});
  await page.setViewportSize({width: 1200, height: 900});
  await page.waitForTimeout(2500);
  await page.screenshot({path: "_hero_1200.png"});
  await browser.close();
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
