# Jenkins Credentials Setup
# Add these credentials in Jenkins > Credentials > System > Global credentials (unrestricted)

# 1. GitHub Push Credentials (for merging dev to main)
# Type: Username with password
# ID: github-push
# Username: your-github-username
# Password: GitHub Personal Access Token (repo scope)

# 2. GHCR (GitHub Container Registry) Credentials
# Type: Username with password
# ID: ghcr-credentials
# Username: your-github-username
# Password: GitHub Personal Access Token (write:packages, read:packages, delete:packages)

# 3. Kubernetes Config (for deployment)
# Type: Secret file
# ID: kubeconfig-staging
# File: ~/.kube/config (staging cluster)

# 4. Kubernetes Config (for production)
# Type: Secret file
# ID: kubeconfig-production
# File: ~/.kube/config (production cluster)

# 5. Slack Webhook (for notifications)
# Type: Secret text
# ID: slack-webhook
# Secret: https://hooks.slack.com/services/XXX/XXX/XXX

# 6. SonarCloud Token (optional)
# Type: Secret text
# ID: sonarcloud-token
# Secret: your-sonarcloud-token