import {chromium} from "playwright";
const browser = await chromium.launch();
for (const slug of ["ai-systems-agentic-ai","gen-ai-agentic-ai","data-analytics"]) {
  const page = await browser.newPage({viewport: {width: 1440, height: 900}});
  await page.goto("http://localhost:5173/programs/" + slug, {waitUntil: "domcontentloaded"}).catch(()=>{});
  await page.waitForTimeout(3500);
  const info = await page.evaluate(() => ({ url: location.pathname, title: document.title, hasGrid: !!document.querySelector(".pd-curriculum__grid"), ga: !!document.querySelector(".ga-page"), len: document.body.innerText.length }));
  console.log(slug, "->", JSON.stringify(info));
  await page.close();
}
await browser.close();
