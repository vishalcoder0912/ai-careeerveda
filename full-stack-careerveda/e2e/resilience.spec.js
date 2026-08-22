// Failure-injection tests: the app's offline behaviour is a feature (the static
// files are the floor, and an unreachable server keeps them on screen per
// src/lib/publicApi.js), so it is tested here with route interception rather
// than only implied by the unit suites.

import {test, expect} from "@playwright/test";

import {FRONTEND} from "./helpers.js";

const contentReady = (page) =>
  page.waitForFunction(
    () => document.querySelector("main")?.textContent.trim().length > 100,
    {timeout: 30000},
  );

test.describe("resilience", () => {
  test("programs page keeps its static fallback when the API is unreachable", async ({page}) => {
    await page.route("**/api/v1/**", (route) => route.abort("connectionrefused"));
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error)));

    await page.goto(`${FRONTEND}/programs`, {waitUntil: "domcontentloaded"});
    await contentReady(page);

    expect((await page.locator("main").innerText()).length).toBeGreaterThan(100);
    expect(errors, "page threw while the API was down").toEqual([]);
  });

  test("programs page keeps its static fallback when the API answers 500", async ({page}) => {
    await page.route("**/api/v1/public/**", (route) =>
      route.fulfill({status: 500, contentType: "application/json", body: "{}"}),
    );

    await page.goto(`${FRONTEND}/programs`, {waitUntil: "domcontentloaded"});
    await contentReady(page);

    expect((await page.locator("main").innerText()).length).toBeGreaterThan(100);
  });

  test("a program detail page renders its static copy when the API is down", async ({page}) => {
    await page.route("**/api/v1/**", (route) => route.abort("connectionrefused"));

    await page.goto(`${FRONTEND}/programs`, {waitUntil: "domcontentloaded"});
    await contentReady(page);
    await page.locator("main a[href^='/programs/']").first().click();
    await contentReady(page);

    expect((await page.locator("main").innerText()).length).toBeGreaterThan(100);
  });

  test("a missing image never blanks the page", async ({page}) => {
    await page.route("**/ik.imagekit.io/**", (route) => route.fulfill({status: 404, body: "not found"}));

    await page.goto(`${FRONTEND}/programs`, {waitUntil: "domcontentloaded"});
    await contentReady(page);

    expect((await page.locator("main").innerText()).length).toBeGreaterThan(100);
  });

  test("a failed lead submission shows an error instead of crashing", async ({page}) => {
    await page.route("**/api/v1/public/leads", (route) =>
      route.fulfill({status: 500, contentType: "application/json", body: "{}"}),
    );

    await page.goto(`${FRONTEND}/enroll`, {waitUntil: "domcontentloaded"});
    await contentReady(page);

    await page.getByPlaceholder("Your full name").fill("Test User");
    await page.getByPlaceholder("you@example.com").fill("test@example.com");
    await page.getByPlaceholder("+91 92178 01191").fill("+91 92178 01191");
    await page.locator('select[name="program"]').selectOption({index: 1});
    await page.locator('button[type="submit"]').first().click();

    await expect(page.getByText(/couldn't save|try again/i).first()).toBeVisible();
  });

  test("a slow API cannot hold the page hostage", async ({page}) => {
    await page.route("**/api/v1/**", async (route) => {
      await new Promise((resolve) => {
        setTimeout(resolve, 9000);
      });
      try {
        await route.fulfill({status: 200, contentType: "application/json", body: '{"success":true,"data":[]}'});
      } catch {
        // The client aborted at its 8s timeout; the page has already moved on.
      }
    });

    const started = Date.now();
    await page.goto(`${FRONTEND}/programs`, {waitUntil: "domcontentloaded"});
    await contentReady(page);

    // Static fallback renders immediately; the client-side 8s abort must not
    // leave the page waiting on the request.
    expect(Date.now() - started).toBeLessThan(10000);
  });
});