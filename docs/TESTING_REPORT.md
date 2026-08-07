# Testing Report

Run on 2026-07-24 against `HEAD`, Windows 11 / Node 24.1.0 / npm 11.3.0.

Everything below was executed. Where a tier could not run on this machine, that
is stated explicitly with the reason and where it now runs instead — nothing in
this report is inferred from reading the code.

> **Superseded on CI.** This report predates the move to Jenkins. Every
> `.github/workflows/*` and Dependabot reference below describes a setup that no
> longer exists — in particular, the scans listed as running in `quality.yml`
> (audit, Semgrep, Trivy, Lighthouse, k6) now run nowhere automatically. The gate
> is `Jenkinsfile`: lint, unit, e2e and build, then a promotion of `dev` to
> `main`. See the CI / CD section of the README. The measurements stand.

---

## Summary

| Tier | Tool | Result |
| --- | --- | --- |
| Unit + component (frontend) | Vitest + React Testing Library | **71 passed** / 8 files |
| Component (admin) | Vitest + React Testing Library | **21 passed** / 4 files |
| API + integration (backend) | Vitest + Supertest + `mongodb-memory-server` | **191 passed** / 9 files |
| End-to-end | Playwright (Chromium + Pixel 7) | **20 passed** |
| Accessibility | `@axe-core/playwright`, WCAG 2.1 A/AA | **28 passed** after 3 fixes |
| Visual regression | Playwright `toHaveScreenshot` | **8 baselines**, all matching |
| Performance | Lighthouse 13.4.1 on the production bundle | a11y/BP/SEO **100**, perf **47** |
| Code quality | ESLint 10 (added — none existed) | **0 errors**, 23 warnings |
| Dependency scanning | `npm audit` × 3 packages | **0** production vulnerabilities |
| Load + stress | k6 | script written; k6 binary not installed here |
| SAST | Semgrep | CI only — no Windows build exists |
| Container scanning | Trivy | CI only — no Docker daemon running here |

`npm run check` (lint + 283 unit/integration tests + all three builds) exits 0.
`npx playwright test` — the whole browser suite in one run — is **48 passed, 0
failed, 8 skipped** (the 8 are visual regression on the Pixel 7 project, which is
skipped by design; see §3).

---

## 1. What was already there, and what was broken

The repository already had a real test suite: 283 unit/integration tests and a
Playwright end-to-end suite. Two things were wrong with it.

### 1.1 The E2E suite was silently testing a different application

**6 of 20 end-to-end tests failed on the first run.** The failures were all in
`frontend-sync.spec.js`, and all with the same shape: the API assertions passed,
the page assertions found a 404.

`playwright.config.js` computed isolated ports and then never used them:

```js
const FRONTEND_PORT = port("E2E_FRONTEND_PORT", 5273);   // computed
export const FRONTEND = `http://localhost:5173`;          // and ignored
```

The three `E2E_*_PORT` constants were dead. Combined with
`reuseExistingServer: !process.env.CI`, Playwright attached to whatever was
already on 5173 — on this machine, a Vite dev server belonging to an unrelated
project (`DATATHON/repo`). The suite dutifully drove someone else's website.

The file's own header comment documented the design that had been reverted:

> backend 8081, frontend 5273, admin 5274

Fixed by wiring the computed ports into the exported URLs and the `webServer`
commands, which is what the comment always described. **20/20 pass.**

This is the failure mode worth remembering: the suite was not red before, because
on CI nothing else holds port 5173. It would have kept passing in CI and lying
locally.

### 1.2 There was no linter

No ESLint, no Prettier, no TypeScript — the "Code Quality" row of the pipeline
was empty. Added `eslint.config.js` (flat config, one file covering all three
packages) with correctness rules only, no stylistic ones.

First run: **213 problems.** After fixing the config's own defects and the real
findings: **0 errors, 23 warnings.**

| Stage | Count | What |
| --- | --- | --- |
| First run | 213 | — |
| −127 | 86 | `.codex/` agent scratch was being linted; added to `ignores` |
| −54 | 32 | Unused `React` imports, dead under React 19's automatic JSX runtime — removed from 50 files |
| −2 | 30 | Rest-sibling omit pattern and the CSV byte-order mark: correct code, wrong config. Fixed with `ignoreRestSiblings` and `skipTemplates` |
| −5 | 25 | Real one-line fixes, listed below |
| −2 → warn | 23 | Two React rules downgraded, explained below |

Real defects the linter found and that are now fixed:

- `src/pages/HomePage.jsx` — `Link` imported, never used.
- `src/pages/AlumniPage.jsx:75` — unused positional binding in a destructure.
- `src/components/MagicBento.jsx:458` — unused `index` argument.
- `backend/src/services/content.service.js:406` — `let` that is never reassigned.
- `backend/src/services/content.service.js:149` — `resource` destructured from the options object and never read.
- `src/hooks/useContent.test.jsx:81,173` — `new Promise((resolve) => setTimeout(resolve, 20))` returns the timer id from the executor.
- `src/components/ui/Antigravity.jsx:1` — `eslint-disable react/no-unknown-property` for a plugin that is not installed.

All 283 tests and all three builds still pass after the 50-file import cleanup.

### 1.3 The 23 remaining warnings

These are **not** noise, and they are not fixed. They are warnings rather than
errors so that `npm run lint` is green on arrival and catches anything *new* —
a gate that is red from the first commit is a gate people learn to bypass.

| Count | Rule | Where |
| --- | --- | --- |
| 13 | `react-hooks/set-state-in-effect` | 8 admin/frontend components + `src/hooks/useContent.js:127` |
| 7 | `react-hooks/purity` | `Antigravity.jsx` (×6), `LaserFlow.jsx:282` — `Math.random()` / `performance.now()` during render |
| 2 | `react-hooks/exhaustive-deps` | `src/lib/structuredData.js:215` |
| 1 | unused disable directive | `backend/src/services/content.service.js:426` |

Each needs a judgement about intended behaviour, not a mechanical fix.
`useContent.js:127` is the clearest example: it resets item state when the route
changes, which is exactly the cascading render the rule objects to, and also
exactly what stops the previous program's copy from showing on the next
program's page. Promote the rules to `error` as the sites are worked through.

---

## 2. Accessibility — 3 real defects found and fixed

New: `e2e/accessibility.spec.js`, axe-core against the running stack across 8
public pages plus admin login and dashboard, on desktop and Pixel 7.

**First run: 11 failures.** They reduced to three root causes.

### 2.1 WhatsApp button contrast — every public page

`.whatsapp-fab__tip` was `#fff` on `#25d366`: **1.96:1**, against the 4.5:1 WCAG
AA requires at that size. One shared component, so it failed all 8 pages at once.

Fixed by darkening the label to `#0b3d1f` — **5.5:1** — which leaves the
recognisable WhatsApp green exactly where it was, on the background. The CSS
comment defending the brand colour is still true.

> Still open, deliberately not changed: the white *icon* on that same green is
> also 1.96:1, against the 3:1 WCAG 1.4.11 wants for meaningful graphics. axe
> does not flag it under the A/AA tags. Fixing it means darkening the button
> background, which is a brand decision rather than a bug fix — your call.

### 2.2 Keyboard trap in the logo marquee — programs page

`TrustedCompanies.jsx` renders the logo row twice and marks the duplicate
`aria-hidden="true"`. Every `LogoCard` carried `tabIndex={0}`, so four focusable
elements sat inside a subtree screen readers had been told did not exist —
keyboard users tabbed into content with no announced name (`aria-hidden-focus`).

Fixed by threading a `decorative` prop through so the duplicate's cards get
`tabIndex={-1}`.

### 2.3 Two admin contrast failures, mirror images of each other

| Element | Was | On | Ratio | Now | Ratio |
| --- | --- | --- | --- | --- | --- |
| `.nav-heading` | `#64748b` | sidebar `#0f172a` | 3.47:1 | `#94a3b8` | 6.5:1 |
| `.recent-item-meta` | `#94a3b8` | panel `#ffffff` | 2.56:1 | `#64748b` | 4.78:1 |
| `.section-kicker` | `#6366f1` | panel `#ffffff` | 4.47:1 | `#4f46e5` | 6.3:1 |

The same two slate values, each used on the wrong background. `.section-kicker`
missed AA by 0.03.

**All 28 accessibility and visual tests now pass.** Lighthouse independently
scores accessibility **100**.

### 2.4 One test-harness defect, also fixed

The home page's axe run failed intermittently — twice in four runs — with
`Execution context was destroyed`. Not a WCAG violation: a probe showed the main
frame navigating twice. Home pulls the heaviest dependency graph on the site
(three.js, gsap, framer-motion), so on a cold Vite server it is the page that
triggers dependency pre-bundling, and the resulting full reload landed in the
middle of axe's `page.evaluate`.

Fixed with a `beforeAll` that warms the server, so the reload happens before
anything is measured. Verified 4/4 consecutive passes. No retries were added —
this project sets `retries: 0` on purpose, and hiding this behind a retry would
have hidden a real cause.

---

## 3. Visual regression

Playwright's built-in `toHaveScreenshot`, not Percy/Chromatic/Applitools: those
are hosted services with an account, a token and a per-snapshot bill, and for a
site this size a committed PNG diff gives the same answer for free.

8 baselines in `e2e/accessibility.spec.js-snapshots/`. Canvas elements are
masked (the particle fields seed from `Math.random`, so their pixels differ every
run by design) and `maxDiffPixelRatio: 0.02` absorbs font-hinting differences.

Two honest caveats:

- **Baselines are platform-specific.** The committed set is `-win32.png`. A Linux
  CI runner will generate its own `-linux.png` set on first run and compare
  against that.
- **The home page is excluded** — from visual regression only; its accessibility
  check still runs. Playwright requires two identical consecutive screenshots
  before it will compare at all, and the three.js hero never stops moving, so the
  page never reaches that state. Masking does not help: the mask applies to the
  comparison, not the stability check.

The colour fixes in §2 were absorbed under the 2% threshold, so the baselines did
not need regenerating. Use `npm run test:visual:update` after an intentional
design change.

---

## 4. Performance — Lighthouse

Lighthouse 13.4.1 against the **production build** (`npm run build:frontend`,
served from `dist/`), default mobile preset: 4× CPU throttle, simulated slow 4G.

| Category | Score |
| --- | --- |
| Performance | **47** |
| Accessibility | **100** |
| Best Practices | **100** |
| SEO | **100** |

| Metric | Value |
| --- | --- |
| First Contentful Paint | 4.3 s |
| Largest Contentful Paint | 6.7 s |
| Total Blocking Time | 800 ms |
| Cumulative Layout Shift | **0** |
| Main-thread work | 3.6 s |

CLS of 0 is genuinely good and not easy to achieve on a page like this.

### What is actually costing the performance score

Transferred on first load of `/`:

| Asset | Transfer |
| --- | --- |
| `index-*.js` | 282 KiB |
| `index-*.css` | 162 KiB |
| `vendor-motion-*.js` (framer-motion) | 127 KiB |
| `blogPosts-*.js` | 115 KiB |
| `programCatalog-*.js` | 78 KiB |
| `vendor-react-*.js` | 50 KiB |

The code splitting is working. `three.module.js` (733 KiB) and
`Antigravity.js` (159 KiB) — by far the largest chunks in `dist/` — are **not**
in that list; they load behind `DeferUntilVisible`.

**Lighthouse's "Reduce unused JavaScript — est. savings 192 KiB" is a false
positive here.** That figure is almost exactly `blogPosts` + `programCatalog`,
and `src/lib/routeChunks.js` fetches those deliberately, after the `load` event,
inside `requestIdleCallback`, with a `saveData`/2G opt-out. They do not compete
with first paint. Acting on that Lighthouse row would remove a feature that is
working as designed.

The genuine opportunity is the row next to it: **render-blocking CSS, est. 900 ms**.
One 162 KiB stylesheet blocks first paint and 58 KiB of it is unused on the home
page. That is the single highest-value performance change available.

---

## 5. Security and dependencies

| Check | Result |
| --- | --- |
| `npm audit --omit=dev` (root) | 0 vulnerabilities |
| `npm audit --omit=dev` (backend) | 0 vulnerabilities |
| `npm audit --omit=dev` (admin) | 0 vulnerabilities |
| `npm audit` including dev | 2 high — `shell-quote` via `concurrently` |

The two high-severity findings are a quadratic-complexity DoS in `shell-quote`,
reached only through `concurrently`, which is a **development** dependency used
by `npm run dev`. It is not in any of the three production images. Worth clearing
on the next `concurrently` major, not worth a breaking upgrade today.

Two things were checked by hand because they are the classic Cloud Run mistakes,
and both are already correct:

- `app.set("trust proxy", 1)` — exactly one hop, so `req.ip` is the real client
  and the rate limiter works, without letting a direct caller forge
  `X-Forwarded-For`.
- No secrets in the repo; `backend/.env` is gitignored and `.env.example` carries
  only placeholders.

### Not run on this machine

| Tool | Why | Where it runs now |
| --- | --- | --- |
| Semgrep | No native Windows build — needs WSL or a container | `quality.yml` → `sast`, results to GitHub code scanning |
| Trivy / Docker Scout | Docker daemon is not running here | `quality.yml` → `containers`, all three images, results to code scanning |
| k6 | Separate binary, not installed (`winget install k6`) | `tests/load/public-read.js`, `quality.yml` → `load` (manual) |
| OWASP ZAP | Needs a deployed target; scanning localhost proves nothing about Cloud Run | not wired — run against staging when one exists |
| Percy / Chromatic / Applitools | Hosted, need an account and a token | replaced by Playwright screenshots (§3) |
| Snyk | Needs an account; `npm audit` + Dependabot cover the same ground | not wired |

The k6 script is written but has not been executed, so this report contains **no
load-test numbers**. Two notes for when you run it: the public limiter allows 200
req/min *per IP*, so a single-source load test correctly gets 429s past ~3 req/s
(the script counts those separately rather than as errors), and the thresholds in
it are guesses until they are calibrated against a real Cloud Run deploy.

---

## 6. What was added

| File | Purpose |
| --- | --- |
| `eslint.config.js` | Flat config covering all three packages |
| `e2e/accessibility.spec.js` | axe-core WCAG 2.1 A/AA + visual regression |
| `e2e/accessibility.spec.js-snapshots/` | 8 committed PNG baselines |
| `tests/load/public-read.js` | k6 load and stress profile |
| `.github/workflows/quality.yml` | audit, Semgrep, Trivy, Lighthouse, k6 |
| `.github/dependabot.yml` | Weekly, grouped, all 3 lockfiles + Dockerfiles + Actions |
| `cloudbuild.yaml` | Build and deploy all three services inside GCP |
| `.gcloudignore` | Explicit build-context upload rules |

Modified: `playwright.config.js` (§1.1), `package.json` (lint and test scripts),
`.github/workflows/tests.yml` (lint added to the deploy gate), `README.md`, plus
the source files listed in §1.2 and §2.

### Where each tier runs

`tests.yml` is the **release gate** — fast, and red only when something is really
wrong: `npm run lint`, `npm run test:all`, Playwright, then deploy.

`quality.yml` holds the scans that must **not** gate a release: `audit`, `sast`,
`containers`, `lighthouse` on every push/PR plus a weekly cron (new CVEs land
against unchanged code), and `load` on manual dispatch only. A base-image CVE
with no fix released yet should not wedge every PR on a problem nobody in this
repo can fix, so Trivy reports rather than blocks.

---

## 7. Recommended next, in order

1. **Split the 162 KiB stylesheet.** ~900 ms of render-blocking time on mobile,
   58 KiB of it unused on the home page. The clearest performance win available.
2. **Decide on the WhatsApp icon contrast** (§2.1). A brand decision, not a bug.
3. **Work through the 13 `set-state-in-effect` warnings**, then promote the rule
   to `error`. Start with `useContent.js:127`, which is the one that carries a
   real behavioural constraint.
4. **Calibrate the k6 thresholds** against a deployed Cloud Run service. The
   numbers in the script today are placeholders.
5. **Regenerate visual baselines on Linux** in CI, or accept that the committed
   `-win32` set only guards local runs.
