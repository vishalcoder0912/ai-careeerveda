// Accessibility and visual regression, against the same running stack the rest
// of the end-to-end suite uses.
//
// Both live here rather than in their own tooling on purpose:
//
//   axe-core needs a real browser with the real CSS applied — contrast and
//   focus-order violations do not exist in jsdom, so a Vitest unit test cannot
//   find them however many components it renders.
//
//   Visual regression uses Playwright's built-in toHaveScreenshot rather than
//   Percy or Chromatic. Those are hosted services with an account, a token and a
//   per-snapshot bill; this is a PNG diff in the repository, which is the same
//   result for a site with a dozen pages.

import {test, expect} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

import {FRONTEND, ADMIN, loginAsAdmin} from "./helpers.js";

// WCAG 2.1 A and AA. The `best-practice` tag is deliberately left out: it flags
// things like "region" (every element inside a landmark) that are style opinions
// rather than barriers, and mixing them in makes a real failure easy to skim past.
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

const analyse = (page) => new AxeBuilder({page}).withTags(WCAG).analyze();

/** Readable failure output. The raw axe result is several hundred lines of JSON. */
const summarise = (violations) =>
  violations
    .map((v) => `${v.id} (${v.impact}) x${v.nodes.length}\n    ${v.help}\n    ${v.nodes[0]?.target?.join(" ")}`)
    .join("\n\n");

// networkidle never fires on a page that keeps a connection open — the Spline
// iframe on home, a lazy image, an API poll — and a 60s hang there failed this
// file's beforeAll on the CI box on every run. Every list page also ships a
// static fallback, so "main has substantial text" is the real "the page is
// finished, not a skeleton" signal, and it cannot hang.
const contentReady = (page) =>
  page.waitForFunction(
    () => document.querySelector("main")?.textContent.trim().length > 100,
    {timeout: 30000},
  );

const PUBLIC_PAGES = [
  ["home", "/"],
  ["programs", "/programs"],
  ["jobs", "/jobs"],
  ["blog", "/blog"],
  ["faculty", "/faculty"],
  ["about", "/about"],
  ["contact", "/contact"],
  ["enroll", "/enroll"],
];

// Warm the dev server before anything is measured.
//
// The home page pulls the heaviest dependency graph on the site (three.js, gsap,
// framer-motion). On a cold Vite server the first request for it discovers those
// deps, pre-bundles them, and triggers a full page reload to pick up the new
// bundle. If that reload lands while axe is running, axe's page.evaluate dies
// with "Execution context was destroyed" — which looks like a flaky
// accessibility test but is really a cold cache, and it only ever hit home
// because home is what triggers the optimisation.
//
// Paying that cost here means every measured navigation below runs against a
// warm server.
test.beforeAll(async ({browser}) => {
  const page = await browser.newPage();
  try {
    await page.goto(`${FRONTEND}/`, {waitUntil: "domcontentloaded"});
    await contentReady(page);
  } finally {
    // A failure here (cold cache, reload mid-warm-up) must not strand a page:
    // an unclosed page is exactly the kind of leftover that made the CI runner
    // hang after the suite had finished.
    await page.close().catch(() => {});
  }
});

test.describe("accessibility", () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== "chromium", "desktop WCAG audits only");
  });

  for (const [name, path] of PUBLIC_PAGES) {
    test(`public ${name} page has no WCAG A/AA violations`, async ({page}) => {
      await page.goto(`${FRONTEND}${path}`, {waitUntil: "domcontentloaded"});
      // Content arrives from the API, and axe should see the finished page
      // rather than a loading skeleton that trivially passes.
      await contentReady(page);

      const {violations} = await analyse(page);
      expect(violations.length, `\n${summarise(violations)}\n`).toBe(0);
    });
  }

  test("admin login has no WCAG A/AA violations", async ({page}) => {
    await page.goto(`${ADMIN}/`);
    const {violations} = await analyse(page);
    expect(violations.length, `\n${summarise(violations)}\n`).toBe(0);
  });

  test("admin dashboard has no WCAG A/AA violations", async ({page}) => {
    await loginAsAdmin(page);
    const {violations} = await analyse(page);
    expect(violations.length, `\n${summarise(violations)}\n`).toBe(0);
  });
});

// Visual regression runs on desktop only. The mobile project renders the same
// pages at a different width, which doubles the baseline count and the review
// burden for a second look at markup the desktop shots already cover.
//
// Tagged @visual because it is the one suite here that cannot gate a deploy.
// Playwright names a baseline after the platform that produced it
// (public-about-chromium-linux.png), so a baseline recorded on a workstation is
// invisible to the Linux runner, which then reports "a snapshot doesn't exist"
// and fails — on a correct page, for a reason nobody on Windows can fix.
// Font hinting and GPU compositing differ enough between machines that this is
// not worth fighting. So the CI gate runs `npm run test:e2e`, which is
// --grep-invert @visual: this suite is a local check (`npm run test:visual`),
// where a diff is information rather than a blocked push.
test.describe("visual regression @visual", () => {
  // Both projects run Chromium, so browserName cannot tell them apart — the
  // project name is the only thing that distinguishes desktop from Pixel 7.
  // test.info() rather than the ({}, testInfo) hook signature: the empty
  // destructuring pattern Playwright's docs use is an ESLint error, and this
  // reads better anyway.
  test.beforeEach(() => {
    test.skip(test.info().project.name !== "chromium", "desktop baselines only");
  });

  // Home is excluded, and only from this block — its accessibility check above
  // still runs. Playwright takes two screenshots and requires them to be
  // identical before it will compare against a baseline at all, and the hero's
  // three.js particle field never stops moving, so the page never reaches that
  // state and the test times out after ~20s rather than failing on a real diff.
  // Masking the canvas does not help: the mask is applied to the comparison, not
  // to the stability check. Covering the hero would need a screenshot scoped to
  // a locator below it, which is a different test than "the page looks right".
  const VISUAL_PAGES = PUBLIC_PAGES.filter(([name]) => name !== "home");

  for (const [name, path] of VISUAL_PAGES) {
    test(`public ${name} page matches its baseline`, async ({page}) => {
      await page.goto(`${FRONTEND}${path}`);
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveScreenshot(`public-${name}.png`, {
        fullPage: true,
        // GSAP and Framer Motion animate on scroll; without this the shot is
        // taken at whatever frame the machine happened to reach.
        animations: "disabled",
        // The three.js particle fields seed themselves from Math.random, so
        // their pixels differ on every single run by design. Masking them keeps
        // the rest of the page under test instead of disabling the check.
        mask: [page.locator("canvas")],
        // Font hinting and GPU compositing differ enough between machines that
        // a zero-tolerance diff fails on a correct page. Small enough to still
        // catch a moved element or a changed colour.
        maxDiffPixelRatio: 0.02,
      });
    });
  }

  test("admin login matches its baseline", async ({page}) => {
    await page.goto(`${ADMIN}/`);
    await expect(page).toHaveScreenshot("admin-login.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  });
});

// Not a screenshot: a moved gutter is a handful of pixels on a full-page diff,
// under the 2% tolerance above, and the site had drifted into three different
// content widths — navbar 1180, footer and landing sections 1240, standalone
// pages 1160 — without any test noticing. This measures the thing directly.
test.describe("layout", () => {
  const gutters = (page) =>
    page.evaluate(() => {
      const edges = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const {left, right} = el.getBoundingClientRect();
        // Round: sub-pixel layout differs by fractions between machines.
        return [Math.round(left), Math.round(document.documentElement.clientWidth - right)];
      };
      return {nav: edges(".site-nav .brand"), footer: edges(".site-footer .brand")};
    });

  for (const [name, path] of [["home", "/"], ["about", "/about"], ["blog", "/blog"]]) {
    test(`${name} footer starts on the same line as the navbar`, async ({page}) => {
      await page.goto(`${FRONTEND}${path}`, {waitUntil: "domcontentloaded"});
      await contentReady(page);

      const {nav, footer} = await gutters(page);
      expect(nav, "navbar brand not found").not.toBeNull();
      expect(footer, "footer brand not found").not.toBeNull();
      expect(footer[0], "footer left gutter").toBe(nav[0]);
    });
  }
});
