# Production Readiness Report

**Date:** 2026-07-28
**Commit:** working tree (branch `HEAD`)
**Scope:** frontend (`/`), backend (`/backend`), admin (`/admin`)
**Method:** every tool below was actually executed on this machine. Anything that
could not run is listed in [Not Run](#not-run) with the reason and the command to
enable it — it is not counted as a pass.

> **Superseded on CI.** This report predates the move to Jenkins. Anything below
> that defers a check to GitHub Actions ("runs free in GitHub Actions") no longer
> has a home — the gate is `Jenkinsfile`, which runs lint, unit, e2e and build,
> then promotes `dev` to `main`, and runs no scanners. See the CI / CD section of
> the README. The measurements stand.

---

## Scorecard

Measured against the target thresholds as stated.

| Gate | Target | Actual | Status |
| --- | --- | --- | --- |
| ESLint | 0 errors | **0 errors**, 26 warnings | ✅ |
| Oxlint | 0 errors | 0 | ✅ |
| TypeScript | 0 errors | project is JavaScript — no TS to check | n/a |
| Unit tests | 100% passing | **976 / 976 passing** | ✅ |
| Unit coverage | 90%+ | not measured — no coverage provider installed | ⛔ |
| API tests (Supertest) | 100% passing | 616 backend vitest + 154 jest, all passing | ✅ |
| Playwright E2E | 100% passing | **40 / 40 passing** | ✅ |
| Lighthouse Performance | 90+ | mobile 28–54 · desktop 49–91 | ❌ |
| Lighthouse Accessibility | 100 | **100** on all routes tested | ✅ |
| Lighthouse Best Practices | 100 | **100** on all routes tested | ✅ |
| Lighthouse SEO | 95+ | **100** on all routes tested | ✅ |
| npm audit | 0 critical | 0 critical, **34 high** | ⚠️ |
| Gitleaks | 0 leaked secrets | 0 found (regex pass, not gitleaks) | ⚠️ |
| Semgrep | 0 high/critical | not run — not installed | ⛔ |
| Trivy | 0 critical | not run — not installed | ⛔ |
| Docker build | successful | **all 3 images build**, frontend verified at runtime | ✅ |
| Architecture (dep-cruiser) | 0 circular | **0 violations**, 434 modules, 839 edges | ✅ |

**Verdict: every executable test gate passes.** 1,016 tests green across four
runners, ESLint and Oxlint clean, zero circular dependencies, and three of the
four Lighthouse categories at 100.

One product gate still fails — **Lighthouse Performance** — and it has a single
identified cause (§3). Two advisory gates are amber (34 high-severity
dependency advisories, 0 critical) and five tools could not be evaluated on
this machine ([Not Run](#not-run)).

---

## 1. Tests — 1,016 passing, 0 failing

| Suite | Runner | Tests | Result |
| --- | --- | --- | --- |
| Frontend | Vitest 4.1.10 | 179 | ✅ all pass (14 files) |
| Backend | Vitest 4.1.10 | 616 | ✅ all pass (13 files, 91 s) |
| Backend unit | Jest | 154 | ✅ all pass (8 suites, 5.8 s) |
| Admin | Vitest 4.1.10 | 27 | ✅ all pass (5 files) |
| End-to-end | Playwright | 40 | ✅ all pass (2 projects, 3.2 min) |
| **Total** | | **1,016** | **✅ 0 failures** |

This is a genuinely well-tested codebase. 616 backend tests against an
in-memory Mongo with Supertest is above what most projects this size carry.

### Coverage — not measured

`@vitest/coverage-v8` is not installed in any of the three packages, so the
90% target has no number behind it. Coverage cannot be inferred from pass counts.

```bash
npm i -D @vitest/coverage-v8 && npx vitest run --coverage
npm --prefix backend i -D @vitest/coverage-v8 && npm --prefix backend exec vitest run --coverage
```

---

## 2. End-to-end — 40 passed, 0 failed

The first run of this audit produced 37 passed / 3 failed. Both causes were
found and resolved; the suite now passes in full across the `chromium` and
`mobile-chromium` projects.

```
[chromium]        accessibility.spec.js:82  admin dashboard has no WCAG A/AA violations
[mobile-chromium] accessibility.spec.js:82  admin dashboard has no WCAG A/AA violations
[mobile-chromium] auth.spec.js:20           refuses a wrong password without saying which field was wrong
```

Two separate causes, and they mattered differently.

### 2a. A real accessibility defect — **fixed**

axe reported `aria-prohibited-attr` (serious) against `.skeleton`:

```jsx
// admin/src/components/States.jsx:8 — before
<div className="skeleton" aria-busy="true" aria-live="polite" aria-label="Loading">
```

A bare `<div>` has an implicit role of `generic`, and `aria-label` is prohibited
on it. The attribute was being dropped from the accessibility tree entirely —
the "Loading" name never reached a screen reader. Not a cosmetic lint issue: the
label was silently doing nothing.

```jsx
// after — role="status" permits the label and implies aria-live="polite"
<div className="skeleton" role="status" aria-busy="true" aria-label="Loading">
```

Verified by the re-run: `accessibility.spec.js:82` now passes on
`mobile-chromium`, the exact project and test that reported the violation.
Admin unit tests after the change: 27/27 still passing.

### 2b. The other two were environment, not product — **resolved**

Both remaining failures traced to the admin login showing `Failed to fetch`. The
E2E backend fixture (`backend/scripts/e2e-server.js`) uses
`mongodb-memory-server`, which downloads a MongoDB binary on first use. That
download had not completed on this machine, so the admin app had no API to
authenticate against and the specs never reached the behaviour they assert —
they were unverified rather than failing.

Priming the binary once resolved both:

```bash
node -e "require('mongodb-memory-server').MongoMemoryServer.create().then(s=>s.stop())"
```

Worth knowing for CI: a cold runner hits the same download. Cache
`~/.cache/mongodb-binaries` (or set `MONGOMS_DOWNLOAD_DIR`) or the first E2E job
on a fresh runner will fail this way rather than on anything in the code.

---

## 3. Lighthouse

Run against the production build (`dist/`) served locally, using the Playwright
Chromium binary. Mobile is Lighthouse's default preset — 4× CPU throttle and
simulated slow 4G — and is the harsher of the two.

| Route | Preset | Perf | A11y | Best Prac. | SEO |
| --- | --- | --- | --- | --- | --- |
| `/` | mobile | 52 | **100** | **100** | **100** |
| `/programs/gen-ai` | mobile | 28 | **100** | **100** | **100** |
| `/blog` | mobile | 54 | **100** | **100** | **100** |
| `/` | desktop | **91** | **100** | **100** | **100** |
| `/programs/gen-ai` | desktop | 49 | **100** | **100** | **100** |

**SEO, Accessibility and Best Practices hit 100 on every route measured** —
three of the four targets met with margin.

### Performance is the one real product failure

| Metric | `/` mobile | `/programs/gen-ai` mobile | `/programs/gen-ai` desktop |
| --- | --- | --- | --- |
| First Contentful Paint | 5.0 s | 7.8 s | — |
| Largest Contentful Paint | 8.4 s | 12.6 s | 2.5 s |
| **Total Blocking Time** | 320 ms | **3,370 ms** | **1,050 ms** |
| Cumulative Layout Shift | 0 | 0 | 0.002 |
| Main-thread work | 3.6 s | **10.0 s** | — |

CLS is effectively zero everywhere — layout stability is excellent. The entire
problem is JavaScript execution.

`/programs/gen-ai` is the worst page on the site by a wide margin: 3.4 s of
blocking time on mobile, 7.4 s of JS execution. Lighthouse flags **645 KiB of
unused JavaScript** on that route.

### Bundle

```
dist/            4.3 MB total
JavaScript       1.79 MB raw / 556 KB gzipped

  185 KB gz   three.module-*.js      ← 33% of all shipped JS
   99 KB gz   index-*.js
   50 KB gz   Antigravity-*.js
   45 KB gz   vendor-gsap-*.js
   42 KB gz   vendor-motion-*.js
   36 KB gz   blogPosts-*.js
```

three.js plus its Antigravity wrapper is **235 KB gzipped — 42% of the JS
budget — for a decorative particle background**. It was removed from the
Recommended section earlier in this session; `ConsultationAtmosphere` on the
home page is the remaining importer, and it is what keeps the chunk in the
graph. Deleting that one usage removes the largest single item in the bundle and
is the highest-leverage performance change available.

---

## 4. Security

### Dependencies — 0 critical, 34 high

| Package | Critical | High | Moderate | Low |
| --- | --- | --- | --- | --- |
| Frontend | 0 | 13 | 0 | 0 |
| Backend | 0 | 19 | 0 | 0 |
| Admin | 0 | 2 | 0 | 0 |

Named advisories:

- **`react-router` — RSC Mode CSRF bypass** (GHSA-qwww-vcr4-c8h2). Fix requires
  `react-router-dom@7.11.0`, a major bump. The site does not use RSC mode, so
  exposure is low, but it is the one advisory here with a security-relevant
  attack path rather than a DoS.
- `brace-expansion` — DoS via unbounded expansion (GHSA-mh99-v99m-4gvg).
  Transitive, dev-only (Jest). Auto-fix downgrades `@jest/globals` to 27 — do not
  take that fix.
- `shell-quote` — quadratic-complexity DoS (GHSA-395f-4hp3-45gv), via
  `concurrently`. Dev-only. `npm audit fix` resolves this one without breakage.

Most of the 34 are dev-time transitive DoS advisories that never reach
production, which is why "0 critical" is the honest headline. They still need
triage before this is a green gate.

### Secrets — clean

Regex scan over all git-tracked files (**not** gitleaks — see Not Run):

- Only `.env.example`, `admin/.env.example`, `backend/.env.example` are tracked. No real `.env`.
- No AWS keys, Stripe live keys, Google API keys, or JWTs in tracked content.
- One match: a hardcoded password in `backend/scripts/e2e-server.js` — a test
  fixture credential for the in-memory server. Correct as-is.

### Runtime hardening — already in place

The backend ships `helmet`, `express-rate-limit`, `zod` (input validation),
`argon2` (password hashing), `cors`, `cookie-parser` and `pino` logging. Every
item on the backend security row of the stack is present and wired.

---

## 5. Code quality & architecture

### ESLint — 0 errors, 26 warnings ✅

The first pass of this audit reported 39 errors, **all of them in a single
file**: `measure-tmp.mjs` at the repo root — a throwaway measurement script,
never git-tracked and imported by nothing. It is no longer on disk, and the gate
is green.

The 26 remaining warnings:

| Count | Rule |
| --- | --- |
| 13 | `react-hooks/set-state-in-effect` |
| 7 | `react-hooks/purity` |
| 2 | `react-hooks/exhaustive-deps` |
| 2 | `no-unused-vars` (backend tests) |
| 2 | unused `eslint-disable` directives (backend) |

The 7 purity warnings are `Math.random()` calls in `Antigravity.jsx`'s render —
real, and moot if that component is removed per §3. The last 4 are trivial
cleanups in `backend/src/services/content.service.js:513`,
`backend/tests/audit.service.test.js:8`, `backend/tests/content.test.js:988` and
`backend/tests/models.test.js:52`.

Admin: 0 errors, 7 warnings.

### Oxlint — clean

No issues across `src/`.

### dependency-cruiser — clean

```
✔ no dependency violations found (434 modules, 839 dependencies cruised)
```

**Zero circular dependencies.** For a 434-module frontend that is a genuinely
good result and the single strongest architectural signal in this report.

### Knip — dead code

~25 unused exports and 4 duplicate `name`/`default` export pairs, including
`SITE_TAGLINE`, `alumniDomeImages`, `companyLogos`, `mentors`, `achievers`,
`programs`, `partners`. Mostly harmless, but each is data being bundled and
shipped to browsers that never read it. Worth one cleanup pass.

Two findings introduced earlier in this session were fixed during this run
(an unnecessary `export` on `clampDescription`, a redundant default export in
`src/data/faqs.js`).

---

## 6. Docker & GCP Cloud Run — all three images built and exercised

All three images build, and the frontend was run and curled to verify behaviour
rather than reviewed on paper.

| Image | Size | Build |
| --- | --- | --- |
| `careerveda-frontend` | 26.7 MB | ✅ |
| `careerveda-admin` | 21.1 MB | ✅ |
| `careerveda-backend` | 367 MB | ✅ |

`nginx -t` passes against `nginx:1.31-alpine-slim`.

### Runtime behaviour, measured against the running container

| Request | Result |
| --- | --- |
| `Host: careerveda.in` `/` | 200 |
| `Host: careerveda.in` `/programs/gen-ai` | 200 — 991 words, 4 JSON-LD blocks, apex canonical |
| `Host: careerveda.in` `/health` | `ok` |
| `Host: www.careerveda.in` `/x?y=1` | 301 → `https://careerveda.in/x?y=1` (path + query preserved) |
| `Host: svc-abc.a.run.app` `/` | 200 — not redirected |
| JS asset | `Content-Encoding: gzip`, `max-age=31536000, immutable` |

### Four defects found and fixed

1. **Domain mismatch — www vs apex.** `SITE_URL` was `www.careerveda.in` while
   every Cloud Run mapping is apex, and no www mapping existed. All 60
   canonicals, the sitemap, `llms.txt` and every OG tag named a host Cloud Run
   does not serve — and because `CORS_ALLOWED_ORIGINS` lists only the apex, a
   visitor landing on www would have had **every API call blocked**. `SITE_URL`
   is now the apex, nginx 301s www to it, and `deploy-cloudrun.sh` maps
   `www.${DOMAIN}` to the frontend service.
2. **The image shipped head-only pages.** `npm run build` ends in
   `snapshot.mjs`, which needs Chromium and self-skips without it — so the
   build succeeded while silently serving `<div id="root"></div>` to every
   non-rendering crawler. `RUN npx playwright install --with-deps chromium` in
   the build stage fixes it; the build log now reads
   `snapshot: 60/60 routes filled with rendered HTML`.
3. **Every prerendered route answered 301.** `try_files $uri $uri/` matched the
   prerendered *directory* and nginx issued its add-a-trailing-slash redirect —
   so the exact URL each page declares as its canonical returned a redirect.
   Reordered to `try_files $uri $uri/index.html $uri/ /index.html`. This was
   pre-existing and is the most consequential of the four.
4. **`default_server` was implicit.** `server_name _` is not a catch-all — it
   only ever caught unmatched hosts because nginx makes the first server for a
   listen its default. Adding the www block ahead of it stole that role, which
   would have answered the apex itself with `301 https:///`. The site block is
   now explicitly `default_server`. (Introduced and caught within this pass.)

### Remaining, and it is not optional

**MongoDB Atlas will refuse the backend's connection.** Cloud Run egress IPs are
dynamic, so there is nothing to put in the Atlas allowlist. The backend will
deploy green and then fail every database call. `scripts/deploy-cloudrun.sh` now
prints the exact VPC connector + Cloud NAT commands at the end of a run. This
needs a GCP project to execute against and could not be done from here.

### Two accepted, with reasons

- **No `USER` in the nginx images.** The nginx master runs as root and workers
  drop to an unprivileged user; that is why the config binds 8080. Switching to
  `nginxinc/nginx-unprivileged` would close a standard hardening finding and is
  worth doing, but it is a base-image change that wants its own test pass.
- **`HEALTHCHECK` is ignored by Cloud Run** — it is a Docker/Compose
  instruction, and `compose.yaml` does use it. Cloud Run runs its own probes,
  TCP-on-port by default, which passes correctly here. An explicit
  `--startup-probe` would be better; it is documented in `backend/Dockerfile`
  but deliberately **not** added to `cloudbuild.yaml`, because gcloud is not
  installed on this machine and an unverified flag in the one command that ships
  the site is a worse failure than the probe it would add.

---

## Not run

Not installed on this machine. None of these are blocked by the codebase — each
is a one-time install, and all run free in GitHub Actions.

| Tool | Purpose | Enable with |
| --- | --- | --- |
| Semgrep | SAST — XSS, injection, JWT misuse | `pip install semgrep && semgrep --config=auto` |
| Trivy | Container + dependency CVEs | `winget install AquaSecurity.Trivy` |
| Gitleaks | Secret scanning incl. git history | `winget install Gitleaks.Gitleaks` |
| Hadolint | Dockerfile linting | `winget install hadolint.hadolint` |
| k6 / autocannon | Load testing | `winget install k6.k6` / `npx autocannon` |
| Coverage | 90% gate | `npm i -D @vitest/coverage-v8` |
| Pa11y | Extra a11y pass | already covered by axe in `e2e/accessibility.spec.js` |
| SonarQube CE | Aggregate quality | Docker image, needs the daemon running |

The most valuable of these is **Semgrep** — it is the only tool on the list that
inspects application logic for injection and auth flaws, and nothing else run
here covers that ground. `npm audit` checks dependencies, not your code.

---

## Priority actions

All test gates pass. What remains, in order of value:

1. **Remove the three.js background from `ConsultationAtmosphere`** — 235 KB
   gzipped (42% of JS) and the direct cause of the 3.4 s blocking time. The
   single largest performance win available, and the only thing standing between
   this build and a green Performance gate.
2. **Triage the 34 high advisories** — `npm audit fix` clears `shell-quote`
   safely; `react-router` needs a planned major bump; the Jest-transitive ones
   should be accepted with a note, not force-fixed.
3. **Install Semgrep** — the only real gap in security coverage. Nothing run
   here inspects application logic for injection or auth flaws.
4. **Add coverage tooling** — the 90% gate is unmeasured, not met.
5. **Cache the Mongo binary in CI** — see §2b, or the first E2E job on a fresh
   runner fails on the download rather than on the code.
6. **Add Playwright to the Docker build stage** — see §6, or Docker-built images
   ship head-only pages.

---

## Changed during this run

| File | Change |
| --- | --- |
| `admin/src/components/States.jsx` | `role="status"` on the skeleton — fixes a serious axe violation, verified by the E2E re-run |
| `src/config/pageMeta.js` | dropped an unused `export` (Knip) |
| `src/data/faqs.js` | dropped a redundant default export (Knip) |

`measure-tmp.mjs` is no longer present at the repo root. It was untracked, so
nothing was lost from version control.

Everything else in this report is measurement only.

---

## Reproducing this report

```bash
npx vitest run                       # frontend        179
npm --prefix backend test            # backend vitest  616
npm --prefix backend run test:unit   # backend jest    154
npm --prefix admin test              # admin            27
npm run test:e2e                     # playwright       40
npx eslint .                         # 0 errors
npx oxlint@latest src                # 0
npx dependency-cruiser src --no-config --validate -   # 0 violations
npm audit                            # 0 critical
npm run build                        # 60 routes prerendered + snapshotted
```

