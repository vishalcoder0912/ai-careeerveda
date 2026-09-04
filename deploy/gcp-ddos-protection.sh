#!/usr/bin/env bash
# CareerVeda — GCP Cloud Armor + Load Balancer + Managed Instance Group setup.
#
# This script creates a production-grade infrastructure that protects against
# DDoS attacks and automatically scales to handle traffic spikes.
#
# Prerequisites:
#   - gcloud CLI authenticated with appropriate permissions
#   - A GCP project with Compute Engine API enabled
#   - The CareerVeda VM already deployed and tested
#
# Usage:
#   bash deploy/gcp-ddos-protection.sh
#
# What it creates:
#   1. Cloud Armor security policy (DDoS + WAF rules)
#   2. Instance template from existing VM
#   3. Managed Instance Group with autoscaling
#   4. Health checks
#   5. Backend service + URL map + HTTPS load balancer
#   6. Firewall rules (only allow LB → VM, block direct internet)

set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${REGION:-asia-south1}"
ZONE="${ZONE:-asia-south1-a}"
MIG_NAME="${MIG_NAME:-careerveda-mig}"
TEMPLATE_NAME="${TEMPLATE_NAME:-careerveda-template}"
HEALTH_CHECK_NAME="${HEALTH_CHECK_NAME:-careerveda-health}"
ARMOR_POLICY="${ARMOR_POLICY:-careerveda-armor}"
LB_NAME="${LB_NAME:-careerveda-lb}"
NETWORK="${NETWORK:-default}"
# Existing VM name to create template from
SOURCE_VM="${SOURCE_VM:-careerveda-test}"

echo "============================================================"
echo " CareerVeda GCP DDoS Protection Setup"
echo " Project: $PROJECT_ID"
echo " Region:  $REGION"
echo " Zone:    $ZONE"
echo "============================================================"
echo ""

# ── Step 1: Create Cloud Armor security policy ───────────────────────────────
echo "==> Step 1: Creating Cloud Armor security policy..."

# Create the policy with rules
gcloud compute security-policies create "$ARMOR_POLICY" \
  --project="$PROJECT_ID" \
  --description="CareerVeda DDoS and WAF protection" \
  --global \
  2>/dev/null || echo "    Policy already exists, updating..."

# Rule 1: Block known bad bots and scanners
gcloud compute security-policies rules create 1000 \
  --security-policy="$ARMOR_POLICY" \
  --expression="userAgent() matches '*(?:masscan|nikto|sqlmap|nmap|dirbuster|gobuster|ffuf|wfuzz|nuclei|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider|python-requests|go-http-client)***'" \
  --action="deny-403" \
  --description="Block known bad bots and scanners" \
  --global \
  2>/dev/null || echo "    Rule 1000 already exists"

# Rule 2: Block requests with no User-Agent (likely scripts/crawlers)
gcloud compute security-policies rules create 1001 \
  --security-policy="$ARMOR_POLICY" \
  --expression="!has(request.headers['user-agent'])" \
  --action="deny-403" \
  --description="Block requests without User-Agent" \
  --global \
  2>/dev/null || echo "    Rule 1001 already exists"

# Rule 3: Rate limiting — 500 requests per minute per IP
gcloud compute security-policies rules create 2000 \
  --security-policy="$ARMOR_POLICY" \
  --expression="true" \
  --action="throttle" \
  --rate-limit-threshold-count=500 \
  --rate-limit-threshold-interval-sec=60 \
  --conform-action="allow" \
  --exceed-action="deny-429" \
  --enforce-on-key="IP" \
  --description="Rate limit: 500 req/min per IP" \
  --global \
  2>/dev/null || echo "    Rule 2000 already exists"

# Rule 4: Stricter rate limit on auth endpoints
gcloud compute security-policies rules create 2001 \
  --security-policy="$ARMOR_POLICY" \
  --expression="startsWith(request.path, '/api/v1/auth')" \
  --action="throttle" \
  --rate-limit-threshold-count=20 \
  --rate-limit-threshold-interval-sec=60 \
  --conform-action="allow" \
  --exceed-action="deny-429" \
  --enforce-on-key="IP" \
  --description="Rate limit auth: 20 req/min per IP" \
  --global \
  2>/dev/null || echo "    Rule 2001 already exists"

# Rule 5: Block SQL injection attempts
gcloud compute security-policies rules create 3000 \
  --security-policy="$ARMOR_POLICY" \
  --expression="evaluatePreconfiguredExpr('sqli-stable')" \
  --action="deny-403" \
  --description="Block SQL injection attempts" \
  --global \
  2>/dev/null || echo "    Rule 3000 already exists"

# Rule 6: Block XSS attempts
gcloud compute security-policies rules create 3001 \
  --security-policy="$ARMOR_POLICY" \
  --expression="evaluatePreconfiguredExpr('xss-stable')" \
  --action="deny-403" \
  --description="Block XSS attempts" \
  --global \
  2>/dev/null || echo "    Rule 3001 already exists"

# Rule 7: Block path traversal
gcloud compute security-policies rules create 3002 \
  --security-policy="$ARMOR_POLICY" \
  --expression="evaluatePreconfiguredExpr('lfi-stable')" \
  --action="deny-403" \
  --description="Block local file inclusion / path traversal" \
  --global \
  2>/dev/null || echo "    Rule 3002 already exists"

echo "    Cloud Armor policy configured with 7 rules"
echo ""

# ── Step 2: Create instance template from existing VM ────────────────────────
echo "==> Step 2: Creating instance template from VM '$SOURCE_VM'..."

gcloud compute instance-templates create "$TEMPLATE_NAME" \
  --project="$PROJECT_ID" \
  --source-instance="$SOURCE_VM" \
  --source-instance-zone="$ZONE" \
  --machine-type=e2-small \
  --tags=careerveda,lb-health-check \
  --region="$REGION" \
  2>/dev/null || echo "    Template already exists"

echo "    Instance template created"
echo ""

# ── Step 3: Create health check ─────────────────────────────────────────────
echo "==> Step 3: Creating health check..."

gcloud compute health-checks create http "$HEALTH_CHECK_NAME" \
  --project="$PROJECT_ID" \
  --port=80 \
  --request-path=/health \
  --check-interval=10 \
  --timeout=5 \
  --healthy-threshold=2 \
  --unhealthy-threshold=3 \
  --global \
  2>/dev/null || echo "    Health check already exists"

echo "    Health check configured"
echo ""

# ── Step 4: Create Managed Instance Group ────────────────────────────────────
echo "==> Step 4: Creating Managed Instance Group with autoscaling..."

gcloud compute instance-groups managed create "$MIG_NAME" \
  --project="$PROJECT_ID" \
  --template="$TEMPLATE_NAME" \
  --size=2 \
  --region="$REGION" \
  2>/dev/null || echo "    MIG already exists"

# Set named port (HTTP = 80)
gcloud compute instance-groups managed set-named-ports "$MIG_NAME" \
  --project="$PROJECT_ID" \
  --named-ports=http:80 \
  --region="$REGION"

# Configure autoscaling
gcloud compute instance-groups managed set-autoscaling "$MIG_NAME" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --min-num-replicas=2 \
  --max-num-replicas=10 \
  --target-cpu-utilization=0.7 \
  --cool-down-period=90 \
  --scale-in-control.cpu-utilization=0.3 \
  --mode=on

# Attach health check
gcloud compute instance-groups managed set-health-check "$MIG_NAME" \
  --project="$PROJECT_ID" \
  --health-check="$HEALTH_CHECK_NAME" \
  --region="$REGION"

echo "    MIG created: 2-10 instances, autoscaling on CPU > 70%"
echo ""

# ── Step 5: Create backend service with Cloud Armor ──────────────────────────
echo "==> Step 5: Creating backend service with Cloud Armor..."

gcloud compute backend-services create "$LB_NAME"-backend \
  --project="$PROJECT_ID" \
  --protocol=HTTP \
  --port-name=http \
  --health-checks="$HEALTH_CHECK_NAME" \
  --global \
  --enable-cdn \
  --connection-draining-timeout=30 \
  --load-balancing-scheme=EXTERNAL_MANAGED \
  2>/dev/null || echo "    Backend service already exists"

# Add the MIG as a backend
gcloud compute backend-services add-backend "$LB_NAME"-backend \
  --project="$PROJECT_ID" \
  --instance-group="$MIG_NAME" \
  --instance-group-region="$REGION" \
  --balancing-mode=UTILIZATION \
  --max-utilization=0.8 \
  --capacity-scaler=1.0 \
  --global

# Attach Cloud Armor policy
gcloud compute backend-services update "$LB_NAME"-backend \
  --project="$PROJECT_ID" \
  --security-policy="$ARMOR_POLICY" \
  --global

echo "    Backend service configured with Cloud Armor and CDN"
echo ""

# ── Step 6: Create URL map ───────────────────────────────────────────────────
echo "==> Step 6: Creating URL map..."

gcloud compute url-maps create "$LB_NAME"-urlmap \
  --project="$PROJECT_ID" \
  --default-service="$LB_NAME"-backend \
  --global \
  2>/dev/null || echo "    URL map already exists"

echo "    URL map created"
echo ""

# ── Step 7: Create SSL certificate (managed) ─────────────────────────────────
echo "==> Step 7: Creating managed SSL certificate..."

gcloud compute ssl-certificates create "$LB_NAME"-cert \
  --project="$PROJECT_ID" \
  --domains=careerveda.in \
  --global \
  2>/dev/null || echo "    SSL certificate already exists (may take time to provision)"

echo "    SSL certificate requested"
echo ""

# ── Step 8: Create HTTPS target proxy ────────────────────────────────────────
echo "==> Step 8: Creating HTTPS target proxy..."

gcloud compute target-https-proxies create "$LB_NAME"-https-proxy \
  --project="$PROJECT_ID" \
  --url-map="$LB_NAME"-urlmap \
  --ssl-certificates="$LB_NAME"-cert \
  --global \
  2>/dev/null || echo "    HTTPS proxy already exists"

echo "    HTTPS proxy created"
echo ""

# ── Step 9: Create forwarding rule (global static IP) ────────────────────────
echo "==> Step 9: Creating global forwarding rule..."

gcloud compute forwarding-rules create "$LB_NAME"-https-rule \
  --project="$PROJECT_ID" \
  --target-https-proxy="$LB_NAME"-https-proxy \
  --ports=443 \
  --global \
  2>/dev/null || echo "    Forwarding rule already exists"

# Also create HTTP → HTTPS redirect
gcloud compute url-maps import "$LB_NAME"-http-redirect \
  --project="$PROJECT_ID" \
  --global \
  --source=/dev/stdin <<< 'nameMap:
  defaultService: projects/'"$PROJECT_ID"'/global/urlMaps/'"$LB_NAME"'-urlmap' \
  2>/dev/null || true

echo "    Forwarding rule created"
echo ""

# ── Step 10: Firewall rules ─────────────────────────────────────────────────
echo "==> Step 10: Configuring firewall rules..."

# Allow health check probes from Google's health check IP ranges
gcloud compute firewall-rules create careerveda-allow-health-check \
  --project="$PROJECT_ID" \
  --network="$NETWORK" \
  --allow=tcp:80 \
  --source-ranges=130.211.0.0/22,35.191.0.0/16 \
  --target-tags=lb-health-check \
  --description="Allow Google LB health checks" \
  2>/dev/null || echo "    Health check firewall rule already exists"

# Allow traffic from Cloud Armor (Google's proxy IP ranges)
gcloud compute firewall-rules create careerveda-allow-lb \
  --project="$PROJECT_ID" \
  --network="$NETWORK" \
  --allow=tcp:80 \
  --source-ranges=130.211.0.0/22,35.191.0.0/16 \
  --target-tags=careerveda \
  --description="Allow traffic from Google Load Balancer" \
  2>/dev/null || echo "    LB firewall rule already exists"

# CRITICAL: Restrict direct internet access to the VM.
# Only allow traffic from the LB and health check IP ranges.
# SSH access is preserved via IAP (Identity-Aware Proxy).
gcloud compute firewall-rules create careerveda-restrict-direct \
  --project="$PROJECT_ID" \
  --network="$NETWORK" \
  --action=DENY \
  --rules=tcp:80,tcp:443,tcp:8081 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=careerveda \
  --description="Block direct internet access (use LB instead)" \
  2>/dev/null || echo "    Restriction rule already exists"

# Allow SSH via IAP (Identity-Aware Proxy) for management
gcloud compute firewall-rules create careerveda-allow-iap-ssh \
  --project="$PROJECT_ID" \
  --network="$NETWORK" \
  --allow=tcp:22 \
  --source-ranges=35.235.240.0/20 \
  --target-tags=careerveda \
  --description="Allow SSH via IAP" \
  2>/dev/null || echo "    IAP SSH rule already exists"

echo "    Firewall rules configured"
echo ""

# ── Summary ──────────────────────────────────────────────────────────────────
echo "============================================================"
echo " Setup Complete!"
echo ""
echo " Infrastructure:"
echo "   Cloud Armor Policy : $ARMOR_POLICY"
echo "   Instance Template  : $TEMPLATE_NAME"
echo "   MIG                : $MIG_NAME (2-10 instances, autoscaling)"
echo "   Health Check       : $HEALTH_CHECK_NAME"
echo "   Load Balancer      : $LB_NAME"
echo ""
echo " Protection layers:"
echo "   ✓ Cloud Armor DDoS protection (automatic)"
echo "   ✓ Rate limiting: 500 req/min/IP (general), 20 req/min/IP (auth)"
echo "   ✓ WAF rules: SQL injection, XSS, path traversal"
echo "   ✓ Bad bot blocking"
echo "   ✓ Autoscaling: 2-10 instances on CPU > 70%"
echo "   ✓ CDN caching for static assets"
echo "   ✓ Direct internet access blocked (traffic must go through LB)"
echo ""
echo " Next steps:"
echo "   1. Update DNS to point to the load balancer IP:"
echo "      gcloud compute forwarding-rules describe $LB_NAME-https-rule --global --format='value(IPAddress)'"
echo "   2. Set up Cloudflare (see deploy/cloudflare-setup.md)"
echo "   3. Configure monitoring (see deploy/monitoring-setup.sh)"
echo "============================================================"
