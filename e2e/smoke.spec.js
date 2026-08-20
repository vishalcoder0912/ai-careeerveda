// Post-publish smoke suite against the live deployment. Skipped unless
// SMOKE_BASE_URL is set, so the normal e2e gate (which runs without it) never
// touches the internet. CI sets it to the real site after publishing.
//
// Tagged @smoke so `npm run test:e2e` excludes it. Run it with:
//   SMOKE_BASE_URL=https://careerveda.in npm run test:smoke
//
// The API is served from the apex domain (nginx proxies /api/v1), so the API
// base is derived from the site base rather than an api.* subdomain.

import {test, expect} from "@playwright/test";

const BASE = String(process.env.SMOKE_BASE_URL || "").replace(/\/+$/, "");
const ADMIN_URL = String(process.env.SMOKE_ADMIN_URL || "https://admin.careerveda.in").replace(/\/+$/, "");
const API_URL = String(process.env.SMOKE_API_URL || (BASE ? `${BASE}/api/v1` : "")).replace(/\/+$/, "");

const contentReady = (page) =>
  page.waitForFunction(
    () => document.querySelector("main")?.textContent.trim().length > 100,
    {timeout: 30000},
  );

test.describe("live site smoke @smoke", () => {
  test.skip(!process.env.SMOKE_BASE_URL, "set SMOKE_BASE_URL to run the post-publish smoke suite");

  test("home page renders", async ({page}) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error)));

    await page.goto(`${BASE}/`, {waitUntil: "domcontentloaded"});
    await expect(page).toHaveTitle(/careerveda/i);
    await contentReady(page);

    expect(errors, "home threw a JavaScript error").toEqual([]);
  });

  test("programs page renders content", async ({page}) => {
    await page.goto(`${BASE}/programs`, {waitUntil: "domcontentloaded"});
    await contentReady(page);
  });

  test("blog page renders content", async ({page}) => {
    await page.goto(`${BASE}/blog`, {waitUntil: "domcontentloaded"});
    await contentReady(page);
  });

  test("enroll page has the consultation form", async ({page}) => {
    await page.goto(`${BASE}/enroll`, {waitUntil: "domcontentloaded"});
    await contentReady(page);
    await expect(page.locator("form").first()).toBeVisible();
  });

  test("admin login page loads", async ({page}) => {
    await page.goto(ADMIN_URL, {waitUntil: "domcontentloaded"});
    await expect(page.getByLabel(/email/i).first()).toBeVisible();
  });

  test("public API answers with published content", async ({request}) => {
    const response = await request.get(`${API_URL}/public/programs?limit=3`, {timeout: 15000});
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBe(true);
  });
});