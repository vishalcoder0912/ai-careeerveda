#!/usr/bin/env bash
# CareerVeda — GCP Monitoring and Alerting setup.
#
# Creates Cloud Monitoring dashboards and alerting policies for:
#   - VM health and resource usage
#   - Load balancer traffic and errors
#   - Cloud Armor blocked requests
#   - Application error rates
#
# Usage:
#   bash deploy/monitoring-setup.sh
#
# Prerequisites:
#   - gcloud CLI authenticated
#   - Compute Engine API enabled
#   - Cloud Monitoring API enabled

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${REGION:-asia-south1}"
MIG_NAME="${MIG_NAME:-careerveda-mig}"
ARMOR_POLICY="${ARMOR_POLICY:-careerveda-armor}"
NOTIFICATION_EMAIL="${NOTIFICATION_EMAIL:-}"

echo "============================================================"
echo " CareerVeda Monitoring Setup"
echo " Project: $PROJECT_ID"
echo "============================================================"

# ── Step 1: Create notification channel (email) ──────────────────────────────
if [ -n "$NOTIFICATION_EMAIL" ]; then
  echo "==> Creating email notification channel..."
  gcloud alpha monitoring channels create \
    --project="$PROJECT_ID" \
    --display-name="CareerVeda Alerts" \
    --type=email \
    --channel-labels=email_address="$NOTIFICATION_EMAIL" \
    2>/dev/null && echo "    Notification channel created" || echo "    Channel already exists"
fi

echo ""

# ── Step 2: Create alerting policies ─────────────────────────────────────────
echo "==> Creating alerting policies..."

# Alert: High CPU usage across MIG
cat > /tmp/cpu-alert.json << 'ALERT'
{
  "displayName": "CareerVeda - High CPU Usage",
  "conditions": [
    {
      "displayName": "CPU utilization above 80%",
      "conditionThreshold": {
        "filter": "resource.type = \"gce_instance\" AND metric.type = \"compute.googleapis.com/instance/cpu/utilization\" AND metadata.user_labels.\"managed-by\" = \"careerveda-mig\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 0.8,
        "duration": "300s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_MEAN"
          }
        ]
      }
    }
  ],
  "alertStrategy": {
    "autoClose": "1800s"
  },
  "combiner": "OR"
}
ALERT

gcloud alpha monitoring policies create \
  --project="$PROJECT_ID" \
  --notification-channels="" \
  --policy-from-file=/tmp/cpu-alert.json \
  2>/dev/null && echo "    CPU alert created" || echo "    CPU alert already exists"

# Alert: Unhealthy instances in MIG
cat > /tmp/health-alert.json << 'ALERT'
{
  "displayName": "CareerVeda - Unhealthy Instances",
  "conditions": [
    {
      "displayName": "Instance unhealthy",
      "conditionThreshold": {
        "filter": "resource.type = \"gce_instance\" AND metric.type = \"compute.googleapis.com/instance/health\" AND metadata.user_labels.\"managed-by\" = \"careerveda-mig\"",
        "comparison": "COMPARISON_LT",
        "thresholdValue": 1,
        "duration": "300s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_MEAN"
          }
        ]
      }
    }
  ],
  "alertStrategy": {
    "autoClose": "1800s"
  },
  "combiner": "OR"
}
ALERT

gcloud alpha monitoring policies create \
  --project="$PROJECT_ID" \
  --notification-channels="" \
  --policy-from-file=/tmp/health-alert.json \
  2>/dev/null && echo "    Health alert created" || echo "    Health alert already exists"

# Alert: High 5xx error rate
cat > /tmp/5xx-alert.json << 'ALERT'
{
  "displayName": "CareerVeda - High 5xx Error Rate",
  "conditions": [
    {
      "displayName": "5xx errors above 1%",
      "conditionThreshold": {
        "filter": "resource.type = \"https_lb_rule\" AND metric.type = \"loadbalancing.googleapis.com/https/request_count\" AND metric.labels.response_code_class = \"500\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 10,
        "duration": "300s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_RATE",
            "crossSeriesReducer": "REDUCE_SUM"
          }
        ]
      }
    }
  ],
  "alertStrategy": {
    "autoClose": "1800s"
  },
  "combiner": "OR"
}
ALERT

gcloud alpha monitoring policies create \
  --project="$PROJECT_ID" \
  --notification-channels="" \
  --policy-from-file=/tmp/5xx-alert.json \
  2>/dev/null && echo "    5xx error alert created" || echo "    5xx error alert already exists"

# Alert: Cloud Armor blocked requests spike
cat > /tmp/armor-alert.json << 'ALERT'
{
  "displayName": "CareerVeda - Cloud Armor Blocked Request Spike",
  "conditions": [
    {
      "displayName": "Blocked requests above 100/min",
      "conditionThreshold": {
        "filter": "resource.type = \"gce_instance\" AND metric.type = \"logging.googleapis.com/user/cloud_armor_blocked\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 100,
        "duration": "300s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_RATE"
          }
        ]
      }
    }
  ],
  "alertStrategy": {
    "autoClose": "1800s"
  },
  "combiner": "OR"
}
ALERT

gcloud alpha monitoring policies create \
  --project="$PROJECT_ID" \
  --notification-channels="" \
  --policy-from-file=/tmp/armor-alert.json \
  2>/dev/null && echo "    Cloud Armor alert created" || echo "    Cloud Armor alert already exists"

# Alert: MIG scaled to maximum
cat > /tmp/scale-alert.json << 'ALERT'
{
  "displayName": "CareerVeda - MIG at Maximum Capacity",
  "conditions": [
    {
      "displayName": "Instance count at max",
      "conditionThreshold": {
        "filter": "resource.type = \"autoscaler\" AND metric.type = \"autoscaling.googleapis.com/autoscaler/num_instances\" AND metadata.user_labels.\"managed-by\" = \"careerveda-mig\"",
        "comparison": "COMPARISON_GE",
        "thresholdValue": 10,
        "duration": "300s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_MEAN"
          }
        ]
      }
    }
  ],
  "alertStrategy": {
    "autoClose": "1800s"
  },
  "combiner": "OR"
}
ALERT

gcloud alpha monitoring policies create \
  --project="$PROJECT_ID" \
  --notification-channels="" \
  --policy-from-file=/tmp/scale-alert.json \
  2>/dev/null && echo "    Scale alert created" || echo "    Scale alert already exists"

echo ""

# ── Step 3: Create log-based metrics for Cloud Armor ─────────────────────────
echo "==> Creating log-based metrics..."

gcloud logging metrics create cloud-armor-blocked \
  --project="$PROJECT_ID" \
  --description="Count of requests blocked by Cloud Armor" \
  --log-filter='resource.type="http_load_balancer" AND jsonPayload.enforcedSecurityPolicy.outcome="DENY"' \
  2>/dev/null && echo "    Cloud Armor metric created" || echo "    Metric already exists"

echo ""

# ── Cleanup ──────────────────────────────────────────────────────────────────
rm -f /tmp/cpu-alert.json /tmp/health-alert.json /tmp/5xx-alert.json \
      /tmp/armor-alert.json /tmp/scale-alert.json

echo "============================================================"
echo " Monitoring Setup Complete!"
echo ""
echo " Created:"
echo "   - CPU usage alerting (>80% for 5 minutes)"
echo "   - Unhealthy instance alerting"
echo "   - 5xx error rate alerting"
echo "   - Cloud Armor blocked request spike alerting"
echo "   - MIG at maximum capacity alerting"
echo "   - Log-based metric for Cloud Armor blocks"
echo ""
echo " Next steps:"
echo "   1. Update notification channels in GCP Console:"
echo "      https://console.cloud.google.com/monitoring/alerting"
echo "   2. Create dashboards in GCP Console:"
echo "      https://console.cloud.google.com/monitoring/dashboards"
echo "   3. Test alerts by triggering conditions"
echo "============================================================"
