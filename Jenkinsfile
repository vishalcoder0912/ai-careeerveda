 // The release gate. Verification only — nothing here writes to a branch.
//
//   PR dev ──► main   blocked until this pipeline is green
//
// The blocking is GitHub's, not this file's: point the job at `dev`, then make
// it a required status check on `main` (Settings → Branches → Add rule). That is
// a checkbox doing what a publish stage here would need thirty lines of Groovy
// and a write-scoped PAT to do worse — a token to rotate, a push that races
// anyone else's merge, and a second place for "what may reach main" to live.
//
// Runs on the Windows controller, so every step is `bat`. Node and git come
// from the machine PATH — no NodeJS tool is configured in this Jenkins, and
// adding one would only pin a version the machine already has.
//
// Why this cannot touch the live site:
//   - backend tests overwrite MONGODB_URI with mongodb-memory-server
//     (backend/tests/setup.js), so no suite can reach Atlas.
//   - e2e boots its own stack against in-memory mongo with ImageKit disabled
//     (backend/scripts/e2e-server.js), on ports offset from the dev defaults so
//     a build cannot hijack servers you already have open.
//   - there is no deploy stage, and no credential: the job needs read access to
//     clone and nothing more.

pipeline {
  agent any

  environment {
    // Playwright reads CI to refuse reusing whatever is already listening.
    CI = 'true'

    // Offset from the playwright.config.js defaults (8081/5273/5274) so a build
    // never collides with a local dev session on the same machine.
    E2E_API_PORT      = '8091'
    E2E_FRONTEND_PORT = '5293'
    E2E_ADMIN_PORT    = '5294'

    // Baked into the verification build so `npm run build` exercises the real
    // config. postbuild's snapshot crawl issues read-only GETs against these.
    VITE_PUBLIC_API_BASE_URL = 'https://backend.careerveda.in/api/v1'
    VITE_ADMIN_API_BASE_URL  = 'https://backend.careerveda.in/api/v1'
    VITE_PUBLIC_SITE_URL     = 'https://careerveda.in'
  }

  options {
    timestamps()
    timeout(time: 40, unit: 'MINUTES')
    disableConcurrentBuilds()
  }

  triggers {
    pollSCM('H/5 * * * *')
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Install') {
      steps {
        bat 'npm ci'
        bat 'npm ci --prefix backend'
        bat 'npm ci --prefix admin'
      }
    }

    stage('Lint') {
      steps { bat 'npm run lint' }
    }

    stage('Unit & integration tests') {
      steps { bat 'npm run test:all' }
    }

    stage('E2E tests') {
      steps {
        // --with-deps is Linux-only and fails on Windows.
        bat 'npx playwright install chromium'
        bat 'npm run test:e2e'
      }
    }

    stage('Build') {
      steps {
        bat 'npm run build'
        bat 'npm run build:admin'
        bat 'npm run build:backend'
      }
    }
  }

  post {
    always {
      // Failure artifacts only; a green run writes nothing here.
      archiveArtifacts artifacts: 'test-results/**', allowEmptyArchive: true
    }
    success { echo 'Pipeline green - tested and built. Safe to merge.' }
    failure { echo 'Pipeline failed - see console output.' }
  }
}
