// Real-browser Core Web Vitals budgets, measured with PerformanceObserver so the
// numbers are the same ones Chrome's own tools report rather than a proxy. The
// budgets are generous on purpose: this runs on a shared Windows box against
// Vite's dev server, so it is a regression gate (a page that slowed down
// several-fold, or throws), not a strict Lighthouse pass.
//
// Tagged @performance so the default gate (`npm run test:e2e`) skips it and CI
// runs it as its own stage.

import {test, expect} from "@playwright/test";

import {FRONTEND} from "./helpers.js";

const BUDGETS = {fcp: 8000, lcp: 12000, cls: 0.5, tbt: 8000};

// Registered with addInitScript so it runs at the start of every document —
// a PerformanceObserver added after navigation would miss the long tasks that
// block the first paint, which is exactly what TBT exists to catch.
const instrument = () => {
  window.__qaPerf = {lcp: 0, cls: 0, tbt: 0};
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.startTime > window.__qaPerf.lcp) window.__qaPerf.lcp = entry.startTime;
    }
  }).observe({type: "largest-contentful-paint", buffered: true});
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) window.__qaPerf.cls += entry.value;
    }
  }).observe({type: "layout-shift", buffered: true});
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      window.__qaPerf.tbt += Math.max(0, entry.duration - 50);
    }
  }).observe({type: "longtask", buffered: true});
};

const contentReady = (page) =>
  page.waitForFunction(
    () => document.querySelector("main")?.textContent.trim().length > 100,
    {timeout: 30000},
  );

const PAGES = [
  ["home", "/"],
  ["programs", "/programs"],
  ["blog", "/blog"],
  ["about", "/about"],
];

test.describe("performance budgets @performance", () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== "chromium", "desktop metrics only");
  });

  for (const [name, path] of PAGES) {
    test(`${name} page meets Core Web Vitals budgets`, async ({page}) => {
      const errors = [];
      page.on("pageerror", (error) => errors.push(String(error)));

      await page.addInitScript(instrument);
      await page.goto(`${FRONTEND}${path}`, {waitUntil: "domcontentloaded"});
      await contentReady(page);
      // Let late images and fonts land so LCP is the real number rather than
      // whatever happened to be on screen at domcontentloaded.
      await page.waitForTimeout(3000);

      const metrics = await page.evaluate(() => {
        const paint = performance.getEntriesByType("paint");
        return {
          ...window.__qaPerf,
          fcp: paint.find((entry) => entry.name === "first-contentful-paint")?.startTime ?? -1,
        };
      });

      console.log(
        `[perf] ${name}: FCP=${Math.round(metrics.fcp)}ms LCP=${Math.round(metrics.lcp)}ms ` +
          `CLS=${metrics.cls.toFixed(3)} TBT=${Math.round(metrics.tbt)}ms`,
      );

      expect(errors, "page threw an uncaught JavaScript error").toEqual([]);
      expect(metrics.fcp, "FCP budget").toBeGreaterThan(0);
      expect(metrics.fcp, "FCP budget").toBeLessThan(BUDGETS.fcp);
      expect(metrics.lcp, "LCP budget").toBeGreaterThan(0);
      expect(metrics.lcp, "LCP budget").toBeLessThan(BUDGETS.lcp);
      expect(metrics.cls, "CLS budget").toBeLessThan(BUDGETS.cls);
      expect(metrics.tbt, "TBT budget").toBeLessThan(BUDGETS.tbt);
    });
  }
});