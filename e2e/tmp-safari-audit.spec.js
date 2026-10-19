// TEMPORARY Safari/WebKit audit — run with:
//   npx playwright test tmp-safari-audit --project=webkit --project=mobile-webkit
// Deleted after the Safari optimisation pass.
import {test, expect} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

import {FRONTEND, ADMIN, loginAsAdmin} from "./helpers.js";

const PAGES = [
  ["home", "/"],
  ["programs", "/programs"],
  ["program-detail", "/programs/seeded-integration-program"],
  ["jobs", "/jobs"],
  ["blog", "/blog"],
  ["faculty", "/faculty"],
  ["about", "/about"],
  ["contact", "/contact"],
  ["enroll", "/enroll"],
  ["alumni", "/alumni"],
  ["privacy", "/privacy-policy"],
];

const contentReady = (page) =>
  page.waitForFunction(
    () => document.querySelector("main")?.textContent.trim().length > 100,
    {timeout: 30000},
  );

const collectRuntime = (page) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  return errors;
};

test.describe("safari audit", () => {
  for (const [name, path] of PAGES) {
    test(`${name}: no errors, no overflow, no iOS zoom traps`, async ({page}) => {
      const errors = collectRuntime(page);
      await page.goto(`${FRONTEND}${path}`, {waitUntil: "domcontentloaded"});
      await contentReady(page);
      // Let lazy sections, animations and scroll-driven effects settle.
      await page.waitForTimeout(600);

      const report = await page.evaluate(() => {
        const doc = document.documentElement;
        const overflowing = [];
        if (doc.scrollWidth > window.innerWidth + 1) {
          for (const el of document.querySelectorAll("body *")) {
            const r = el.getBoundingClientRect();
            if (r.right > window.innerWidth + 2 && r.width > 0 && getComputedStyle(el).position !== "fixed") {
              overflowing.push(`${el.tagName.toLowerCase()}.${String(el.className || "").split(" ")[0]} right=${Math.round(r.right)}`);
              if (overflowing.length >= 5) break;
            }
          }
        }
        // iOS Safari zooms the viewport when a focused field is under 16px.
        const smallFields = [...document.querySelectorAll("input, textarea, select")]
          .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16)
          .map((el) => `${el.tagName.toLowerCase()}[type=${el.type || "-"}] ${getComputedStyle(el).fontSize}`);

        const clippedText = [];
        for (const el of document.querySelectorAll("h1, h2, h3, p")) {
          const style = getComputedStyle(el);
          // display:-webkit-box + line-clamp clips on purpose.
          if (style.display === "-webkit-box") continue;
          if ((style.overflow === "hidden" || style.overflowY === "hidden") && el.scrollHeight > el.clientHeight + 4 && el.clientHeight > 0) {
            clippedText.push(`${el.tagName.toLowerCase()}.${String(el.className || "").split(" ")[0]} ${el.scrollHeight}>${el.clientHeight}`);
            if (clippedText.length >= 5) break;
          }
        }

        return {
          overflowPx: doc.scrollWidth - window.innerWidth,
          overflowing,
          smallFields,
          clippedText,
        };
      });

      console.log(`[audit:${name}] overflow=${report.overflowPx} smallFields=${report.smallFields.length} clipped=${report.clippedText.length}`);
      if (report.overflowing.length) console.log(`[audit:${name}] overflowing: ${report.overflowing.join(" | ")}`);
      if (report.smallFields.length) console.log(`[audit:${name}] small fields: ${report.smallFields.join(" | ")}`);
      if (report.clippedText.length) console.log(`[audit:${name}] clipped: ${report.clippedText.join(" | ")}`);

      expect(errors, `JS errors on ${path}\n${errors.join("\n")}`).toEqual([]);
      expect(report.overflowPx, `horizontal overflow on ${path}: ${report.overflowing.join(" | ")}`).toBeLessThanOrEqual(1);
      // iOS zooms the viewport into sub-16px fields; only a real issue at
      // touch/mobile widths (desktop keeps the designed 14px controls).
      if (await page.evaluate(() => window.matchMedia("(max-width: 1024px)").matches)) {
        expect(report.smallFields, `iOS zoom trap on ${path}`).toEqual([]);
      }
    });
  }

  test("program-detail: identify 404 + full axe detail", async ({page}) => {
    const failed = [];
    page.on("response", (r) => {
      if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
    });
    await page.goto(`${FRONTEND}/programs/seeded-integration-program`, {waitUntil: "domcontentloaded"});
    await contentReady(page);
    await page.waitForTimeout(800);
    console.log(`[audit:pd] failed responses: ${JSON.stringify(failed)}`);

    const {violations} = await new AxeBuilder({page})
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    for (const v of violations) {
      for (const n of v.nodes) {
        console.log(`[audit:pd] ${v.id}: target=${JSON.stringify(n.target)}\n  summary=${n.failureSummary?.replace(/\n/g, " ")}`);
      }
    }
  });

  test("WCAG A/AA in webkit", async ({page}) => {
    test.setTimeout(180_000);
    const violations = [];
    for (const [, path] of PAGES) {
      await page.goto(`${FRONTEND}${path}`, {waitUntil: "domcontentloaded"});
      await contentReady(page);
      const {violations: v} = await new AxeBuilder({page}).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      for (const x of v) violations.push(`${path} ${x.id} (${x.impact}) x${x.nodes.length} — ${x.nodes[0]?.target?.join(" ")}`);
    }
    expect(violations, violations.join("\n")).toEqual([]);
  });

  test("admin login + dashboard in webkit", async ({page}) => {
    const errors = collectRuntime(page);
    await page.goto(`${ADMIN}/`);
    await expect(page.getByLabel(/email/i).first()).toBeVisible();
    await loginAsAdmin(page);
    await page.waitForTimeout(400);
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("feature support probe", async ({page}) => {
    await page.goto(`${FRONTEND}/`, {waitUntil: "domcontentloaded"});
    const support = await page.evaluate(() => ({
      backdropFilter: CSS.supports("backdrop-filter: blur(2px)"),
      webkitBackdropFilter: CSS.supports("-webkit-backdrop-filter: blur(2px)"),
      maskImage: CSS.supports("mask-image: linear-gradient(#000, transparent)"),
      webkitMaskImage: CSS.supports("-webkit-mask-image: linear-gradient(#000, transparent)"),
      userSelect: CSS.supports("user-select: none"),
      webkitUserSelect: CSS.supports("-webkit-user-select: none"),
      appearance: CSS.supports("appearance: none"),
      webkitAppearance: CSS.supports("-webkit-appearance: none"),
      colorMix: CSS.supports("color: color-mix(in srgb, red 50%, blue)"),
      hasSelector: CSS.supports("selector(:has(*))"),
      textWrapBalance: CSS.supports("text-wrap: balance"),
      dvh: CSS.supports("height", "100dvh"),
      svh: CSS.supports("height", "100svh"),
      lineClamp: CSS.supports("line-clamp", "3"),
      webkitLineClamp: CSS.supports("-webkit-line-clamp", "3"),
      dialog: CSS.supports("dialog", "open"),
      inert: "inert" in HTMLElement.prototype,
      overscroll: CSS.supports("overscroll-behavior", "contain"),
    }));
    console.log(`[audit:support] ${JSON.stringify(support)}`);
  });
});
