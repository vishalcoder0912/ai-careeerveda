import {chromium} from "playwright";

const browser = await chromium.launch();
const out = {};

for (const width of [390, 430, 768, 980, 981]) {
  const page = await browser.newPage({viewport: {width, height: 844}});
  await page.goto("http://localhost:5199/", {waitUntil: "networkidle"});
  await page.waitForTimeout(400);

  const state = await page.evaluate(() => {
    const box = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {w: Math.round(r.width), h: Math.round(r.height), display: cs.display, visibility: cs.visibility};
    };
    const pill = document.querySelector(".site-nav-links");
    const pillLinks = pill ? [...pill.querySelectorAll("a")].map((a) => ({
      label: a.textContent.trim(),
      w: Math.round(a.getBoundingClientRect().width),
      visible: a.getBoundingClientRect().width > 0 && getComputedStyle(a).visibility !== "hidden",
    })) : [];
    return {
      hamburger: box(".hamburger-btn"),
      pill: box(".site-nav-links"),
      pillLinks,
      cta: box(".nav-cta"),
      brand: box(".site-nav-brand"),
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      navContainer: box(".nav-container"),
    };
  });

  // Interact: open the mobile drawer
  const hamburger = page.locator(".hamburger-btn");
  const hamburgerVisible = await hamburger.isVisible().catch(() => false);
  if (hamburgerVisible) {
    await hamburger.click();
    await page.waitForTimeout(600);
    const drawerState = await page.evaluate(() => {
      const dialog = document.querySelector(".mobile-menu-overlay");
      const panel = document.querySelector(".mobile-menu-panel");
      const rows = panel ? [...panel.querySelectorAll(".mobile-menu-nav a")].map((a) => {
        const r = a.getBoundingClientRect();
        const cs = getComputedStyle(a);
        return {label: a.textContent.trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height), opacity: cs.opacity, visible: r.width > 0 && r.height > 0 && cs.visibility !== "hidden"};
      }) : [];
      const head = document.querySelector(".mobile-menu-head")?.getBoundingClientRect();
      return {
        dialogOpen: dialog?.hasAttribute("open"),
        dialog: dialog ? {w: Math.round(dialog.getBoundingClientRect().width), h: Math.round(dialog.getBoundingClientRect().height)} : null,
        panel: panel ? {w: Math.round(panel.getBoundingClientRect().width), h: Math.round(panel.getBoundingClientRect().height)} : null,
        head: panel ? {w: Math.round(head.width)} : null,
        rows,
      };
    });
    out[width] = {state, drawer: drawerState};
  } else {
    out[width] = {state, drawer: "HAMBURGER NOT VISIBLE"};
  }
  await page.close();
}

console.log(JSON.stringify(out, null, 1));
await browser.close();