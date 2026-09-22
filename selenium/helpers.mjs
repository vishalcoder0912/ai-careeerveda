// Shared plumbing for the Selenium suite. Mirrors the Playwright e2e/helpers.js
// so both suites can talk about the same app, the same URLs and the same
// throwaway in-memory accounts (see backend/scripts/lib/seedE2E.js).
//
// The runner (scripts/selenium.mjs) boots dedicated servers and points these
// env vars at them; running a single test file by hand falls back to the same
// dedicated ports so it can target a live `scripts/selenium.mjs` run.

import {Builder, By, until} from "selenium-webdriver";
import {Options as ChromeOptions} from "selenium-webdriver/chrome.js";
import {Options as FirefoxOptions} from "selenium-webdriver/firefox.js";

const strip = (value) => String(value || "").replace(/\/+$/, "");

export const FRONTEND = strip(process.env.SELENIUM_FRONTEND_URL || "http://localhost:5283");
export const ADMIN = strip(process.env.SELENIUM_ADMIN_URL || "http://localhost:5284");
export const API = strip(process.env.SELENIUM_API_URL || "http://localhost:8082/api/v1");

// Throwaway credentials for the in-memory database. Not secrets, readable on
// purpose, identical to the Playwright suite's.
export const PASSWORD = "E2e-Test-Password-9f3x!";

export const ACCOUNTS = Object.freeze({
  superAdmin: "e2e-super@careerveda.test",
  admin: "e2e-admin@careerveda.test",
  editor: "e2e-editor@careerveda.test",
  viewer: "e2e-viewer@careerveda.test",
});

const isHeadless = () => process.env.SELENIUM_HEADLESS !== "0";

/**
 * Boot a WebDriver for the requested local browser. Driver binaries are
 * resolved automatically by Selenium Manager (bundled with selenium-webdriver),
 * so nothing needs to be installed by hand for Chrome, Edge or Firefox.
 */
export const buildDriver = async (browser = process.env.SELENIUM_BROWSER || "chrome") => {
  const builder = new Builder().forBrowser(browser);

  if (browser === "chrome") {
    const options = new ChromeOptions().setAcceptInsecureCerts(true);
    if (isHeadless()) options.addArguments("--headless=new", "--disable-gpu", "--window-size=1280,800");
    builder.setChromeOptions(options);
  } else if (browser === "firefox") {
    const options = new FirefoxOptions().setAcceptInsecureCerts(true);
    if (isHeadless()) options.addArguments("-headless");
    builder.setFirefoxOptions(options);
  }

  const driver = await builder.build();
  if (!isHeadless()) await driver.manage().window().setRect({width: 1280, height: 800});
  return driver;
};

/**
 * Stop a driver unconditionally. Selenium Manager occasionally aborts a session
 * after the process it owns exits, so swallow driver.quit() failures rather
 * than masking the real test result.
 */
export const stopDriver = async (driver) => {
  try {
    await driver.quit();
  } catch {
    /* the browser is already gone; the test result stands */
  }
};

/**
 * Run a body of Selenium work against a fresh browser and always close it, so a
 * failed assertion still releases the process instead of leaking one per run.
 */
export const withDriver = async (fn, browser) => {
  const driver = await buildDriver(browser);
  try {
    return await fn(driver);
  } finally {
    await stopDriver(driver);
  }
};

/**
 * Poll a predicate until it flips true or the timeout elapses. Unlike a raw
 * driver.wait, an assertion that throws here (element missing mid-cascade) is
 * treated as "not ready yet" instead of failing the wait immediately.
 */
export const waitFor = (driver, predicate, {timeout = 30_000, message} = {}) =>
  driver.wait(
    async () => {
      try {
        return Boolean(await predicate());
      } catch {
        return false;
      }
    },
    timeout,
    message,
  );

/** The public site is content-bearing once <main> has a real block of text. */
export const waitForContent = (driver, {timeout = 30_000} = {}) =>
  waitFor(
    driver,
    async () => {
      const text = await driver.findElement(By.css("main")).getText();
      return text.trim().length > 100;
    },
    {timeout, message: "page never rendered meaningful content"},
  );

/**
 * Sign into the admin panel through its real form. The authenticated dashboard
 * is reached when a sidebar link pointing at the programs section appears.
 */
export const loginAsAdmin = async (driver, email = ACCOUNTS.superAdmin, {timeout = 30_000} = {}) => {
  await driver.get(`${ADMIN}/`);

  await driver.findElement(By.id("email")).clear();
  await driver.findElement(By.id("email")).sendKeys(email);
  await driver.findElement(By.id("password")).sendKeys(PASSWORD);
  await driver.findElement(By.css('button[type="submit"]')).click();

  await waitFor(
    driver,
    async () => (await driver.findElements(By.css('a[href*="programs"]'))).length > 0,
    {timeout, message: "sign-in did not reach the dashboard"},
  );
};

export {By, until};