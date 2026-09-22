// Admin login flow through the real form, using the seeded throwaway super
// admin. The negative case proves the panel's deliberately vague error is
// actually rendered rather than the form silently succeeding.

import {describe, test} from "node:test";
import assert from "node:assert/strict";

import {By, until, withDriver, loginAsAdmin, ACCOUNTS, ADMIN} from "./helpers.mjs";

describe("selenium admin login", () => {
  test("valid credentials reach the dashboard", async () => {
    await withDriver(async (driver) => {
      await loginAsAdmin(driver);
      await driver.wait(until.elementLocated(By.css('a[href*="programs"]')), 20_000);
      assert.equal(await driver.getTitle(), "CareerVeda Admin");
    });
  });

  test("wrong password shows an error and stays on the login form", async () => {
    await withDriver(async (driver) => {
      await driver.get(`${ADMIN}/`);
      await driver.findElement(By.id("email")).sendKeys(ACCOUNTS.superAdmin);
      await driver.findElement(By.id("password")).sendKeys("definitely-not-the-password");
      await driver.findElement(By.css('button[type="submit"]')).click();

      const alert = await driver.wait(until.elementLocated(By.css('[role="alert"]')), 20_000);
      assert.match(await alert.getText(), /incorrect|password|wrong/i);

      // Still on the form: the panel only re-renders the dashboard after a
      // successful sign-in.
      assert.ok(await driver.findElement(By.id("email")).isDisplayed());
      assert.ok(await driver.findElement(By.id("password")).isDisplayed());
    });
  });
});