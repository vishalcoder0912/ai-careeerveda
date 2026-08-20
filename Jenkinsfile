// The release gate. Work is pushed to `dev`; this pipeline is the only thing
// that writes to `main`, and only after every check has passed. So `main` holds
// nothing that was not lint-clean, unit-tested, e2e-tested and buildable.
//
//   git push origin dev  ──►  Jenkins  ──►  origin/main   (green only)
//
// Point the job at the `dev` branch. Any other branch runs the same checks and
// simply skips the Publish stage, so a feature branch is still verified.
//
// Runs on the Windows controller, so every step is `bat`. Node and git come
// from the machine PATH — no NodeJS tool is configured in this Jenkins, and
// adding one would only pin a version the machine already has.
//
// History of the failures this file has been hardened against:
//   - builds #21-#24 aborted at the 60-min overall cap: the E2E stage alone
//     measured ~35-45 min. The cap is 90 min and the stage 60 min.
//   - the accessibility suite hung in beforeAll on `networkidle` (Spline iframe
//     never idles). It now waits on content, not network.
//   - vitest's forks pool spawned 11 workers on this 12-core box and hit
//     "Timeout waiting for worker to respond". vite.config.js and
//     admin/vite.config.js now cap maxWorkers at 2.
//   - frontend/admin Jest suites were added as a coverage gap. Backend Jest
//     already runs inside `npm run test:all` (backend `test` = jest + vitest).
//
// Why this cannot touch the live site:
//   - backend tests overwrite MONGODB_URI with mongodb-memory-server
//     (backend/tests/setup.js), so no suite can reach Atlas.
//   - e2e boots its own stack against in-memory mongo with ImageKit disabled
//     (backend/scripts/e2e-server.js), on ports offset from the dev defaults so
//     a build cannot hijack servers you already have open.
//   - there is still no deploy stage. Publishing to `main` is a git push, not a
//     release; whatever deploys from `main` stays a separate, deliberate step.

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

    // Local development URLs - no external domains
    VITE_PUBLIC_API_BASE_URL = 'http://localhost:8091/api/v1'
    VITE_ADMIN_API_BASE_URL  = 'http://localhost:8091/api/v1'
    VITE_PUBLIC_SITE_URL     = 'http://localhost:5293'
  }

  options {
    timestamps()
    // 90 min overall: the E2E stage alone runs ~40-50 min on this controller.
    // The old 60-min cap was aborting builds that were one stage from green.
    timeout(time: 90, unit: 'MINUTES')
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

    // Backend Jest runs inside test:all above (backend `test` runs Jest first).
    // These two cover the frontend and admin repos, which test:all does not.
    stage('Jest unit tests (frontend & admin)') {
      steps { bat 'npm run test:jest:frontend && npm run test:jest:admin' }
    }

    stage('Free E2E ports') {
      // Playwright with CI=true refuses to reuse an occupied port, so a stale
      // process left by an interrupted run fails the whole build. Kill
      // whatever still listens on the e2e ports (8091/5293/5294) before booting.
      // Full exe paths: the service PATH on this machine lacks System32.
      steps {
        bat '''
          @echo off
          for /f "tokens=5" %%p in ('C:\\Windows\\System32\\netstat.exe -ano ^| C:\\Windows\\System32\\findstr.exe ":8091" ^| C:\\Windows\\System32\\findstr.exe "LISTENING"') do C:\\Windows\\System32\\taskkill.exe /F /PID %%p 2>nul
          for /f "tokens=5" %%p in ('C:\\Windows\\System32\\netstat.exe -ano ^| C:\\Windows\\System32\\findstr.exe ":5293" ^| C:\\Windows\\System32\\findstr.exe "LISTENING"') do C:\\Windows\\System32\\taskkill.exe /F /PID %%p 2>nul
          for /f "tokens=5" %%p in ('C:\\Windows\\System32\\netstat.exe -ano ^| C:\\Windows\\System32\\findstr.exe ":5294" ^| C:\\Windows\\System32\\findstr.exe "LISTENING"') do C:\\Windows\\System32\\taskkill.exe /F /PID %%p 2>nul
          exit /b 0
        '''
      }
    }

    stage('E2E tests') {
      options {
        // The full suite (chromium + mobile-chromium) measured ~35 min on this
        // machine, and the accessibility spec only started running fully after
        // the networkidle fix. 45 min was aborting it; 60 min covers the run
        // plus a slow first-run of playwright's browser install.
        timeout(time: 60, unit: 'MINUTES')
      }
      steps {
        // --with-deps is Linux-only and fails on Windows. --yes avoids interactive prompts.
        bat 'npx --yes playwright install chromium'
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

    // Reached only when every stage above passed — a failure anywhere aborts
    // the pipeline before here, which is the whole gate.
    stage('Publish to main') {
      when {
        // BRANCH_NAME on a multibranch job, GIT_BRANCH ("origin/dev") on a
        // plain one. Neither set means a job configured without a branch, and
        // an empty string matches nothing, so publishing is off by default.
        expression { (env.BRANCH_NAME ?: env.GIT_BRANCH ?: '') ==~ /(.*\/)?dev/ }
      }
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'github-push',
          usernameVariable: 'GIT_USER',
          passwordVariable: 'GIT_TOKEN'
        )]) {
          // @echo off so the URL — which carries the token — is never printed.
          // Jenkins masks the secret in the log anyway; this is the second lock.
          //
          // No --force. checkout scm leaves HEAD detached at the commit that was
          // actually tested, and pushing it to main is rejected if main has moved
          // on. A build that cannot fast-forward should fail and be looked at,
          // not overwrite whatever someone else put there.
          bat '''
            @echo off
            git push https://%GIT_USER%:%GIT_TOKEN%@github.com/vishalcoder0912/ai-careeerveda.git HEAD:refs/heads/main
          '''
        }
      }
    }
  }

  post {
    always {
      // Failure artifacts only; a green run writes nothing here.
      archiveArtifacts artifacts: 'test-results/**', allowEmptyArchive: true
    }
    success { echo 'Pipeline green - tested and built. main updated if this was dev.' }
    failure { echo 'Pipeline failed - main untouched. See console output.' }
  }
}