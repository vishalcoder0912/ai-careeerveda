// Admin authentication, driven through the real login form.
//
// The backend suite already covers token rotation, lockout and reuse detection
// against the API. What only a browser can show is whether the panel puts those
// mechanics together into a session a person can actually use — in particular
// that a page refresh keeps you signed in, which depends on the access token
// living in memory and the refresh cookie surviving the reload.

import {test, expect} from "@playwright/test";

import {ADMIN, ACCOUNTS, PASSWORD, loginAsAdmin} from "./helpers.js";

test.describe("admin authentication", () => {
  test("signs in and reaches the dashboard", async ({page}) => {
    await loginAsAdmin(page);

    await expect(page.getByRole("link", {name: /programs/i}).first()).toBeVisible();
  });

  test("refuses a wrong password without saying which field was wrong", async ({page}) => {
    await page.goto(`${ADMIN}/`);

    await page.getByLabel(/email/i).fill(ACCOUNTS.superAdmin);
    await page.getByLabel(/password/i).fill("not-the-password");
    await page.getByRole("button", {name: /sign in|log in/i}).click();

    // Still on the login screen, and the message must not distinguish "no such
    // account" from "wrong password" — that difference is an account oracle.
    await expect(page.getByLabel(/password/i)).toBeVisible();
    const message = await page.getByRole("alert").first().textContent().catch(() => "");
    expect(String(message).toLowerCase()).not.toContain("no account");
  });

  test("keeps the session across a full page reload", async ({page}) => {
    // The access token is deliberately held in memory, not localStorage, so a
    // reload loses it. Staying signed in depends on the httpOnly refresh cookie
    // and the boot-time restore — this is the test that it works end to end.
    await loginAsAdmin(page);

    await page.reload();

    await expect(page.getByRole("link", {name: /programs/i}).first()).toBeVisible();
    await expect(page.getByLabel(/password/i)).toHaveCount(0);
  });

  test("sends an anonymous visitor to the login screen", async ({page}) => {
    await page.goto(`${ADMIN}/programs`);

    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test("signs out and does not leave the session usable", async ({page}) => {
    await loginAsAdmin(page);

    await page.getByRole("button", {name: /sign out/i}).click();
    await expect(page.getByLabel(/password/i)).toBeVisible();

    // Going straight back to a protected route must not restore the session
    // from a stale cookie.
    await page.goto(`${ADMIN}/programs`);
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test("rejects a login for an account that does not exist", async ({page}) => {
    await page.goto(`${ADMIN}/`);

    await page.getByLabel(/email/i).fill("nobody@careerveda.test");
    await page.getByLabel(/password/i).fill(PASSWORD);
    await page.getByRole("button", {name: /sign in|log in/i}).click();

    await expect(page.getByLabel(/password/i)).toBeVisible();
  });
});
