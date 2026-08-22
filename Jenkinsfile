pipeline {

    agent any


    environment {

        CI = 'true'
        NODE_ENV = 'test'
        APP_ENV = 'ci'

        NODE_OPTIONS = '--max-old-space-size=4096'

        // E2E ports (match playwright.config.js defaults)
        E2E_API_PORT = '8081'
        E2E_FRONTEND_PORT = '5273'
        E2E_ADMIN_PORT = '5274'

        // Test database - uses MongoMemoryServer via backend/tests/setup.js
        MONGODB_URI = 'mongodb://careerveda:JKY38xn3zcIeFs5y-adZYx5Hc8jnN222skegioFrF7zDIBH3@d6ab5bbb-224b-4a0c-bb94-ad3b8813d505.asia-south2.firestore.goog:443/careerveda-db?loadBalanced=true&tls=true&authMechanism=SCRAM-SHA-256&retryWrites=false'
        MONGODB_DB_NAME = 'careerveda-db'

        // JWT secrets for CI (must be 32+ chars)
        JWT_ACCESS_SECRET = 'fjeknGMKf_2IRf6nNO8VzdLR0ztdAxT-IhfMMP98-oY4uwe4BEDrh-BSOTWx7T46'
        JWT_REFRESH_SECRET = 'ci-refresh-secret-not-for-any-real-use-0123456789'

        // Frontend/Admin URLs for E2E
        VITE_PUBLIC_API_BASE_URL = 'http://localhost:8081/api/v1'
        VITE_ADMIN_API_BASE_URL = 'http://localhost:8081/api/v1'
        VITE_PUBLIC_SITE_URL = 'http://localhost:5273'

        // Disable ImageKit in CI
        IMAGEKIT_PUBLIC_KEY = ''
        IMAGEKIT_PRIVATE_KEY = ''
        IMAGEKIT_URL_ENDPOINT = ''

        // Cookie settings for CI
        COOKIE_SECURE = 'false'
        COOKIE_DOMAIN = 'localhost'
        LOG_LEVEL = 'silent'
    }


    options {

        timestamps()

        disableConcurrentBuilds()

        skipDefaultCheckout(true)

        timeout(
            time: 120,
            unit: 'MINUTES'
        )

        buildDiscarder(
            logRotator(
                numToKeepStr: '20',
                artifactNumToKeepStr: '10'
            )
        )
    }


    stages {


        /*
        =====================================================
        CHECKOUT
        =====================================================
        */

        stage('Checkout') {

            steps {

                cleanWs()

                checkout scm

                bat '''
                    echo ========================================
                    echo Repository Structure
                    echo ========================================

                    dir
                '''
            }
        }


        /*
        =====================================================
        ENVIRONMENT
        =====================================================
        */

        stage('Environment Check') {

            steps {

                bat '''
                    echo ========================================
                    echo Node Environment
                    echo ========================================

                    node --version
                    npm --version

                    echo.

                    echo Workspace:
                    cd

                    echo.

                    echo Project directory:
                    dir
                '''
            }
        }


        /*
        =====================================================
        INSTALL DEPENDENCIES
        =====================================================
        */

stage('Install Dependencies') {

            failFast true

            parallel {


                stage('Frontend Dependencies') {

                    options {
                        timeout(
                            time: 15,
                            unit: 'MINUTES'
                        )
                    }

                    steps {

                        bat '''
                            echo Installing Frontend Dependencies...
                            call npm install
                        '''
                    }
                }


                stage('Backend Dependencies') {

                    options {
                        timeout(
                            time: 15,
                            unit: 'MINUTES'
                        )
                    }

                    steps {

                        dir('backend') {

                            bat '''
                                echo Installing Backend Dependencies...
                                call npm install
                            '''
                        }
                    }
                }


                stage('Admin Dependencies') {

                    options {
                        timeout(
                            time: 15,
                            unit: 'MINUTES'
                        )
                    }

                    steps {

                        dir('admin') {

                            bat '''
                                echo Installing Admin Dependencies...
                                call npm install
                            '''
                        }
                    }
                }
            }
        }


    /*
    =====================================================
    ENVIRONMENT VALIDATION
    =====================================================
    */

    stage('Validate Environment') {

        options {
            timeout(time: 5, unit: 'MINUTES')
        }

        steps {

            bat '''
                echo ========================================
                echo Validating CI Environment
                echo ========================================

                call node scripts/validate-environment.js
            '''
        }
    }


    /*
    =====================================================
    DATABASE CONNECTIVITY CHECK
    =====================================================
    */

    stage('Database Check') {

        options {
            timeout(time: 5, unit: 'MINUTES')
        }

        steps {

            bat '''
                echo ========================================
                echo Checking Database Connectivity
                echo ========================================

                call node scripts/check-db-ci.js
            '''
        }
    }


    /*
    =====================================================
    LINT
    =====================================================
    */

        stage('Lint') {

            options {
                timeout(
                    time: 10,
                    unit: 'MINUTES'
                )
            }

            steps {

                bat '''
                    echo ========================================
                    echo Running ESLint
                    echo ========================================

                    call npm run lint
                '''
            }

            post {

                always {

                    bat '''
                        npx eslint . --format stylish > lint-report.txt 2>&1 || exit /b 0
                    '''

                    archiveArtifacts(
                        artifacts: 'lint-report.txt',
                        allowEmptyArchive: true
                    )
                }
            }
        }


        /*
        =====================================================
        UNIT + INTEGRATION TESTS
        =====================================================
        */

        stage('Unit & Integration Tests') {

            failFast true

            parallel {


                /*
                FRONTEND - Vitest (jsdom)
                */

                stage('Frontend Tests') {

                    options {
                        timeout(
                            time: 15,
                            unit: 'MINUTES'
                        )
                    }

                    steps {

                        bat '''
                            echo ========================================
                            echo Running Frontend Tests (Vitest)
                            echo ========================================

                            call npm run test:frontend
                        '''
                    }
                }


                /*
                BACKEND - Jest (unit) + Vitest (integration) + MongoMemoryServer
                */

                stage('Backend Tests') {

                    options {

                        /*
                        MongoMemoryServer may need to download
                        MongoDB binary on first CI run.
                        */

                        timeout(
                            time: 40,
                            unit: 'MINUTES'
                        )
                    }

                    steps {

                        bat '''
                            echo ========================================
                            echo Running Backend Tests
                            echo Jest (unit) + Vitest (integration) + Supertest
                            echo ========================================

                            call npm run test:backend
                        '''
                    }
                }


                /*
                ADMIN - Vitest (jsdom)
                */

                stage('Admin Tests') {

                    options {
                        timeout(
                            time: 15,
                            unit: 'MINUTES'
                        )
                    }

                    steps {

                        bat '''
                            echo ========================================
                            echo Running Admin Tests (Vitest)
                            echo ========================================

                            call npm run test:admin
                        '''
                    }
                }
            }
        }


        /*
        =====================================================
        BUILD
        =====================================================
        */

        stage('Build Applications') {

            failFast true

            parallel {


                stage('Build Frontend') {

                    options {
                        timeout(time: 15, unit: 'MINUTES')
                    }

                    steps {

                        bat '''
                            echo ========================================
                            echo Building Public Website
                            echo ========================================

                            call npm run build:frontend
                        '''
                    }
                }


                stage('Build Backend') {

                    options {
                        timeout(time: 10, unit: 'MINUTES')
                    }

                    steps {

                        bat '''
                            echo ========================================
                            echo Validating Backend Build
                            echo ========================================

                            call npm run build:backend
                        '''
                    }
                }


                stage('Build Admin') {

                    options {
                        timeout(time: 15, unit: 'MINUTES')
                    }

                    steps {

                        bat '''
                            echo ========================================
                            echo Building Admin Panel
                            echo ========================================

                            call npm run build:admin
                        '''
                    }
                }
            }
        }


        /*
        =====================================================
        PLAYWRIGHT BROWSER INSTALL
        =====================================================
        */

        stage('Install Playwright Browser') {

            options {
                timeout(
                    time: 15,
                    unit: 'MINUTES'
                )
            }

            steps {

                bat '''
                    echo ========================================
                    echo Installing Playwright Chromium
                    echo ========================================

                    call npx playwright install chromium
                '''
            }
        }


        /*
        =====================================================
        STACK HEALTH CHECK (verify full stack is responding)
        =====================================================
        */

        stage('Stack Health Check') {

            options {
                timeout(time: 10, unit: 'MINUTES')
            }

            steps {

                bat '''
                    @echo off
                    echo ========================================
                    echo Verifying Full Stack Health
                    echo ========================================

                    echo Waiting for backend...
                    for /L %%i in (1,1,60) do (
                        curl -sf http://localhost:8081/health >nul 2>&1
                        if not errorlevel 1 (
                            echo Backend healthy
                            goto :frontend
                        )
                        ping -n 3 127.0.0.1 >nul
                    )
                    echo Backend health check timed out
                    exit 1

                    :frontend
                    echo Waiting for frontend...
                    for /L %%i in (1,1,60) do (
                        curl -sf http://localhost:5273 >nul 2>&1
                        if not errorlevel 1 (
                            echo Frontend healthy
                            goto :admin
                        )
                        ping -n 3 127.0.0.1 >nul
                    )
                    echo Frontend health check timed out
                    exit 1

                    :admin
                    echo Waiting for admin...
                    for /L %%i in (1,1,60) do (
                        curl -sf http://localhost:5274 >nul 2>&1
                        if not errorlevel 1 (
                            echo Admin healthy
                            goto :done
                        )
                        ping -n 3 127.0.0.1 >nul
                    )
                    echo Admin health check timed out
                    exit 1

                    :done
                    echo All services healthy!
                '''
            }
        }


        /*
        =====================================================
        E2E TESTS (with watchdog for Windows reliability)
        =====================================================
        */

        stage('E2E Tests') {

            options {

                timeout(
                    time: 50,
                    unit: 'MINUTES'
                )
            }

            steps {

                bat '''
                    echo ========================================
                    echo Running End-to-End Tests (with CI watchdog)
                    echo ========================================

                    call node scripts/run-e2e-ci.mjs --grep-invert "@visual|@performance|@smoke"
                '''
            }
        }


        /*
        =====================================================
        ACCESSIBILITY TESTS
        =====================================================
        */

        stage('Accessibility Tests') {

            options {
                timeout(time: 35, unit: 'MINUTES')
            }

            steps {

                bat '''
                    echo ========================================
                    echo Running Accessibility Tests
                    echo ========================================

                    call node scripts/run-e2e-ci.mjs --grep @accessibility --cap=15
                '''
            }
        }


        /*
        =====================================================
        PERFORMANCE TESTS
        =====================================================
        */

        stage('Performance Tests') {

            options {
                timeout(time: 35, unit: 'MINUTES')
            }

            steps {

                bat '''
                    echo ========================================
                    echo Running Performance Tests
                    echo ========================================

                    call node scripts/run-e2e-ci.mjs --grep @performance --project=chromium --cap=15
                '''
            }
        }


        /*
        =====================================================
        LOAD TEST
        =====================================================
        */

        stage('Load Test') {

            options {
                timeout(time: 20, unit: 'MINUTES')
            }

            steps {

                bat '''
                    echo ========================================
                    echo Running Load Test
                    echo ========================================

                    call npm run test:load
                '''
            }
        }


        /*
        =====================================================
        DEPENDENCY SECURITY AUDIT
        =====================================================
        */

        stage('Dependency Audit') {

            failFast false

            parallel {


                stage('Root Audit') {

                    steps {

                        bat '''
                            npm audit --audit-level=high
                        '''
                    }
                }


                stage('Backend Audit') {

                    steps {

                        dir('backend') {

                            bat '''
                                npm audit --audit-level=high
                            '''
                        }
                    }
                }


                stage('Admin Audit') {

                    steps {

                        dir('admin') {

                            bat '''
                                npm audit --audit-level=high
                            '''
                        }
                    }
                }
            }
        }


        /*
        =====================================================
        FINAL QUALITY GATE
        =====================================================
        */

        stage('Quality Gate') {

            steps {

                script {

                    if (
                        currentBuild.currentResult == 'SUCCESS' ||
                        currentBuild.currentResult == null
                    ) {

                        echo '''
==================================================

        ALL CI QUALITY CHECKS PASSED

==================================================

✓ Dependencies installed

✓ Environment validation passed

✓ Database connectivity verified

✓ ESLint passed

✓ Frontend tests (Vitest) passed

✓ Backend tests (Jest + Vitest) passed

✓ Admin tests (Vitest) passed

✓ Frontend build passed

✓ Backend build validation passed

✓ Admin build passed

✓ Playwright Chromium installed

✓ Stack health check passed

✓ E2E tests passed

✓ Accessibility tests passed

✓ Performance tests passed

✓ Load test passed

✓ Dependency audit passed

==================================================

READY FOR DEPLOYMENT

==================================================
'''
                    }
                }
            }
        }
    }


    /*
    =====================================================
    POST ACTIONS
    =====================================================
    */

    post {


        always {

            echo '''
========================================

Pipeline execution finished.

Collecting artifacts...

========================================
'''

            archiveArtifacts(
                artifacts: '''
                    test-results/**,
                    playwright-report/**,
                    backend/test-results/**,
                    admin/test-results/**,
                    lint-report.txt
                ''',
                allowEmptyArchive: true
            )
        }


        success {

            echo '''
========================================

        CI PIPELINE SUCCESSFUL

========================================

All configured tests passed.

The repository has passed:

Lint
Unit Tests (Vitest/Jest)
Integration Tests (Vitest + Supertest)
Build Validation
E2E Tests (with watchdog)
Accessibility Tests
Performance Tests
Load Tests
Dependency Audit

========================================
'''
        }


        failure {

            echo '''
========================================

        CI PIPELINE FAILED

========================================

A quality gate failed.

Check the Jenkins stage that failed.

The pipeline stopped before deployment.

========================================
'''
        }


        aborted {

            echo '''
Pipeline was aborted.
'''
        }


        cleanup {

            cleanWs(
                deleteDirs: true,
                disableDeferredWipeout: true
            )
        }
    }
}