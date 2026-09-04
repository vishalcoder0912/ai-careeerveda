import {chromium} from "playwright";

const browser = await chromium.launch();
const out = {};

for (const scenario of ["normal", "no-showmodal"]) {
  const context = await browser.newContext({viewport: {width: 390, height: 844}});
  if (scenario === "no-showmodal") {
    await context.addInitScript(() => {
      try {
        HTMLDialogElement.prototype.showModal = undefined;
        delete HTMLDialogElement.prototype.showModal;
      } catch {
        /* ignore */
      }
    });
  }
  const page = await context.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e).slice(0, 140)));
  await page.goto("http://localhost:5199/", {waitUntil: "networkidle"});
  await page.waitForTimeout(500);

  const hamburger = page.locator(".hamburger-btn");
  const hamburgerVisible = await hamburger.isVisible().catch(() => false);
  if (!hamburgerVisible) {
    out[scenario] = {hamburgerVisible, errs};
    await context.close();
    continue;
  }
  await hamburger.click();
  await page.waitForTimeout(900);

  const result = await page.evaluate(() => {
    const dialog = document.querySelector(".mobile-menu-overlay");
    const panel = document.querySelector(".mobile-menu-panel");
    const rows = dialog && panel ? [...panel.querySelectorAll(".mobile-menu-nav a")].map((a) => {
      const r = a.getBoundingClientRect();
      return {label: a.textContent.trim().replace(/\s+/g, " ").slice(0, 20), w: Math.round(r.width), visible: r.width > 0};
    }) : [];
    return {
      hasDialog: !!dialog,
      openAttr: dialog ? dialog.hasAttribute("open") : false,
      showModalType: typeof (dialog && dialog.showModal),
      visibleRows: rows.filter((r) => r.visible).length,
      firstRow: rows[0] || null,
    };
  });
  out[scenario] = {...result, errors: errs};
  await context.close();
}

console.log(JSON.stringify(out, null, 1));
await browser.close();