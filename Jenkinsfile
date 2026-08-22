pipeline {

    agent any


    environment {

        CI = 'true'

        NODE_OPTIONS = '--max-old-space-size=4096'

        // Project location inside repository
        PROJECT_DIR = 'full-stack-careerveda'
    }


    options {

        timestamps()

        disableConcurrentBuilds()

        skipDefaultCheckout(true)

        timeout(
            time: 90,
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
                    dir full-stack-careerveda
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

                        dir('full-stack-careerveda') {

                            bat '''
                                echo Installing Frontend Dependencies...
                                call npm ci
                            '''
                        }
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

                        dir('full-stack-careerveda/backend') {

                            bat '''
                                echo Installing Backend Dependencies...
                                call npm ci
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

                        dir('full-stack-careerveda/admin') {

                            bat '''
                                echo Installing Admin Dependencies...
                                call npm ci
                            '''
                        }
                    }
                }
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

                dir('full-stack-careerveda') {

                    bat '''
                        echo ========================================
                        echo Running ESLint
                        echo ========================================

                        call npm run lint
                    '''
                }
            }

            post {

                always {

                    dir('full-stack-careerveda') {

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
                FRONTEND
                */

                stage('Frontend Tests') {

                    options {
                        timeout(
                            time: 15,
                            unit: 'MINUTES'
                        )
                    }

                    steps {

                        dir('full-stack-careerveda') {

                            bat '''
                                echo ========================================
                                echo Running Frontend Tests
                                echo ========================================

                                call npm run test:frontend
                            '''
                        }
                    }
                }


                /*
                BACKEND
                */

                stage('Backend Tests') {

                    options {

                        /*
                        MongoMemoryServer may need to download
                        MongoDB binary on first CI run.
                        */

                        timeout(
                            time: 30,
                            unit: 'MINUTES'
                        )
                    }

                    steps {

                        dir('full-stack-careerveda') {

                            bat '''
                                echo ========================================
                                echo Running Backend Tests
                                echo Jest + Vitest + Supertest
                                echo ========================================

                                call npm run test:backend
                            '''
                        }
                    }
                }


                /*
                ADMIN
                */

                stage('Admin Tests') {

                    options {
                        timeout(
                            time: 15,
                            unit: 'MINUTES'
                        )
                    }

                    steps {

                        dir('full-stack-careerveda') {

                            bat '''
                                echo ========================================
                                echo Running Admin Tests
                                echo ========================================

                                call npm run test:admin
                            '''
                        }
                    }
                }
            }
        }


        /*
        =====================================================
        JEST TEST GATE
        =====================================================
        */

        stage('Jest Validation') {

            failFast true

            parallel {


                stage('Frontend Jest') {

                    options {
                        timeout(time: 10, unit: 'MINUTES')
                    }

                    steps {

                        dir('full-stack-careerveda') {

                            bat '''
                                call npm run test:jest:frontend
                            '''
                        }
                    }
                }


                stage('Backend Jest') {

                    options {
                        timeout(time: 10, unit: 'MINUTES')
                    }

                    steps {

                        dir('full-stack-careerveda') {

                            bat '''
                                call npm run test:jest:backend
                            '''
                        }
                    }
                }


                stage('Admin Jest') {

                    options {
                        timeout(time: 10, unit: 'MINUTES')
                    }

                    steps {

                        dir('full-stack-careerveda') {

                            bat '''
                                call npm run test:jest:admin
                            '''
                        }
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

                        dir('full-stack-careerveda') {

                            bat '''
                                echo ========================================
                                echo Building Public Website
                                echo ========================================

                                call npm run build:frontend
                            '''
                        }
                    }
                }


                stage('Build Backend') {

                    options {
                        timeout(time: 10, unit: 'MINUTES')
                    }

                    steps {

                        dir('full-stack-careerveda') {

                            bat '''
                                echo ========================================
                                echo Validating Backend Build
                                echo ========================================

                                call npm run build:backend
                            '''
                        }
                    }
                }


                stage('Build Admin') {

                    options {
                        timeout(time: 15, unit: 'MINUTES')
                    }

                    steps {

                        dir('full-stack-careerveda') {

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
        }


        /*
        =====================================================
        PLAYWRIGHT INSTALL
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

                dir('full-stack-careerveda') {

                    bat '''
                        echo ========================================
                        echo Installing Playwright Chromium
                        echo ========================================

                        call npx playwright install chromium
                    '''
                }
            }
        }


        /*
        =====================================================
        E2E TESTS
        =====================================================
        */

        stage('E2E Tests') {

            options {

                timeout(
                    time: 45,
                    unit: 'MINUTES'
                )
            }

            steps {

                dir('full-stack-careerveda') {

                    bat '''
                        echo ========================================
                        echo Running End-to-End Tests
                        echo ========================================

                        call npm run test:e2e
                    '''
                }
            }
        }


        /*
        =====================================================
        ACCESSIBILITY
        =====================================================
        */

        stage('Accessibility Tests') {

            options {
                timeout(time: 30, unit: 'MINUTES')
            }

            steps {

                dir('full-stack-careerveda') {

                    bat '''
                        echo ========================================
                        echo Running Accessibility Tests
                        echo ========================================

                        call npm run test:a11y
                    '''
                }
            }
        }


        /*
        =====================================================
        PERFORMANCE
        =====================================================
        */

        stage('Performance Tests') {

            options {
                timeout(time: 30, unit: 'MINUTES')
            }

            steps {

                dir('full-stack-careerveda') {

                    bat '''
                        echo ========================================
                        echo Running Performance Tests
                        echo ========================================

                        call npm run test:performance
                    '''
                }
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

                dir('full-stack-careerveda') {

                    bat '''
                        echo ========================================
                        echo Running Load Test
                        echo ========================================

                        call npm run test:load
                    '''
                }
            }
        }


        /*
        =====================================================
        DEPENDENCY SECURITY
        =====================================================
        */

        stage('Dependency Audit') {

            failFast false

            parallel {


                stage('Root Audit') {

                    steps {

                        dir('full-stack-careerveda') {

                            bat '''
                                npm audit --audit-level=high
                            '''
                        }
                    }
                }


                stage('Backend Audit') {

                    steps {

                        dir('full-stack-careerveda/backend') {

                            bat '''
                                npm audit --audit-level=high
                            '''
                        }
                    }
                }


                stage('Admin Audit') {

                    steps {

                        dir('full-stack-careerveda/admin') {

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

✓ ESLint passed

✓ Frontend tests passed

✓ Backend tests passed

✓ Admin tests passed

✓ Jest validation passed

✓ Frontend build passed

✓ Backend validation passed

✓ Admin build passed

✓ Playwright E2E passed

✓ Accessibility tests passed

✓ Performance tests passed

✓ Load tests passed

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
                    full-stack-careerveda/test-results/**,
                    full-stack-careerveda/playwright-report/**,
                    full-stack-careerveda/backend/test-results/**,
                    full-stack-careerveda/admin/test-results/**,
                    full-stack-careerveda/lint-report.txt
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
Unit Tests
Integration Tests
Jest Tests
Build Validation
E2E Tests
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