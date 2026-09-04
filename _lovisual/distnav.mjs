import {chromium} from "playwright";

const browser = await chromium.launch();
const out = {};

for (const width of [390, 430, 768]) {
  const page = await browser.newPage({viewport: {width, height: 844}});
  const consoleErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text().slice(0, 160));
  });
  page.on("pageerror", (e) => consoleErrors.push("PAGEERROR: " + String(e).slice(0, 160)));
  await page.goto("http://localhost:5199/", {waitUntil: "networkidle"});
  await page.waitForTimeout(1200);

  let drawer;
  const hamburger = page.locator(".hamburger-btn");
  if (await hamburger.isVisible().catch(() => false)) {
    await hamburger.click();
    await page.waitForTimeout(900);
    drawer = await page.evaluate(() => {
      const dialog = document.querySelector(".mobile-menu-overlay");
      const panel = document.querySelector(".mobile-menu-panel");
      const rows = panel ? [...panel.querySelectorAll("a")].map((a) => {
        const r = a.getBoundingClientRect();
        const cs = getComputedStyle(a);
        return {label: a.textContent.trim().replace(/\s+/g, " ").slice(0, 26), w: Math.round(r.width), h: Math.round(r.height), opacity: +cs.opacity};
      }) : [];
      return {
        hasDialog: !!dialog,
        openAttr: dialog?.hasAttribute("open"),
        panelH: panel ? Math.round(panel.getBoundingClientRect().height) : null,
        rows,
      };
    });
  }
  const state = await page.evaluate(() => ({
    pillDisplay: getComputedStyle(document.querySelector(".site-nav-links")).display,
    navLinksVisible: [...document.querySelectorAll(".site-nav-links a")].filter((a) => a.getBoundingClientRect().width > 0).length,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    url: location.pathname,
  }));

  out[width] = {state, drawer, consoleErrors};
  await page.close();
}

console.log(JSON.stringify(out, null, 1).replace(/\\n/g, " "));
await browser.close();