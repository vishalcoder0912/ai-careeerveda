# CareerVeda — Full Repository Audit

**Scope:** read-only audit of the entire repo (`Scene_one_career_veda/`).
**Date:** 2026-07-23. **Mode:** no files modified except this report.
**Package manager (auto-detected):** **npm** — `package-lock.json` in root, `admin/`, `backend/`; no `pnpm-lock.yaml`/`yarn.lock`/`bun.lockb`.

> **Superseded on CI.** This report predates the current pipeline. Every
> `.github/workflows/*` and Dependabot reference below describes a setup that no
> longer exists; the gate is now `.github/workflows/ci-cd.yml`, which promotes
> `dev` to `main` only after audit, lint, unit, e2e and build all pass. See the
> CI / CD section of the README. The rest of the audit stands.

## Project shape

Three independent npm packages, **not** an npm workspace (no `workspaces` field). Root scripts orchestrate the others via `npm --prefix`:

| App | Path | Stack | Deploy target (per code/comments) |
|-----|------|-------|-----------------------------------|
| Frontend (public site) | `/` (`src/`) | React 19, Vite 6, React Router 7, Three.js | Vercel (`vercel.json`) |
| Admin panel | `admin/` | React 19, Vite 6, React Router 7 | Vercel/static |
| Backend API | `backend/` | Express 4, Mongoose 8, Zod, argon2, JWT | Cloud Run (comments) |
| Serverless fallback | `api/` | Vercel functions, `mongodb` driver | Vercel |

Plain JavaScript (no TypeScript, no `tsconfig`). No ESLint config, no lint/typecheck scripts, no `.github/` CI workflows, no Dockerfile.

---

## Verification results (all commands executed)

| Command | Result |
|---------|--------|
| `npm test` (frontend, vitest) | ✅ **54/54 passed** (4 files) |
| `npm --prefix admin test` | ✅ **15/15 passed** (2 files) |
| `npm --prefix backend test` | ✅ **166/166 passed** (6 files, in-memory Mongo, 63s) |
| `npm run build:frontend` (vite) | ✅ built (⚠️ chunk >500 KB warning) |
| `npm run build:admin` (vite) | ✅ built |
| `npm run build:backend` (`node --check`) | ✅ "backend build ok" |
| `npm audit --omit=dev` (×3) | ✅ **0 vulnerabilities** in all three |
| lint / typecheck | ⛔ **not present** (no script, no config) |

**Total: 235 tests, 0 failing. 3/3 builds pass. 0 dependency vulnerabilities.**

---

## 1. Confirmed bugs

### 1.1 — React rules-of-hooks violation in `ResourceList` (latent crash)
- **Severity:** Medium
- **Category:** React / correctness
- **File:** `admin/src/pages/ResourceList.jsx:55-68`
- **Evidence:** Two conditional early returns (`if (!resource) return …` L55, `if (resource.permission && !can(...)) return <Forbidden/>` L56) sit **before** the `useState` calls (L58+). `ResourceEditor.jsx` does the opposite (all hooks first, returns at L132) — so the correct pattern already exists in the codebase.
- **Why it's a problem:** The route is `<Route path="/:resource" element={<ResourceList/>} />`. Navigating between resources reuses the same component instance. A render that hits an early return calls **0 hooks**; a render that doesn't calls **10**. React then throws *“Rendered more/fewer hooks than during the previous render.”*
- **Reproduce:** In the admin, open `/programs` (hooks run), then navigate to any unknown single-segment URL (e.g. `/nope`) or a resource the account lacks read permission for → white-screen crash in dev, broken screen in prod.
- **Fix:** Move all `useState`/`useEffect`/`useCallback` above the two early returns (mirror `ResourceEditor.jsx`).
- **Automated test can catch:** Yes — `eslint-plugin-react-hooks` flags it statically; a render test navigating valid→unknown resource reproduces the throw.

### 1.2 — "Get in Touch" anchor scroll lands ~1,400 px short (working-tree change)
- **Severity:** Medium
- **Category:** React / navigation
- **File:** `src/App.jsx` (`ScrollToHash`) + hero link `src/components/Hero.jsx:106`
- **Evidence:** Measured on the running site: clicking **Get in Touch** (`to="/#consultation"`) sets `location.hash` and scrolls, but the target `#consultation` ends up ~1,412–1,495 px below the viewport top. The heavy home page (3D hero + images without reserved dimensions) grows *after* the initial scroll, moving the section down; the correction passes don't fully converge.
- **Why it's a problem:** The primary hero CTA leaves the user on the wrong section (a "Recognition" band, not the consultation form).
- **Reproduce:** Load `/`, click **Get in Touch**, observe landing position vs. the consultation form.
- **Fix (ponytail-preferred):** Add `scroll-margin-top` to `#consultation` and fix layout shift at the source — set explicit `width`/`height` (or `aspect-ratio`) on the hero/above-the-fold images so the section's document position is stable before the scroll. That likely removes the need for the JS correction loop entirely (see §9.1).
- **Automated test can catch:** Partially — a Playwright test asserting `#consultation` sits near the top after click; layout-shift root cause is better caught by a CLS check.

### 1.3 — Gallery field was unrenderable (already fixed this session, noted for record)
- **Severity:** was High → **resolved**
- **File:** `admin/src/config/resources.js:110` (`kind: "mediaList"`) + `admin/src/components/Fields.jsx`
- **Evidence/Note:** `mediaList` had no renderer, fell through to a text input, sent a string where `programBody.gallery` (Zod) requires an array → `"Expected array, received string"` blocked all program saves. A `MediaListField` renderer was added and verified. No action needed; listed for completeness.

---

## 2. Security vulnerabilities

**Overall posture is strong.** No Critical/High findings. Verified good: argon2 hashing; JWT with pinned `HS256`, issuer/audience; refresh-token rotation with reuse detection & family revocation (`token.service.js`); double-submit CSRF on cookie routes only (`csrf.js`); CORS allow-list (not reflector) with `credentials`; helmet CSP locked to `'none'`; Mongo-operator sanitization; Zod as the mass-assignment boundary; RBAC fails closed; upload magic-byte sniffing + SVG rejection + folder allowlist (`imagekit.service.js`); per-category rate limits (`rateLimit.js`).

### 2.1 — Lead dual-write path splits data across collections
- **Severity:** Low (data visibility, not a breach)
- **Category:** API / data integrity
- **Files:** `api/consultation.js:16`, `api/enroll.js:14`, vs `backend/src/models/Lead.js`
- **Evidence:** When `VITE_PUBLIC_API_BASE_URL` is unset, `src/lib/publicApi.js:128` posts leads to the Vercel functions, which write to `consultations`/`enrollments` collections. The admin **Leads** inbox reads the backend `Lead` collection only. Documented as an intentional fallback, but the two stores never reconcile.
- **Why it's a problem:** In a deploy where the frontend isn't pointed at the backend, real leads land in collections no one in the admin panel can see.
- **Reproduce:** Deploy frontend without `VITE_PUBLIC_API_BASE_URL`; submit the consultation form; the lead never appears in admin Leads.
- **Fix:** Point the frontend at the backend in every environment (set `VITE_PUBLIC_API_BASE_URL`), or have the serverless functions write to the same `leads` collection/shape the backend reads. Ponytail view: delete `api/` once the backend is always configured (§9.3).
- **Automated test can catch:** Partially (integration test asserting a single lead sink per env).

### 2.2 — Secrets handling (positive finding)
- **Severity:** Informational
- **Evidence:** `git ls-files | grep .env` returns only `*.env.example`. Real `.env` files are git-ignored (`.gitignore`) and untracked. `MONGODB_URI`/keys deliberately have **no `VITE_` prefix** (would inline into the client bundle). `env.js` refuses to boot on invalid config and prints variable **names, not values**.

---

## 3. Build, lint and test failures

| Item | Severity | Evidence | Fix |
|------|----------|----------|-----|
| No lint tooling | Informational→Low | No ESLint config, no `lint` script | Add ESLint + `eslint-plugin-react-hooks` — would have caught §1.1 |
| No typecheck | Informational | Plain JS, no `tsconfig` | Optional: `checkJs` + JSDoc, or TS migration |
| No CI/CD | Low | `.github/` absent | Add a workflow running `npm run check` (test:all + build:all) on PR |
| Frontend chunk >500 KB | Low | `three.module-*.js` **733 KB / 189 KB gz** | Dynamic-import the Three.js hero; lazy-load below the fold |
| Backend "build" is only `node --check` | Informational | `backend/package.json:12` | Fine for Node ESM; note there's no bundling/gate beyond syntax check |

No test or build **failures** — everything that exists passes.

---

## 4. API and database issues

- **Validated clean:** every admin/public route runs Zod `validate()`; `content.service.js` centralizes the soft-delete filter (`buildFilter`), caps page size (`MAX_LIMIT=100`), whitelists sort fields (prevents unindexed-scan DoS), and uses optimistic concurrency (`revision`). `contentPlugin.js` adds the compound indexes the read paths need. `fetchList` requests `limit:100` so blog listings aren't truncated.
- **4.1 Lead collection split** — see §2.1 (Low).
- **4.2 — Blog "not appearing" is expected behavior, not a bug** — Severity: Informational. The public route (`content.service.listPublic` + `publishedFilter`) returns only `published`/`scheduled` records. A blog saved as **draft** correctly does not appear on the frontend. Needs user confirmation (see §10).

---

## 5. Frontend and React issues

- **5.1** Rules-of-hooks violation — §1.1 (Medium).
- **5.2** "Get in Touch" scroll — §1.2 (Medium).
- **5.3** `ScrollToHash` poll loop complexity — §9.1 (ponytail, Low).
- **Verified good:** `useContent.js` fetch effects have correct deps (`[resource, paramsKey]`) with abort cleanup; `adapt`/`fallback` held in refs to avoid refetch churn; `ScrollToTop` correctly defers to the hash case. `api.js` (admin) single-flight refresh prevents self-inflicted token-reuse.

---

## 6. Deployment issues

| Item | Severity | Evidence |
|------|----------|----------|
| Backend has no deploy manifest in repo | Low | No `Dockerfile`/`docker-compose`/Cloud Run yaml; comments reference Cloud Run but nothing codifies it |
| `vercel.json` covers frontend only | Informational | SPA rewrite excluding `/api/`; correct for the frontend + serverless functions |
| Env matrix undocumented | Low | Frontend needs `VITE_PUBLIC_API_BASE_URL`; backend needs Mongo/JWT/ImageKit — split across three `.env.example` files, no single deploy runbook |

No broken deployment config detected; the gap is *missing* backend deployment definition, not a faulty one.

---

## 7. Performance issues

- **7.1** Three.js bundle **733 KB (189 KB gz)** — Low. Largest cost on first paint; dynamic-import the hero scene.
- **7.2** `ScrollToHash` runs a `setTimeout` poll (up to ~25 tries) + 3 correction passes on every hash navigation — Low, and a symptom of the layout-shift root cause (§1.2).
- **Verified good:** list reads use `.lean()`; `countDocuments` + `find` run in parallel; ImageKit transforms request thumbnail sizes not full sources; per-section GSAP parallax withheld on phones.

---

## 8. Missing / weak test coverage

| Untested surface | Severity | Note |
|------------------|----------|------|
| `ScrollToHash` / anchor navigation | Low | No test; would have flagged §1.2 |
| Admin card view + view toggle (`ResourceList`) | Low | New code, no unit/render test |
| `mediaList` gallery field render + array payload | Low | The regression that shipped (§1.3) had no test |
| `ResourceList` navigate valid→unknown resource | Medium | Would reproduce the hooks crash (§1.1) |
| Backend coverage is otherwise strong | — | 166 tests cover auth, RBAC, content, leads, media |

---

## 9. Ponytail simplification findings

### 9.1 — `ScrollToHash` is over-built for the job
`src/App.jsx` — the poll-until-mounted + 3 timed correction passes + live header-offset measurement is a lot of JS for "scroll to an anchor." Root cause is layout shift, not scrolling.
→ **skipped: the JS correction loop. add when:** CSS can't solve it. First try `#consultation { scroll-margin-top: 84px }` + reserved image dimensions so the section doesn't move; then a single `scrollIntoView` (or the browser's native hash scroll) likely suffices.

### 9.2 — `probe-tmp.mjs` is dead and tracked
Root `probe-tmp.mjs` is a leftover Playwright probe that `import`s `"playwright"` — a package **not in any `package.json`** (only `@playwright/test` is). It would throw `ERR_MODULE_NOT_FOUND` if run.
→ **delete it.** Also untrack `test-results/.last-run.json` (build artifact) and add `test-results/` to `.gitignore`.

### 9.3 — `api/` serverless duplicates the backend lead path
Two lead sinks with two validation copies (`api/_db.js` vs backend `Lead`/validators). YAGNI once the backend is always configured.
→ **skipped: removing it. add when:** you confirm every environment sets `VITE_PUBLIC_API_BASE_URL`; then delete `api/` and the `legacyEndpoint` fallback in `publicApi.js`. Until then, mark the ceiling with a `ponytail:` comment (dual sink, collapse when backend is guaranteed).

### 9.4 — No lint means class-of-bug repeats
The hooks crash (§1.1) is exactly what `eslint-plugin-react-hooks` exists to prevent. One dep + one config file closes the category.

---

## 10. Items requiring manual verification

1. **Blog draft vs published (§4.2)** — confirm the blog you added was actually **Published** (not left as Draft). If published and still missing, capture the browser Network tab for `GET /api/v1/public/blogs` to see if it's returned.
2. **"Get in Touch" landing on the production build (§1.2)** — verify against a `vite build` + `preview`, not just dev; layout-shift timing differs.
3. **Backend deploy target (§6)** — no Cloud Run/Docker manifest is in the repo; confirm where/how the backend is deployed and that its env vars are set.
4. **Lead sink per environment (§2.1)** — confirm `VITE_PUBLIC_API_BASE_URL` is set in every frontend deploy so leads reach the admin inbox.

---

## Summary

### Commands executed
`find`/`git ls-files` (structure, tracked env, artifacts); `npm test` (root); `npm --prefix admin test`; `npm --prefix backend test`; `npm run build:frontend|admin|backend`; `npm audit --omit=dev` (×3); targeted `git grep`.

### Commands that failed
None. (No `lint`/`typecheck` scripts exist to run.)

### Tests
- Frontend **54/54** ✅ · Admin **15/15** ✅ · Backend **166/166** ✅ — **235 passed, 0 failed.**

### Build status
- Frontend ✅ (chunk-size warning) · Admin ✅ · Backend ✅ (`node --check`).

### Dependency vulnerabilities
- **0** (npm audit, all three packages).

### Findings by severity
| Severity | Count | Items |
|----------|-------|-------|
| Critical | 0 | — |
| High | 0 | — |
| Medium | 2 | §1.1 hooks crash, §1.2 Get-in-Touch scroll |
| Low | 8 | §2.1, §3 (lint/CI/chunk), §6 (deploy manifest/env), §7.1, §7.2, §9.2 |
| Informational | 6 | §2.2, §3 (typecheck), §4.2, §6 (vercel), §9.3, §9.4 |

### Production-readiness score: **82 / 100**
Strong backend security, 235 passing tests, 0 dependency vulns, and clean secret handling carry it. Deductions: latent React crash (−6), unresolved hero-CTA scroll regression in the working tree (−4), no lint/typecheck/CI safety net (−5), lead-path data split risk (−2), hygiene/perf (−1).

### Prioritized remediation order
1. **§1.1** Move hooks above early returns in `ResourceList.jsx` (Medium, ~2 lines, prevents a crash).
2. **§1.2 / §9.1** Fix the Get-in-Touch scroll via `scroll-margin-top` + reserved image dimensions; simplify/remove the JS loop (Medium).
3. **§9.4 / §3** Add ESLint + `eslint-plugin-react-hooks` and a CI workflow running `npm run check` (prevents §1.1's whole class).
4. **§2.1 / §10.4** Guarantee `VITE_PUBLIC_API_BASE_URL` per env so leads reach the admin inbox.
5. **§9.2** Delete `probe-tmp.mjs`; untrack `test-results/`.
6. **§7.1** Code-split the Three.js hero.
7. **§6** Add the backend deployment manifest + a single env runbook.
8. **§9.3** Retire the `api/` dual path once the backend is always configured.

*No fixes applied — audit only.*
