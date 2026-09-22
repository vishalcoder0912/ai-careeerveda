// Selenium mirror of the Playwright public-site smoke (e2e/smoke.spec.js).
// Drives a real browser through WebDriver against a frontend that is wired to
// a seeded, in-memory API — the same isolation the Playwright suite already
// guarantees. Run via `npm run test:selenium`.
//
// One browser session is shared by the whole suite: each case loads its own URL
// from a fresh document, so there is no state to leak, and a single Chrome
// instance costs far less RAM than the eight this file used to spawn.

import {describe, test, before, after} from "node:test";
import assert from "node:assert/strict";

import {By, until, buildDriver, stopDriver, waitForContent, FRONTEND, ADMIN} from "./helpers.mjs";

describe("selenium public site smoke", () => {
  let driver;

  before(async () => {
    driver = await buildDriver();
  });

  after(async () => {
    await stopDriver(driver);
  });

  test("home page renders with the brand title", async () => {
    await driver.get(`${FRONTEND}/`);
    await driver.wait(until.titleMatches(/careerveda/i), 30_000);
    await waitForContent(driver);
  });

  test("programs page renders content", async () => {
    await driver.get(`${FRONTEND}/programs`);
    await waitForContent(driver);
  });

  test("program detail renders the seeded program", async () => {
    await driver.get(`${FRONTEND}/programs/seeded-integration-program`);
    await waitForContent(driver);
    // The hero h1 splits the title across two nodes, so the breadcrumb carries
    // the whole name and is the stable place to assert the seed is on screen.
    const crumb = await driver.wait(until.elementLocated(By.css(".pd-crumbs__now")), 30_000);
    assert.match(await crumb.getText(), /seeded integration program/i);
  });

  test("blog page renders content", async () => {
    await driver.get(`${FRONTEND}/blog`);
    await waitForContent(driver);
  });

  test("enroll page has the consultation form", async () => {
    await driver.get(`${FRONTEND}/enroll`);
    await waitForContent(driver);
    const forms = await driver.findElements(By.css("form"));
    assert.ok(forms.length > 0, "enroll page has no form");
  });

  test("admin login page loads", async () => {
    await driver.get(`${ADMIN}/`);
    await driver.wait(until.elementLocated(By.id("email")), 20_000);
    await driver.wait(until.elementLocated(By.id("password")), 20_000);
  });
});