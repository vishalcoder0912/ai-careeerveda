# Folder Structure — CareerVeda Alumni Profile Website

Monorepo with 3 apps: public website (`src/`), admin dashboard (`admin/`), and backend API (`backend/`).

```
implementatoin-of-chatbot-alumnai-profile/
│
├── .claude/
│   ├── launch.json
│   ├── settings.local.json
│   └── skills/react-doctor/
│       ├── SKILL.md
│       └── references/explain.md
│
├── .github/workflows/
│   ├── ci-cd.yml
│   ├── deploy-compute-engine.yml
│   └── react-doctor.yml
│
├── .vscode/
│   └── settings.json
│
├── .dockerignore
├── .env
├── .env.example
├── .gcloudignore
├── .gitignore
├── .pre-commit-config.yaml
├── babel.config.cjs
├── check-console.cjs
├── cloudbuild.yaml
├── compose.yaml
├── DEPLOYMENT.md
├── Dockerfile
├── doctor.config.mjs
├── eslint.config.js
├── firestore.rules
├── index.html
├── jenkins-credentials.md
├── jest.admin.config.cjs
├── jest.frontend.config.cjs
├── LICENSE
├── nginx.conf
├── osv-scanner.toml
├── package.json
├── package-lock.json
├── playwright.config.js
├── README.md
├── vite.config.js
├── vite.log
│
├── src/                                    # PUBLIC WEBSITE
│   ├── App.jsx
│   ├── main.jsx
│   ├── styles.css
│   ├── test-setup.js
│   │
│   ├── assets/
│   │   ├── alumni/README.md
│   │   └── partners/
│   │       ├── abbott.svg, accenture.svg, amazon.svg, blackrock.svg,
│   │       ├── deloitte.svg, finbox.svg, highradius.svg, ibm.svg,
│   │       ├── infosys.svg, microsoft.svg, pepsico.svg, pw.svg,
│   │       ├── razorpay.svg, README.md, tcs.svg, wipro.svg, zomato.svg
│   │
│   ├── components/
│   │   ├── AlumniSpotlight.jsx/.css
│   │   ├── BlogArticle.jsx/.css + test
│   │   ├── BrandLockup.jsx
│   │   ├── BrandLogo.jsx
│   │   ├── ConsultationAtmosphere.jsx
│   │   ├── ConsultationForm.jsx/.css + test
│   │   ├── DeferUntilVisible.jsx
│   │   ├── DomeGallery.jsx/.css
│   │   ├── Hero.jsx + test
│   │   ├── Layout.jsx
│   │   ├── MagicBento.jsx/.css
│   │   ├── MentorGrid.jsx
│   │   ├── OutcomeStories.jsx + test
│   │   ├── PageShell.jsx
│   │   ├── PressSection.jsx
│   │   ├── ProgramExplorer.jsx
│   │   ├── ScrollStack.jsx/.css + test
│   │   ├── ShapeGrid.jsx + test
│   │   ├── SiteNavbar.jsx
│   │   ├── SocialLinks.jsx
│   │   ├── SplineHeroScene.jsx + test
│   │   ├── TrustedCompanies.jsx/.css
│   │   ├── WhatsAppButton.jsx
│   │   ├── motionPrimitives.jsx, motionVariants.js
│   │   ├── roleTitle.js, scrollStackPin.js, shapeGridGeometry.js
│   │   ├── (many) *.css  ← styling files
│   │   │
│   │   ├── background/
│   │   │   ├── CareerVedaBackground.jsx/.css
│   │   │   └── CursorGrid.jsx/.css
│   │   ├── Recommended/
│   │   │   └── RecommendedCourses1.jsx/.css
│   │   └── ui/
│   │       ├── Antigravity.jsx
│   │       └── LaserFlow.jsx/.css
│   │
│   ├── config/
│   │   ├── brand.js, externalLinks.js, grid.js, pageMeta.js,
│   │   └── siteMeta.js, spline.js, whatsapp.js
│   │
│   ├── data/
│   │   ├── alumniSpotlight.js, blogPosts.js, companyLogos.js,
│   │   ├── faqs.js, jobsData.js, jobsData.test.js, mentors.js,
│   │   ├── partnerLogos.js, policies.js, pressArticles.js,
│   │   └── programCatalog.js, siteData.js
│   │
│   ├── hooks/
│   │   ├── useCinematicInteractions.js, useContent.js + test
│   │   ├── useCountUp.js + test, useDocumentTitle.js
│   │   ├── useFinePointer.js, useViewportTier.js
│   │
│   ├── lib/
│   │   ├── contentAdapters.js + test, imageCdn.js + test
│   │   ├── publicApi.js + test, queryClient.js, routeChunks.js + test
│   │   ├── seoTags.js + test, smoothScroll.jsx + test
│   │   ├── structuredData.js + test, utils.js
│   │
│   └── pages/
│       ├── AboutPage.jsx, AlumniPage.jsx
│       ├── BlogDetailPage.jsx + test, BlogPage.jsx + test
│       ├── ContactPage.jsx, EnrollPage.jsx, FacultyPage.jsx
│       ├── HomePage.jsx, JobsPage.jsx, PolicyPage.jsx
│       ├── ProgramDetailPage.jsx, ProgramsPage.jsx
│
├── admin/                                 # ADMIN DASHBOARD
│   ├── .env, .env.example
│   ├── Dockerfile, index.html, osv-scanner.toml
│   ├── package.json, package-lock.json, vite.config.js
│   ├── dist/                              # build output
│   └── src/
│       ├── App.jsx, main.jsx, test-setup.js
│       ├── components/  ConfirmDialog, Fields, Layout, MediaPicker,
│       │                Modal, States (+ .test files), fieldPath.js
│       ├── config/      brand.js, publishRules.js, resources.js (+ tests)
│       ├── context/     AuthContext.jsx, ToastContext.jsx (+ tests)
│       ├── pages/       Dashboard, Leads, Login, MediaLibrary, Profile,
│       │                ResourceEditor, ResourceList (+ tests)
│       ├── services/    api.js (+ test)
│       └── styles/      admin.css, admin-ux.css
│
├── backend/                              # BACKEND API (Express + MongoDB)
│   ├── .dockerignore, .env, .env.example, .trivyignore
│   ├── Dockerfile, CareerVeda.postman_collection.json
│   ├── jest.config.js, package.json, package-lock.json
│   ├── vitest.config.js
│   │
│   ├── scripts/
│   │   ├── backfill-blog-reader-fields.js, e2e-server.js
│   │   ├── import-live-data.js, migrate-content.js, migrate-media.js
│   │   ├── migrate-static-images.js, seed-admin.js, sync-indexes.js
│   │   └── lib/loadFrontendData.js, lib/seedE2E.js
│   │
│   ├── src/
│   │   ├── app.js, server.js
│   │   ├── config/     database.js, env.js, logger.js, permissions.js,
│   │   │               publishRules.js, resources.js
│   │   ├── controllers/auth.controller.js, content.controller.js,
│   │   │                     lead.controller.js, media.controller.js
│   │   ├── jobs/       publishScheduled.js, updateBatchDates.js
│   │   ├── middleware/ authenticate.js, authorize.js, csrf.js,
│   │   │               errorHandler.js, rateLimit.js, requestId.js,
│   │   │               sanitizeRequest.js, validate.js
│   │   ├── models/
│   │   │   ├── Admin.js, Alumni.js, AuditLog.js, Blog.js,
│   │   │   ├── ContentRevision.js, Faculty.js, Faq.js, Job.js,
│   │   │   ├── Lead.js, Media.js, Policy.js, Program.js, RefreshToken.js
│   │   │   ├── plugins/contentPlugin.js
│   │   │   └── shared/schemas.js
│   │   ├── routes/     admin.routes.js, auth.routes.js, health.routes.js,
│   │   │               lead.routes.js, media.routes.js, public.routes.js
│   │   ├── services/   audit.service.js, content.service.js,
│   │   │               imagekit.service.js, password.service.js,
│   │   │               token.service.js
│   │   ├── utils/      apiError.js, respond.js, sanitize.js
│   │   └── validators/ auth.validators.js, content.validators.js,
│   │                   lead.validators.js
│   │
│   └── tests/
│       ├── audit.service.test.js, auth.test.js, authenticate.test.js
│       ├── content.service.test.js, content.test.js, errorHandler.test.js
│       ├── foundation.test.js, jest.setup.js, leads.test.js, media.test.js
│       ├── method-not-allowed.test.js, models.test.js, rbac.test.js
│       ├── security-gaps.test.js, setup.js
│       ├── helpers/auth.js
│       └── unit/
│           ├── apiError, password.service, permissions, publishRules,
│           ├── requestId, respond, sanitize, updateBatchDates, validate
│           ├── README.md
│           ├── config/resources.test.js
│           ├── middleware/(authenticate, authorize, csrf, errorHandler,
│           │              rateLimit, sanitizeRequest).test.js
│           ├── services/token.service.test.js
│           └── validators/(auth, content, lead).validators.test.js
│
├── public/                              # static assets (public site)
│   ├── llms.txt, robots.txt, sitemap.xml
│   ├── brand/careerveda-logo.png
│   ├── fonts/(fonts.css + 5 woff2 files)
│   └── images/
│       ├── hero-robot.webp, photo-1522202176988.jpg,
│       ├── photo-1551836022.jpg, photo-1552664730.jpg
│       └── companies/  (accenture, adobe, amazon, amex, blackrock, ... 30 logos)
│
├── dist/                                # production build output
│   ├── index.html, llms.txt, robots.txt, sitemap.xml
│   ├── .vite/manifest.json
│   ├── assets/(*.js, *.css chunk files)
│   ├── brand/, fonts/, images/
│
├── scripts/                             # dev/ops utilities
│   ├── check-db.mjs, check-db-ci.js, deploy-cloudrun.sh
│   ├── export-blogs.mjs, firestore-emulator.sh, generate-llms-txt.mjs
│   ├── generate-sitemap.mjs, load-test.mjs, make-logo.mjs
│   ├── preload-routes.mjs, prerender.mjs, routes.mjs
│   ├── run-e2e-ci.mjs, seo-audit.mjs, serve-dist.cjs
│   ├── snapshot.mjs, validate-environment.js
│
├── deploy/                             # systemd + nginx
│   ├── careerveda-autodeploy.service, careerveda-autodeploy.timer
│   ├── careerveda-backend.service, deploy.sh
│   ├── nginx-careerveda.conf, nginx-www-redirect.conf, setup-server.sh
│
├── docs/
│   ├── CODEBASE_AUDIT.md, DEPLOY-VM.md, ER-DIAGRAM.md
│   ├── MAINTENANCE_REPORT.md, PRODUCTION_READINESS_REPORT.md
│   ├── SECURITY.md, TESTING_REPORT.md
│
├── e2e/                                # Playwright tests
│   ├── accessibility.spec.js, auth.spec.js, frontend-sync.spec.js
│   ├── helpers.js, performance.spec.js, resilience.spec.js, smoke.spec.js
│   └── accessibility.spec.js-snapshots/(8 .png screenshots)
│
├── jest/                               # Jest config + mocks
│   ├── setup.cjs, file-mock.cjs, style-mock.cjs
│   ├── admin/(components, config, helpers tests)
│   ├── frontend/(components, config, data, hooks, lib tests)
│
├── tests/load/public-read.js
├── test-results/.last-run.json
│
└── Live_data/                          # exported database collections
    ├── careerveda.admins.json/.csv, alumni, auditlogs, blogs,
    ├── contentrevisions, faculties, faqs, jobs, leads, media,
    └── policies, programs, refreshtokens, synclogs  (.json + .csv each)
```

> Note: `node_modules/` (dependency caches at root, `admin/`, and `backend/`) and `.git/` internals are excluded.
