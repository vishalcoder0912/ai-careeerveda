import {chromium} from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: 1440, height: 900}});
await page.goto("http://localhost:5173/programs/ai-systems-agentic-ai", {waitUntil: "networkidle"}).catch(e => console.log("goto:", e.message));
await page.waitForTimeout(3000);
const info = await page.evaluate(() => ({ url: location.pathname, title: document.title, hasGrid: !!document.querySelector(".pd-curriculum__grid"), len: document.body.innerText.length }));
console.log(JSON.stringify(info));
await browser.close();
