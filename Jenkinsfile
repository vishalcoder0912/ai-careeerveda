pipeline {
  agent any

  environment {
    CI = 'true'
    NODE_OPTIONS = '--max-old-space-size=4096'

    VITE_PUBLIC_API_BASE_URL = 'http://localhost:8091/api/v1'
    VITE_ADMIN_API_BASE_URL  = 'http://localhost:5574/api/v1'
    VITE_PUBLIC_SITE_URL     = 'http://localhost:5573'

    REGISTRY = 'ghcr.io'
    IMAGE_NAME = 'vishalcoder0912/ai-careeerveda'
  }

  options {
    timestamps()
    timeout(time: 60, unit: 'MINUTES')
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20', artifactNumToKeepStr: '10'))
  }

  triggers {
    pollSCM('H/5 * * * *')
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Setup') {
      steps {
        bat '''
          node --version
          npm --version
          where docker
          where docker-compose
        '''
      }
    }

    stage('Install Dependencies') {
      parallel {
        stage('Root') {
          steps {
            bat 'npm ci'
          }
        }
        stage('Backend') {
          steps {
            bat 'npm ci --prefix backend'
          }
        }
        stage('Admin') {
          steps {
            bat 'npm ci --prefix admin'
          }
        }
      }
    }

    stage('Lint') {
      steps {
        bat 'npm run lint'
      }
    }

    stage('Unit & Integration Tests') {
      parallel {
        stage('Frontend Tests') {
          steps {
            bat 'npm run test:frontend -- --pool=forks --testTimeout=30000'
          }
        }
        stage('Backend Tests') {
          steps {
            bat 'npm run test:backend'
          }
        }
        stage('Admin Tests') {
          steps {
            bat 'npm run test:admin'
          }
        }
      }
    }

    stage('Build') {
      parallel {
        stage('Build Backend') {
          steps {
            bat 'npm run build:backend'
          }
        }
        stage('Build Frontend') {
          steps {
            bat 'npm run build:frontend'
          }
        }
        stage('Build Admin') {
          steps {
            bat 'npm run build:admin'
          }
        }
      }
    }

    stage('E2E Tests') {
      options {
        timeout(time: 45, unit: 'MINUTES')
      }
      steps {
        script {
          // Start services in background for E2E
          bat '''
            cd full-stack-careerveda
            start /b docker compose -f compose.yaml up -d --build
          '''
          
          bat '''
            cd full-stack-careerveda
            for /L %%i in (1,1,60) do (
              curl -sf http://localhost:8081/health >nul 2>&1 && echo Backend healthy && goto :healthy
              timeout /t 2 /nobreak >nul
            )
            :healthy
          '''
          
          bat 'npx --yes playwright install chromium'
          bat 'npm run test:e2e'
          
          bat '''
            cd full-stack-careerveda
            docker compose -f compose.yaml down -v
          '''
        }
      }
    }

    stage('Security Scan') {
      when {
        expression { return isUnix() }
      }
      steps {
        sh '''
          docker run --rm -v $(pwd)/full-stack-careerveda:/app aquasec/trivy:latest fs --severity HIGH,CRITICAL /app
        '''
      }
    }

    stage('Build & Push Images') {
      when {
        anyOf {
          branch 'main'
          branch 'release/*'
          tag 'v*'
        }
      }
      environment {
        REGISTRY_CREDS = credentials('ghcr-credentials')
      }
      steps {
        script {
          def tag = env.BUILD_NUMBER
          def gitTag = env.GIT_TAG_NAME ?: ''
          
          dockerBuild('backend', 'backend', '', tag, true)
          dockerBuild('frontend', '', "--build-arg VITE_PUBLIC_API_BASE_URL=https://api.careerveda.com/api/v1", tag, true)
          dockerBuild('admin', '', "--build-arg VITE_ADMIN_API_BASE_URL=https://api.careerveda.com/api/v1 --build-arg VITE_PUBLIC_SITE_URL=https://careerveda.com", tag, true)
          
          if (gitTag) {
            dockerBuild('backend', 'backend', '', gitTag, true)
            dockerBuild('frontend', '', "--build-arg VITE_PUBLIC_API_BASE_URL=https://api.careerveda.com/api/v1", gitTag, true)
            dockerBuild('admin', '', "--build-arg VITE_ADMIN_API_BASE_URL=https://api.careerveda.com/api/v1 --build-arg VITE_PUBLIC_SITE_URL=https://careerveda.com", gitTag, true)
          }
        }
      }
    }

    stage('Deploy to Staging') {
      when {
        branch 'main'
      }
      steps {
        script {
          echo "Deploying to staging..."
        }
      }
    }

    stage('Deploy to Production') {
      when {
        tag 'v*'
      }
      steps {
        input message: 'Deploy to production?', ok: 'Deploy'
        script {
          echo "Deploying to production..."
        }
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'full-stack-careerveda/test-results/**', allowEmptyArchive: true
      archiveArtifacts artifacts: 'full-stack-careerveda/backend/test-results/**', allowEmptyArchive: true
      archiveArtifacts artifacts: 'full-stack-careerveda/admin/test-results/**', allowEmptyArchive: true
      
      script {
        bat '''
          cd full-stack-careerveda
          docker compose -f compose.yaml down -v --remove-orphans 2>nul || exit 0
        '''
      }
    }
    success {
      echo '✅ Pipeline succeeded'
    }
    failure {
      echo '❌ Pipeline failed'
    }
    unstable {
      echo '⚠️ Pipeline unstable'
    }
  }
}

def isUnix() {
  return !System.getProperty('os.name').toLowerCase().contains('windows')
}

def dockerBuild(imageName, context, buildArgs, tag = null, push = false) {
  def fullTag = tag ? "${env.REGISTRY}/${env.IMAGE_NAME}-${imageName}:${tag}" : "${env.REGISTRY}/${env.IMAGE_NAME}-${imageName}:${env.BUILD_NUMBER}"
  def latestTag = "${env.REGISTRY}/${env.IMAGE_NAME}-${imageName}:latest"
  def dockerfile = imageName == 'backend' ? 'backend/Dockerfile' : (imageName == 'admin' ? 'admin/Dockerfile' : 'Dockerfile')
  def buildContext = context ? "full-stack-careerveda/${context}" : 'full-stack-careerveda'
  
  bat """
    cd ${buildContext}
    docker build ^
      --file ${dockerfile} ^
      --tag ${fullTag} ^
      --tag ${latestTag} ^
      ${buildArgs} ^
      .
  """
  if (push) {
    bat "docker push ${fullTag}"
    bat "docker push ${latestTag}"
  }
}