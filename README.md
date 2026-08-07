# CareerVeda

The CareerVeda public site, its admin panel, and the API behind both.

Three independent npm packages in one repository. They are deliberately *not* an
npm workspace — each deploys to a different place on its own schedule, and the
root `package.json` orchestrates them with `npm --prefix` rather than hoisting
their dependencies together.

| App          | Path         | Stack                                            | Deploys to         | Dev port |
| ------------ | ------------ | ------------------------------------------------ | ------------------ | -------- |
| Public site  | `/` (`src/`) | React 19, Vite 6, React Router 7, Three.js, GSAP | Vercel / Cloud Run | 5173     |
| Admin panel  | `admin/`     | React 19, Vite 6, React Router 7                 | Cloud Run (static) | 5174     |
| API          | `backend/`   | Express 4, Mongoose 8, Zod, argon2, JWT          | Cloud Run          | 8080     |

## How the three fit together

The admin panel writes content through the API; the public site reads it back.
That single loop is what makes an edit in the panel show up for visitors.

```
  admin/  ──POST/PATCH──►  backend/  ◄──GET──  src/  (public site)
                              │
                              ▼
                           MongoDB
```

Seven content types flow through it — `programs`, `faculty`, `alumni`, `blogs`,
`jobs`, `policies`, `faqs`. They share one registry
(`backend/src/config/resources.js`) that drives both the admin CRUD routes and
the public read routes, so adding a type is a model, a Zod schema, and one entry
— not a new controller and router.

**The public site works without the API.** Leave `VITE_PUBLIC_API_BASE_URL`
blank and it renders entirely from the static files in `src/data/`, with the
forms posting to the serverless functions in `api/`. Nothing breaks; the admin
panel simply has no effect on what visitors see. This is the arrangement that
predates the backend, and it is still the fallback if the API is unreachable.

## Quick start

Requires Node 20+ (CI runs 22) and a MongoDB you can reach — Atlas, or the local
one in `compose.yaml`.

```bash
npm install
npm install --prefix backend
npm install --prefix admin

cp .env.example .env                   # public site
cp backend/.env.example backend/.env   # API — the only file with secrets
cp admin/.env.example admin/.env       # admin panel

npm run dev                    # all three, concurrently
```

This starts the site on :5173, the admin panel on :5174 and the API on :8080.
The site defaults to `http://localhost:8080/api/v1` in dev, so a locally running
backend is picked up with no configuration at all.

Every `.env.example` is heavily commented — read those rather than this section
for what each variable does. Two things worth repeating here:

- **`JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must differ**, and be 32+
  characters. Reusing one secret for both means a leaked access token can be
  replayed as a refresh token. Generate with
  `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.
- **Only `VITE_`-prefixed variables may be public.** Vite inlines them into the
  JavaScript it ships to browsers, so anything secret must not carry that prefix.

The API validates its whole config at boot (`backend/src/config/env.js`) and
exits with a list of problems rather than starting half-configured.

Create the first admin user with `npm --prefix backend run seed:admin`.

There is no self-service password reset — no "forgot password" link, and no
`/auth/forgot-password` endpoint. An admin who is locked out is recovered from a
shell with `npm --prefix backend run seed:admin -- --reset`, which sets a new
password and revokes every existing session for that account.

## Docker

```bash
docker compose up --build
```

Brings up MongoDB, the API, the site and the panel together. The stack is
self-contained: it uses a local Mongo volume, not your Atlas cluster.

The API is published on **:8081** locally, not :8080 — host 8080 was already
taken on the machine this was written on.

## Tests

```bash
npm run lint          # ESLint across all three packages
npm run test:all      # Vitest: frontend + admin + backend (Supertest)
npm run test:e2e      # Playwright across the full stack, in-memory DB, seeded per run
npm run test:a11y     # axe-core (WCAG 2.1 A/AA) on 8 public pages + admin
npm run test:visual   # screenshot diff against committed baselines
npm run check         # lint + test:all + build:all — the pre-push gate
```

| Layer | Tool | Where |
| --- | --- | --- |
| Unit + component | Vitest, React Testing Library | `src/**/*.test.jsx`, `admin/src/**/*.test.jsx` |
| API + integration | Vitest + Supertest, `mongodb-memory-server` | `backend/tests/` |
| End-to-end | Playwright | `e2e/auth.spec.js`, `e2e/frontend-sync.spec.js` |
| Accessibility | `@axe-core/playwright` | `e2e/accessibility.spec.js` |
| Visual regression | Playwright `toHaveScreenshot` | `e2e/accessibility.spec.js-snapshots/` |
| Load + stress | k6 (separate binary) | `tests/load/public-read.js` |

Load, container and dependency scanning are run by hand (`npm audit`,
`osv-scanner`, `k6 run tests/load/public-read.js`). They are deliberately not in
the pipeline: they go red for reasons worth reading that are not reasons to
block a release, and a gate people learn to override is not a gate.

Baselines are committed PNGs, so visual regression needs no Percy or Chromatic
account. They are platform-specific — the committed ones end `-win32.png`, and a
Linux CI run generates its own `-linux.png` set on first run. Regenerate after an
intentional design change with `npm run test:visual:update`.

The home page is checked for accessibility but excluded from visual regression:
its three.js hero never stops animating, so Playwright's stability check never
settles. See the comment in `e2e/accessibility.spec.js`.

React Doctor is available locally as `npm run doctor`.

## CI / CD

`Jenkinsfile` is the release gate, and the only thing that writes to `main`.

```
git push origin dev  ──►  Jenkins  ──►  origin/main
                            │
                            └─ lint · unit + integration · e2e · build
```

| Stage                     | Does                                                    |
| ------------------------- | ------------------------------------------------------- |
| Install                   | `npm ci` × 3 packages                                    |
| Lint                      | `npm run lint`                                           |
| Unit & integration tests  | `npm run test:all`                                       |
| E2E tests                 | Playwright against the full stack, in-memory DB          |
| Build                     | `npm run build` × 3 packages                             |
| Publish to main           | pushes the tested commit to `main` — **`dev` only**      |

Work goes to `dev`. A stage that fails aborts the pipeline before Publish, so
`main` never receives a commit that was not lint-clean, tested and buildable.
Any other branch runs the same checks and skips Publish, so a feature branch is
still verified without being able to promote itself.

The push is not `--force`. `checkout scm` leaves HEAD detached at the exact
commit that was tested, and pushing it to `main` is rejected if `main` has moved
on underneath — a build that cannot fast-forward fails and gets looked at rather
than overwriting someone else's work.

### Setting it up

1. **Jenkins → Manage Jenkins → Credentials → System → Global → Add**
   - Kind: *Username with password*
   - Username: your GitHub username
   - Password: a GitHub **fine-grained Personal Access Token** with
     *Contents: Read and write* on this repository only
   - ID: `github-push` ← the pipeline looks this up by name
2. **New Item → Pipeline**, Pipeline script from SCM, this repo, branch `dev`,
   script path `Jenkinsfile`. Polls every 5 minutes.
3. On GitHub, protect `main`: **Settings → Branches → Add rule** on `main`,
   *Restrict who can push* → the Jenkins token's account. Without this the gate
   is a convention rather than a rule; anyone can still push straight to `main`.

There is no deploy stage. Publishing to `main` is a git push, not a release —
see *Deploying* below for what ships, which stays a deliberate manual step.

## Deploying

`scripts/deploy-cloudrun.sh` builds all three images, pushes them to Artifact
Registry and deploys three Cloud Run services (`careerveda-backend`,
`careerveda-frontend`, `careerveda-admin`). It expects the domain layout
`example.com`, `admin.example.com`, `api.example.com`.

```bash
PROJECT_ID=... DOMAIN=... MONGODB_URI=... \
JWT_ACCESS_SECRET=... JWT_REFRESH_SECRET=... \
./scripts/deploy-cloudrun.sh
```

Region defaults to `asia-south1`. The script refuses to run rather than deploy
with a missing secret.

`cloudbuild.yaml` does the same thing entirely inside GCP — no local Docker, and
secrets read from Secret Manager instead of your shell:

```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_DOMAIN=careerveda.in,_TAG=$(git rev-parse --short HEAD)
```

Use whichever suits: the script when you want to watch it happen locally or need
the one-time Cloud Scheduler and domain-mapping steps (which only it does),
`cloudbuild.yaml` for a hands-off build triggered from a commit. Its header lists
the one-time secret and Artifact Registry setup.

In production `COOKIE_SECURE` **must** be `true` — a refresh cookie without
`Secure` travels in clear text over any plain-HTTP request to the domain — and
`COOKIE_DOMAIN` should be the parent domain (`.careerveda.in`) so `api.` and
`admin.` can share it.

`vercel.json` covers the alternative: the public site on Vercel, with the
serverless functions in `api/` handling the forms.

## Layout

```
src/            public site — pages, components, hooks, static data fallback
api/            Vercel serverless functions for the consultation + enrol forms
admin/          admin panel (separate Vite app)
backend/        Express API — routes, controllers, services, Mongoose models
e2e/            Playwright specs
scripts/        deploy, sitemap generation, db check, dist server
public/         static assets
docs/           audits, reports, security policy
```

`docs/CODEBASE_AUDIT.md` holds a fuller read-only audit of the repository.

## Scripts

| Command                                    | Does                                        |
| ------------------------------------------ | ------------------------------------------- |
| `npm run dev`                              | all three apps, concurrently                |
| `npm run build:all`                        | build all three                             |
| `npm run check`                            | all tests + all builds                      |
| `npm run doctor`                           | React Doctor scan                           |
| `npm run sitemap`                          | regenerate the sitemap (runs on prebuild)   |
| `npm run check:db`                         | verify the MongoDB connection               |
| `npm --prefix backend run seed:admin`      | create the first admin user                 |
| `npm --prefix backend run seed:admin -- --reset` | reset a locked-out admin's password   |
| `npm --prefix backend run migrate:content` | content migration (`:dry-run` to preview)   |

The migration and backfill scripts under `backend/scripts/` all take
`--dry-run`. Use it first.

---

© 2026 CareerVeda. Proprietary and confidential — see [LICENSE](LICENSE).
