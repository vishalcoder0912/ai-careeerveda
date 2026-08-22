// The claim the whole CMS rests on: what an admin does shows up on the site.
//
// Everything here runs against the real three-application stack. The unit suites
// prove each layer in isolation; this proves they are wired to each other, which
// is the part that has actually broken twice — once because the detail page
// redirected before its fetch resolved, and once because a deleted record kept
// rendering from its static copy.

import {test, expect} from "@playwright/test";

import {
  FRONTEND,
  API,
  SEEDED_PROGRAM_SLUG,
  apiLogin,
  createPublishableProgram,
  publicItemStatus,
  publicList,
  purgeProgram,
  uniqueName,
} from "./helpers.js";

const API_PROGRAM = (id) => `${API}/admin/programs/${id}`;
const API_PUBLISH = (id) => `${API_PROGRAM(id)}/publish`;
const API_UNPUBLISH = (id) => `${API_PROGRAM(id)}/unpublish`;

test.describe("admin to frontend synchronisation", () => {
  test("a draft is invisible, a publish appears, an unpublish disappears", async ({page, request}) => {
    const {headers} = await apiLogin(request);
    const title = uniqueName("E2E Lifecycle Program");
    const program = await createPublishableProgram(request, headers, title);

    try {
      // ── Draft: private ────────────────────────────────────────────────────
      expect(program.status).toBe("draft");

      const drafts = await publicList(request, "programs");
      expect(drafts.map((entry) => entry.slug)).not.toContain(program.slug);

      // The detail URL must not serve a draft to anyone who guesses the slug.
      expect(await publicItemStatus(request, "programs", program.slug)).toBe(404);

      await page.goto(`${FRONTEND}/programs/${program.slug}`);
      await expect(page).toHaveURL(new RegExp(`${FRONTEND}/programs/?$`));

      // ── Published: visible ────────────────────────────────────────────────
      const published = await request.post(`${API_PUBLISH(program._id)}`, {headers, data: {}});
      expect(published.status()).toBe(200);

      expect(await publicItemStatus(request, "programs", program.slug)).toBe(200);

      await page.goto(`${FRONTEND}/programs/${program.slug}`);
      await expect(page.getByRole("heading", {name: title, level: 1})).toBeVisible();

      // ── Updated: propagates ───────────────────────────────────────────────
      const renamed = `${title} (Revised)`;
      // No `revision` sent: omitting it skips the optimistic-concurrency check,
      // which is right here because this test is about propagation, not about
      // two editors colliding. auth/content unit tests cover the conflict path.
      const update = await request.patch(`${API_PROGRAM(program._id)}`, {
        headers,
        data: {title: renamed},
      });
      expect(update.ok()).toBeTruthy();

      await page.goto(`${FRONTEND}/programs/${program.slug}`);
      await expect(page.getByRole("heading", {name: renamed, level: 1})).toBeVisible();

      // ── Unpublished: gone ─────────────────────────────────────────────────
      const unpublished = await request.post(`${API_UNPUBLISH(program._id)}`, {headers, data: {}});
      expect(unpublished.ok()).toBeTruthy();

      expect(await publicItemStatus(request, "programs", program.slug)).toBe(404);

      // The static catalogue does not contain this slug, but even if it did the
      // page must honour the API's 404 — that is what makes unpublish mean
      // something to a visitor.
      await page.goto(`${FRONTEND}/programs/${program.slug}`);
      await expect(page).toHaveURL(new RegExp(`${FRONTEND}/programs/?$`));
    } finally {
      await purgeProgram(request, headers, program._id);
    }
  });

  test("a program that exists only in the database opens from the listing", async ({page, request}) => {
    // The regression that made this suite worth writing: a program with no entry
    // in src/data used to bounce straight back to /programs, because the detail
    // page redirected on the null it holds while the fetch is in flight.
    const {headers} = await apiLogin(request);
    const title = uniqueName("E2E Database Only Program");
    const program = await createPublishableProgram(request, headers, title);

    try {
      await request.post(`${API_PUBLISH(program._id)}`, {headers, data: {}});

      await page.goto(`${FRONTEND}/programs/${program.slug}`);

      await expect(page.getByRole("heading", {name: title, level: 1})).toBeVisible();
      await expect(page).toHaveURL(`${FRONTEND}/programs/${program.slug}`);
    } finally {
      await purgeProgram(request, headers, program._id);
    }
  });

  test("a soft-deleted program leaves the public site and comes back on restore", async ({request}) => {
    const {headers} = await apiLogin(request);
    const program = await createPublishableProgram(request, headers, uniqueName("E2E Delete Restore"));

    try {
      await request.post(`${API_PUBLISH(program._id)}`, {headers, data: {}});
      expect(await publicItemStatus(request, "programs", program.slug)).toBe(200);

      await request.delete(`${API_PROGRAM(program._id)}`, {headers});
      expect(await publicItemStatus(request, "programs", program.slug)).toBe(404);

      await request.post(`${API_PROGRAM(program._id)}/restore`, {headers, data: {}});
      // Restore returns it to the admin, but as a draft — coming back from the
      // archive must not silently republish something to the public site.
      expect(await publicItemStatus(request, "programs", program.slug)).toBe(404);

      await request.post(`${API_PUBLISH(program._id)}`, {headers, data: {}});
      expect(await publicItemStatus(request, "programs", program.slug)).toBe(200);
    } finally {
      await purgeProgram(request, headers, program._id);
    }
  });

  test("the seeded program renders on the public programs page", async ({page, request}) => {
    // Proves the listing itself is live data, not the static catalogue: this
    // slug exists only in the seeded database.
    const programs = await publicList(request, "programs");
    expect(programs.map((entry) => entry.slug)).toContain(SEEDED_PROGRAM_SLUG);

    await page.goto(`${FRONTEND}/programs/${SEEDED_PROGRAM_SLUG}`);
    await expect(page.getByRole("heading", {name: /Seeded Integration Program/i, level: 1})).toBeVisible();
  });
});
