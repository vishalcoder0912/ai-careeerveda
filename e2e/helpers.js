import {expect} from "@playwright/test";

import {FRONTEND, ADMIN, API} from "../playwright.config.js";

export {FRONTEND, ADMIN, API};

// Matches backend/scripts/lib/seedE2E.js. Throwaway credentials for an
// in-memory database that lives only as long as the run.
export const PASSWORD = "E2e-Test-Password-9f3x!";

export const ACCOUNTS = {
  superAdmin: "e2e-super@careerveda.test",
  admin: "e2e-admin@careerveda.test",
  editor: "e2e-editor@careerveda.test",
  viewer: "e2e-viewer@careerveda.test",
};

export const SEEDED_PROGRAM_SLUG = "seeded-integration-program";

/** A name no other run can collide with, so specs never fight over a record. */
export const uniqueName = (prefix) => `${prefix} ${Date.now()}-${Math.floor(Math.random() * 1000)}`;

/** Log into the admin panel through its real form. */
export const loginAsAdmin = async (page, email = ACCOUNTS.superAdmin) => {
  await page.goto(`${ADMIN}/`);

  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole("button", {name: /sign in|log in/i}).click();

  // The dashboard is the first authenticated screen; waiting for it rather than
  // for a fixed delay is what keeps this from being flaky on a slow machine.
  await expect(page.getByRole("link", {name: /programs/i}).first()).toBeVisible();
};

/**
 * The public API as the site sees it. Used to assert publication state
 * independently of any page's caching        if this says a record is gone, the
 * frontend not showing it is a real result rather than a stale render.
 */
export const publicList = async (request, resource, params = "") => {
  const response = await request.get(`${API}/public/${resource}?limit=100${params}`);
  expect(response.ok()).toBeTruthy();
  return (await response.json()).data;
};

export const publicItemStatus = async (request, resource, slug) => {
  const response = await request.get(`${API}/public/${resource}/${slug}`);
  return response.status();
};

/**
 * A logged-in API context, for the setup and teardown a spec needs but is not
 * testing. Driving twelve form fields through the UI to reach the state a test
 * is actually about makes the test slow and makes its failure ambiguous.
 */
export const apiLogin = async (request, email = ACCOUNTS.superAdmin) => {
  const response = await request.post(`${API}/auth/login`, {
    data: {email, password: PASSWORD},
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return {
    token: body.data.accessToken,
    headers: {Authorization: `Bearer ${body.data.accessToken}`},
  };
};

/** Create a program complete enough that publishing it will be allowed. */
export const createPublishableProgram = async (request, headers, title) => {
  const response = await request.post(`${API}/admin/programs`, {
    headers,
    data: {
      title,
      subtitle: "Created by the end-to-end suite",
      category: "Integration",
      description: "A program created by an automated test.",
      duration: "6 Months",
      mentorship: ["Expert Trainers"],
      format: "Live Online",
      image: {url: "https://ik.imagekit.io/q7ucn1rfni/careerveda/programs/data-c3b60741.jpg"},
      overview: ["Overview point"],
      curriculum: ["Curriculum point"],
      outcomes: ["Outcome point"],
    },
  });

  expect(response.status()).toBe(201);
  return (await response.json()).data;
};

/** Remove a record for good, so a run leaves the database as it found it. */
export const purgeProgram = async (request, headers, id) => {
  await request.delete(`${API}/admin/programs/${id}`, {headers});
  await request.delete(`${API}/admin/programs/${id}/permanent`, {headers});
};
