# CareerVeda — Maintenance Report

**Scope:** React Doctor triage (2 issues) + repository hygiene.
**Date:** 2026-07-24. **Branch:** `feature/full-admin-backend-cms`.
**Mode:** changes applied, nothing committed. Test suite green (59/59).

---

## 1. React Doctor

Scan before: 2 issues (1 Security, 1 Performance). Scan after: both cleared,
score 95/100, Security category empty.

### 1.1 `iframe-missing-sandbox` — `src/components/SplineHeroScene.jsx:182`

**Change:** `sandbox="allow-scripts allow-same-origin"` → `sandbox="allow-scripts"`

`sandbox` is a cage around embedded third-party content; each `allow-*` token
unlocks one bar. `allow-scripts` lets the Spline runtime execute — required.
`allow-same-origin` additionally hands the framed page its real `my.spline.design`
identity instead of an anonymous throwaway one, which carries with it that
origin's cookies, browser storage, and credentialed network access.

**Severity: low-to-moderate. No user was exposed and nothing was broken.** The
rule's warning text describes a sandbox-escape that requires the iframe to be
served from the *same* origin as the host page. Spline is a different origin, so
the browser's same-origin policy already prevented it from reaching CareerVeda's
DOM, cookies, or user data — with or without a sandbox.

What it did cost is blast radius. That embed page is served by Spline and can
change at any time without a redeploy here. Under a Spline supply-chain
compromise, the extra token is precisely the privilege an attacker inherits.
Removed, a compromised embed executes as a credential-less, storage-less nobody.
This is defence-in-depth, not an incident.

**The prior code asserted this fix was impossible.** A comment at that line
claimed the Spline runtime *needs* both tokens and instructed future readers not
to remove either. That was incorrect. Evidence gathered before changing it:

| Check | Method | Result |
| --- | --- | --- |
| Scene renders | Headless Chromium, real scene URL, both sandbox values, 25s settle | Robot renders identically in both |
| WebGL alive | `getContext('webgl2').isContextLost()` inside the frame | `false` in both |
| Console errors | Captured `console` + `pageerror`, all frames | Identical single unrelated message in both |
| Cursor interactivity | Pointer parked left vs. right, screenshot each | Scene tracks the cursor in both |
| Storage dependency | Read the pinned runtime bundle (`@splinetool/runtime@1.12.98`) | `localStorage` paths are desktop-app-gated; scene data is inlined in the embed page, not fetched |

The comment is replaced with what the evidence actually shows.

### 1.2 `js-flatmap-filter` — `src/pages/BlogPage.jsx:23`

**Change:** `.map((p) => p.category).filter(Boolean)` → `.flatMap((p) => (p.category ? [p.category] : []))`

Building the category chip list walked the post array twice — once to project
each `category`, once to discard blanks. Now one pass.

**Severity: trivial, zero user impact.** The list holds dozens of items and feeds
straight into a `new Set()`. The saved pass costs microseconds nobody perceives;
classifying this as *Performance* oversells it, and it is fairly described as a
readability cleanup. The only thing that genuinely mattered was preserving
behaviour: `filter(Boolean)` discards `""`, `null`, `undefined` and `0`, and the
replacement conditional discards exactly the same set, so posts published without
a category remain reachable under "All".

### Verification

- `npx react-doctor@latest --verbose` — both rules absent from the new
  diagnostics; Security category clean.
- `npm run test:frontend` — 5 files, 59 tests, all passing.

---

## 2. Repository hygiene

The repository was already in good shape — GitHub remote, two CI workflows,
Dockerfiles for all three apps, `compose.yaml`, e2e suite, and a `.gitignore`
leaking no secrets (only `.env.example` files are tracked). Work was therefore
confined to real gaps rather than regenerating scaffolding that exists.

| File | Change |
| --- | --- |
| `README.md` | Rewritten. Was 18 lines covering only the landing page. |
| `LICENSE` | Added — proprietary, all rights reserved, third-party deps carved out. |
| `.gitignore` | Added `test-results/`, `playwright-report/`, `graphify-out/`, `.codex/`. |
| `graphify-out/` (8 files), `test-results/` (1 file) | `git rm --cached` — untracked, retained on disk. |
| `docs/` | Removed. Empty directory; git had never tracked it. |

The previous README documented the public site alone. It now covers the admin
panel, the API, the seven content types and the shared registry driving them, the
admin→API→site loop, the static-data fallback path, Docker, Cloud Run deployment,
job aggregation, and a scripts reference.

**Deliberately not added:** `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`,
`SECURITY.md`, issue and PR templates, `CHANGELOG.md`. For a private commercial
repository with a single committer these are files nobody opens. Worth adding the
day an outside contributor arrives.

---

## 3. Open items — found, not acted on

### 3.1 Uncommitted change contradicts three files

`admin/package.json` in the working tree drops `"scene-one-career-veda": "file:.."`,
which is still cited as the governing reason in:

- `.github/workflows/tests.yml` — *"Root first: admin depends on it via `file:..`"*
- `compose.yaml` — *"The admin package references the parent package via `file:..`,
  so its build context must include both the admin and the project root."*
- `admin/Dockerfile` — its root-level build context exists for that reason

If the removal is intended, the admin image can take a narrower build context and
CI no longer requires root-first install ordering. Left untouched: this is
in-flight work and finishing someone else's refactor mid-stream is how a
half-applied change ships. The claim was kept out of the new README.

### 3.2 React Doctor findings outside the requested scope

Surfaced by the re-scan, not present in the original results file:

- `js-hoist-intl` ×2 — `backend/src/services/jobSync.service.js:44,45`.
  An `Intl.NumberFormat` constructed on every call rather than once at module
  level. Small, self-contained fix.

### 3.3 Stray directories above the repository

`full_stack_careerveda/` (the parent of this repo) contains an empty `.git/` and
an empty `.agents/`. The empty `.git` is why tooling reports a git repository at
that level while every git command there fails. Both are safe to remove; left
alone as they sit outside this repository.

---

## 4. State

Working tree carries these changes uncommitted, alongside the 27 modified and 3
untracked files that predate this pass. Nothing was staged for commit beyond the
`git rm --cached` untracking, which is inherently staged.
