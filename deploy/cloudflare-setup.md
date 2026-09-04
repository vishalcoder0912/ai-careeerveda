# CareerVeda — Cloudflare + GCP DDoS Protection Setup Guide

## Architecture Overview

```
Internet
    │
    ▼
Cloudflare (Layer 7 DDoS, caching, bot filtering)
    │
    ▼
GCP Load Balancer + Cloud Armor (Layer 3/4 DDoS, WAF, rate limiting)
    │
    ▼
Managed Instance Group (2-10 VMs, autoscaling)
    │
    ▼
MongoDB Atlas (database)
```

---

## Phase 1: Immediate Protection (Do Now)

### 1.1 Configure Cloudflare

1. **Sign up** at https://dash.cloudflare.com (free plan is sufficient)
2. **Add your domain** `careerveda.in`
3. **Update nameservers** at your domain registrar to Cloudflare's
4. **Enable these Cloudflare features:**

#### SSL/TLS
- Set to **Full (Strict)** — Cloudflare ↔ your origin uses HTTPS
- Enable **Always Use HTTPS**
- Enable **Automatic HTTPS Rewrites**

#### Security
- **Security Level:** Medium
- **Browser Integrity Check:** On
- **Challenge Passage:** 30 minutes

#### Speed
- **Auto Minify:** JavaScript, CSS, HTML
- **Brotli:** On
- **Rocket Loader:** Off (can break React apps)

#### Caching
- **Caching Level:** Standard
- **Browser Cache TTL:** Respect Origin Headers

### 1.2 Create Cloudflare Page Rules

Create these rules in order (first match wins):

| URL Pattern | Setting | Value |
|---|---|---|
| `*careerveda.in/api/*` | Cache Level | Bypass |
| `*careerveda.in/api/*` | Security Level | High |
| `*careerveda.in/admin/*` | Security Level | High |
| `*careerveda.in/login*` | Security Level | High |

### 1.3 Enable Cloudflare WAF

1. Go to **Security → WAF**
2. Enable **Cloudflare Managed Ruleset** (free tier includes basic rules)
3. Enable **OWASP Core Ruleset** if available on your plan

### 1.4 Create Rate Limiting Rules

Go to **Security → WAF → Rate limiting rules**:

| Rule | Expression | Action | Rate |
|---|---|---|---|
| API Auth | `http.request.uri.path contains "/auth/login"` | Block | 10 req/min |
| Form Submit | `http.request.uri.path contains "/leads"` | Challenge | 20 req/min |
| General | `true` | Challenge | 500 req/min |

### 1.5 Configure Firewall Rules

Go to **Security → WAF → Tools → IP Access Rules**:

Block known bad IP ranges if identified.

Go to **Security → WAF → Custom rules**:

```
Rule 1: Block empty User-Agent
Expression: not http.user_agent contains ""
Action: Block

Rule 2: Block known scanners
Expression: http.user_agent contains "sqlmap" or http.user_agent contains "nikto" or http.user_agent contains "nmap"
Action: Block
```

---

## Phase 2: GCP Infrastructure (Run Script)

### 2.1 Run the GCP setup script

```bash
# Set your GCP project
export PROJECT_ID="your-gcp-project-id"

# Run from the repo root
bash deploy/gcp-ddos-protection.sh
```

This creates:
- Cloud Armor security policy
- Managed Instance Group (2-10 instances)
- Autoscaling (CPU > 70%)
- HTTPS Load Balancer with managed SSL
- Firewall rules (only LB → VM)

### 2.2 Point Cloudflare to GCP

After the load balancer is created:

```bash
# Get the load balancer IP
LB_IP=$(gcloud compute forwarding-rules describe careerveda-lb-https-rule \
  --global --format='value(IPAddress)')

echo "Add this A record in Cloudflare DNS:"
echo "  Type: A"
echo "  Name: careerveda.in"
echo "  Content: $LB_IP"
echo "  Proxy status: Proxied (orange cloud)"
```

**Important:** Enable the orange cloud (Proxied) for all DNS records except:
- `api.careerveda.in` if you want direct API access (not recommended)
- Any records that need to be accessed by IP

### 2.3 Restrict Direct VM Access

After Cloudflare is working:

```bash
# Tag the existing VM
gcloud compute instances add-tags careerveda-test \
  --tags=careerveda --zone=asia-south1-a

# The firewall rules created by the script will block direct access
# Only Cloudflare → LB → VM traffic will be allowed
```

---

## Phase 3: Verify Protection

### 3.1 Test DDoS Protection

```bash
# Test from your machine (should work through Cloudflare)
curl -I https://careerveda.in/health

# Test rate limiting (should get 429 after many requests)
for i in $(seq 1 100); do
  curl -s -o /dev/null -w "%{http_code}\n" https://careerveda.in/api/v1/public/programs
done

# Test bad bot blocking (should get blocked)
curl -H "User-Agent: sqlmap/1.0" https://careerveda.in/
```

### 3.2 Monitor Attack Traffic

In Cloudflare Dashboard:
- **Analytics → Security** — see blocked threats
- **Analytics → Traffic** — see request patterns

In GCP Console:
- **Network Security → Cloud Armor** — see blocked requests
- **Compute Engine → MIG** — see autoscaling events
- **Monitoring** — dashboards and alerts

---

## Emergency Procedures

### During an Active Attack

1. **Cloudflare Dashboard → Security → Events**
   - Identify attack patterns
   - Create temporary firewall rules

2. **GCP Console → Cloud Armor**
   - Temporarily increase rate limits
   - Add IP blocks for attack sources

3. **Scale up MIG manually:**
   ```bash
   gcloud compute instance-groups managed resize careerveda-mig \
     --size=10 --region=asia-south1
   ```

4. **Block specific IPs at application level:**
   ```bash
   curl -X POST https://careerveda.in/api/v1/admin/security/block \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"ip": "1.2.3.4", "reason": "attack", "durationMs": 3600000}'
   ```

### After an Attack

1. Review Cloudflare and GCP logs
2. Identify attack vectors
3. Update WAF rules to prevent recurrence
4. Scale MIG back down to normal size
5. Clear any IP blocks

---

## Cost Estimate

| Service | Monthly Cost |
|---|---|
| Cloudflare Free Plan | $0 |
| GCP Load Balancer | ~$18 (forwarding rule) + ~$0.01/GB |
| Cloud Armor | ~$5 (policy) + ~$0.75/million requests |
| MIG (2x e2-small) | ~$50 |
| CDN (100GB cache) | ~$8 |
| SSL Certificate | $0 (managed) |
| **Total** | **~$80/month** |

---

## Checklist

- [ ] Cloudflare account created and domain added
- [ ] Nameservers updated
- [ ] SSL set to Full (Strict)
- [ ] WAF rules enabled
- [ ] Rate limiting configured
- [ ] GCP Cloud Armor policy created
- [ ] Managed Instance Group created with autoscaling
- [ ] HTTPS Load Balancer created
- [ ] Firewall rules configured
- [ ] Cloudflare DNS pointing to LB IP
- [ ] Direct VM access blocked
- [ ] Monitoring and alerts configured
- [ ] Emergency runbook reviewed
