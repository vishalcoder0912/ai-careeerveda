# CareerVeda — Disaster Recovery Runbook

## Quick Reference

| Scenario | Recovery Time | Action |
|---|---|---|
| Single VM crash | 2-5 minutes | Auto-healing via MIG |
| Database outage | 5-15 minutes | Failover to backup |
| DDoS attack | 0 (prevention) | Cloudflare + Cloud Armor |
| Full region outage | 30-60 minutes | Restore from snapshot |
| Code deployment failure | 2-5 minutes | Rollback to previous commit |

---

## 1. VM Crash / Failure

### Symptoms
- Health checks failing
- Users seeing 502/503 errors
- MIG reports unhealthy instances

### Auto-Healing (No Action Needed)
The Managed Instance Group automatically:
1. Detects unhealthy instances via health checks
2. Removes them from the load balancer
3. Creates replacement instances
4. Applies the same startup script

### Manual Intervention (If Auto-Healing Fails)

```bash
# Check MIG status
gcloud compute instance-groups managed list-instances careerveda-mig \
  --region=asia-south1

# Force recreation of all instances
gcloud compute instance-groups managed rolling-action replace \
  careerveda-mig --region=asia-south1 --max-surge=2 --max-unavailable=0

# Check instance health
gcloud compute instance-groups managed describe careerveda-mig \
  --region=asia-south1
```

---

## 2. Database Outage (MongoDB Atlas)

### Symptoms
- `/ready` endpoint returns 503
- API requests returning database errors
- Application logs show connection failures

### Immediate Actions

```bash
# Check if the database is reachable from the VM
gcloud compute ssh careerveda-test --zone=asia-south1-a

# Test MongoDB connection
node -e "
  const mongoose = require('mongoose');
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => { console.log('Connected'); process.exit(0); })
    .catch(e => { console.error('Failed:', e.message); process.exit(1); });
"
```

### Recovery Steps

1. **Check MongoDB Atlas status:** https://status.mongodb.com
2. **If Atlas is down:** Wait for their incident resolution
3. **If it's a connection issue:**
   ```bash
   # Restart the backend service
   sudo systemctl restart careerveda-backend

   # Check logs
   journalctl -u careerveda-backend -n 50 --no-pager
   ```
4. **If the database is corrupted:**
   - Restore from Atlas backup (Point-in-Time Recovery)
   - Or restore from the most recent manual snapshot

### Database Backup Commands

```bash
# MongoDB Atlas automatic backups are enabled by default
# To create an on-demand backup via Atlas UI:
# Atlas → Cluster → Backups → Take Snapshot

# To restore from backup via Atlas UI:
# Atlas → Cluster → Backups → Restore → Select backup → Choose point in time
```

---

## 3. DDoS Attack

### Symptoms
- Unusual traffic spike in Cloudflare/GCP dashboards
- High CPU/memory on VMs
- Slow response times
- 429/403 responses increasing

### Immediate Response (First 5 minutes)

```bash
# 1. Check current traffic
curl -s "https://api.cloudflare.com/client/v4/zones/ZONE_ID/analytics/security" \
  -H "Authorization: Bearer CLOUDFLARE_API_TOKEN"

# 2. Scale up MIG to maximum immediately
gcloud compute instance-groups managed resize careerveda-mig \
  --size=10 --region=asia-south1

# 3. Block specific attacking IPs at application level
curl -X POST https://careerveda.in/api/v1/admin/security/block \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ip": "ATTACKER_IP", "reason": "ddos-attack", "durationMs": 3600000}'

# 4. Check Cloud Armor blocked requests
gcloud logging read 'resource.type="http_load_balancer" AND jsonPayload.enforcedSecurityPolicy.outcome="DENY"' \
  --limit=50 --format=json
```

### Escalation (After 5 minutes)

1. **Cloudflare Dashboard:**
   - Go to Security → DDoS
   - Enable "Under Attack Mode" (challenges all visitors)
   - Create IP Access Rules to block attack sources

2. **GCP Console:**
   - Go to Network Security → Cloud Armor
   - Temporarily increase rate limits
   - Add custom rules to block attack patterns

3. **If attack continues:**
   - Contact Cloudflare support (available on free plan for DDoS)
   - Contact GCP support if using paid support plan

### Post-Attack

1. Analyze attack patterns in Cloudflare analytics
2. Update Cloud Armor rules to prevent recurrence
3. Review and update rate limiting thresholds
4. Scale MIG back to normal size:
   ```bash
   gcloud compute instance-groups managed resize careerveda-mig \
     --size=2 --region=asia-south1
   ```

---

## 4. Code Deployment Failure

### Symptoms
- `/health` endpoint failing after deploy
- Application errors in logs
- Autodeploy reported failure

### Immediate Rollback

```bash
# SSH into the VM
gcloud compute ssh careerveda-test --zone=asia-south1-a

# Find the last good commit
cd /opt/careerveda
git log --oneline -10

# Rollback to previous commit
git reset --hard HEAD~1

# Rebuild and restart
sudo FORCE=1 /opt/careerveda/deploy/deploy.sh

# Verify
curl -s http://127.0.0.1:8080/health
```

### Prevent Future Issues

1. **Always test in development first**
2. **Use the deploy script's health check:**
   - The script waits 30 seconds for `/health` to respond
   - If it fails, the deploy is flagged
3. **Monitor after deploys:**
   ```bash
   # Watch logs for 5 minutes after deploy
   journalctl -u careerveda-backend -f --since "5 minutes ago"
   ```

---

## 5. Full Region Outage

### Symptoms
- All VMs in the region are unreachable
- GCP Console shows regional issues
- MongoDB Atlas may also be affected

### Recovery Steps

1. **Check GCP Status:** https://status.cloud.google.com
2. **If GCP is down:** Wait for resolution
3. **If it's your infrastructure:**
   ```bash
   # Create a new VM in a different zone
   gcloud compute instances create careerveda-recovery \
     --zone=asia-south1-b \
     --machine-type=e2-small \
     --image-family=ubuntu-2204-lts \
     --image-project=ubuntu-os-cloud \
     --tags=careerveda

   # Bootstrap the server
   gcloud compute ssh careerveda-recovery --zone=asia-south1-b
   sudo bash <(curl -fsSL https://raw.githubusercontent.com/.../deploy/setup-server.sh)
   ```

4. **Update DNS** to point to the new VM (if not using load balancer)

---

## 6. Secrets Compromise

### If JWT Secrets Are Leaked

```bash
# 1. Generate new secrets
JWT_ACCESS=$(openssl rand -base64 48 | tr -d '\n')
JWT_REFRESH=$(openssl rand -base64 48 | tr -d '\n')

# 2. Update the .env file on the VM
gcloud compute ssh careerveda-test --zone=asia-south1-a
sudo nano /opt/careerveda/backend/.env
# Update JWT_ACCESS_SECRET and JWT_REFRESH_SECRET

# 3. Restart the backend
sudo systemctl restart careerveda-backend

# 4. All existing tokens are now invalid — users must log in again
```

### If MongoDB Credentials Are Leaked

1. **Immediately** change the MongoDB Atlas password
2. Update `MONGODB_URI` in the VM's `.env`
3. Restart the backend

---

## Monitoring Commands

```bash
# Real-time traffic monitoring
gcloud logging read 'resource.type="http_load_balancer"' --limit=10 --tail

# Cloud Armor blocks
gcloud logging read 'resource.type="http_load_balancer" AND jsonPayload.enforcedSecurityPolicy.outcome="DENY"' --limit=20

# MIG instance status
gcloud compute instance-groups managed list-instances careerveda-mig --region=asia-south1

# Backend health
curl -s https://careerveda.in/health | jq .

# Backend readiness (includes database check)
curl -s https://careerveda.in/ready | jq .

# Application logs
journalctl -u careerveda-backend -f

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

---

## Contact Information

| Service | Support |
|---|---|
| GCP Support | https://cloud.google.com/support |
| MongoDB Atlas | https://support.mongodb.com |
| Cloudflare | https://support.cloudflare.com |
| GitHub | https://github.com/vishalcoder0912/ai-careeerveda/issues |

---

## Recovery Time Objectives

| Metric | Target | How |
|---|---|---|
| RTO (Recovery Time Objective) | < 5 minutes | MIG auto-healing + autoscaling |
| RPO (Recovery Point Objective) | < 1 hour | MongoDB Atlas continuous backups |
| Availability | 99.9% | Multi-instance + health checks |
| DDoS Mitigation | < 30 seconds | Cloudflare + Cloud Armor |
