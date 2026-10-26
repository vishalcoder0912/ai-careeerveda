# CareerVeda Deployment — GCP Compute Engine, no Docker

One VM. nginx serves the built site and admin panel; Node runs the API under
systemd. Production is `main`, and `main` advances only through CI:

```
  git push origin dev
        │
        ▼
┌──────────────────────────── GitHub Actions ────────────────────────┐
│  CI/CD: secret scan → audit/lint/unit → e2e → build                │
│         → publish dev→main (only when every job passed)            │
└──────────────────────────────┬─────────────────────────────────────┘
                               │  tested commit reaches main
                               ▼
┌──────────────────────── Compute Engine VM ───────────────────────┐
│  deploy/deploy.sh  build site + admin → restart API → publish    │
│  (the CI deploy job triggers it immediately when CD_SSH_HOST is   │
│   set; otherwise careerveda-autodeploy.timer polls every 2 min)   │
│                                                                  │
│  nginx :80    /var/www/careerveda/site   (static, prerendered)   │
│               /api/*, /health  → 127.0.0.1:8080                  │
│  nginx :8081  /var/www/careerveda/admin  (admin panel)           │
│  node  :8080  careerveda-backend.service (user: careerveda)      │
└──────────────────────────────────────────────────────────────────┘
```

**Do not push directly to `main`.** It is the production branch and a direct
push bypasses every check above. Work on `dev` (or a feature branch), let CI
promote the tested commit, and enable GitHub branch protection for `main` with
the CI/CD checks required so the rule is enforced by GitHub as well.

A deploy never breaks what is live: the site and admin panel are built first,
the API is restarted and must answer `/health`, and only then are the new files
copied into `/var/www`. If any step fails, the previous release keeps serving
and the next poll retries.

---

## One-time setup

### 1. Create the VM and open the firewall

```bash
gcloud compute instances create careerveda \
  --zone=asia-south1-a --machine-type=e2-small \
  --image-family=ubuntu-2204-lts --image-project=ubuntu-os-cloud \
  --boot-disk-size=30GB --tags=careerveda

gcloud compute firewall-rules create careerveda-allow-web \
  --allow=tcp:80,tcp:443,tcp:8081 --source-ranges=0.0.0.0/0 --target-tags=careerveda
```

### 2. Bootstrap (once, on the VM)

```bash
gcloud compute ssh careerveda --zone=asia-south1-a
git clone https://github.com/vishalcoder0912/ai-careeerveda.git /tmp/cv
sudo MONGODB_URI="mongodb+srv://USER:PASS@cluster0.xxxx.mongodb.net/" \
     bash /tmp/cv/deploy/setup-server.sh
```

It installs Node 22, nginx, Chromium (for the SEO snapshot) and a 2 GB swap
file; creates the `careerveda` service user; writes
`/opt/careerveda/backend/.env` (JWT secrets generated) and
`/etc/careerveda/build.env`; installs the systemd units and nginx config; and
runs the first deploy.

### 3. Create the first admin

```bash
cd /opt/careerveda/backend && sudo -u careerveda node scripts/seed-admin.js
```

The site is now at `http://<VM_IP>/`, the admin panel at `http://<VM_IP>:8081/`.

---

## Configuration — two files, both on the VM, neither in git

| File | What | After editing |
| --- | --- | --- |
| `/opt/careerveda/backend/.env` | API secrets and runtime settings (Mongo, JWT, cookies, Turnstile secret, SMTP, ImageKit). Template: `backend/.env.example` | `sudo systemctl restart careerveda-backend` |
| `/etc/careerveda/build.env` | Public build-time values baked into the bundles (API URL, Turnstile site key). Template: `deploy/build.env.example` | `sudo FORCE=1 bash /opt/careerveda/deploy/deploy.sh` |

`TURNSTILE_SECRET_KEY` (backend) and `VITE_TURNSTILE_SITE_KEY` (build) go
together. A secret without the site key rejects every form submission.

---

## Production cutover (before real traffic)

1. **DNS**: `A` records for `careerveda.in`, `www.careerveda.in` and
   `admin.careerveda.in` → the VM's static IP
   (`gcloud compute addresses create careerveda-ip --region=asia-south1`, then
   attach it to the VM).
2. **Admin on its own hostname**: in `/etc/nginx/sites-available/careerveda`
   change the admin server's `listen 8081` lines to `listen 80;` /
   `listen [::]:80;` and `server_name _;` to `server_name admin.careerveda.in;`.
   Set the site server's `server_name` to `careerveda.in`.
3. **www → apex**: install `deploy/nginx-www-redirect.conf` (instructions inside).
4. **HTTPS**:
   `sudo apt install -y certbot python3-certbot-nginx && sudo certbot --nginx -d careerveda.in -d www.careerveda.in -d admin.careerveda.in`
5. **`/etc/careerveda/build.env`**:
   `VITE_PUBLIC_API_BASE_URL=https://careerveda.in/api/v1`,
   `VITE_ADMIN_API_BASE_URL=https://careerveda.in/api/v1`,
   `VITE_PUBLIC_SITE_URL=https://careerveda.in`, and `VITE_TURNSTILE_SITE_KEY`.
6. **`backend/.env`**: `FRONTEND_URL=https://careerveda.in`,
   `ADMIN_URL=https://admin.careerveda.in`, `COOKIE_SECURE=true`,
   `TURNSTILE_SECRET_KEY=…`, `TRUST_PROXY=1` (nginx is the one hop, and stays 1 with
   Cloudflare in front too: the shipped nginx config already unwraps
   `CF-Connecting-IP` and overwrites `X-Forwarded-For`). The API refuses to boot on an unsafe
   combination, so a mistake shows up immediately.
7. Rebuild and restart: `sudo FORCE=1 bash /opt/careerveda/deploy/deploy.sh`.
8. Close port 8081: `gcloud compute firewall-rules update careerveda-allow-web --allow=tcp:80,tcp:443`.

---

## Day-to-day

```bash
journalctl -t careerveda-deploy -n 50            # what the last deploys did
journalctl -u careerveda-backend -f              # API logs, live
systemctl list-timers careerveda-*               # next poll
sudo FORCE=1 bash /opt/careerveda/deploy/deploy.sh   # rebuild + restart now
cat /var/lib/careerveda/deployed-sha             # commit that is live
```

**Rollback**: `git revert <bad-sha>` on `dev`, then `git push origin dev`. CI
promotes the revert to `main` and the VM deploys it within 2 minutes (or
immediately when the CI deploy job is configured). The VM always deploys
whatever `main` is, so the fix goes through git, never through edits on the
server.

**Instant deploys (optional)**: add repository variable `CD_SSH_HOST` (VM IP),
optional `CD_SSH_USER`, and secret `CD_SSH_KEY`. The CI/CD `deploy` job then
SSHes in right after `publish`; without them it is skipped and the 2-minute
timer does the work. The separate `CD (Compute Engine)` workflow is manual-only
(`workflow_dispatch`) and is for forcing a rebuild of the current `main` after
changing `/etc/careerveda/build.env`.

**Backups**: MongoDB Atlas takes continuous backups of the database (check the
plan's retention). The VM holds no data of its own: everything on it is
rebuilt from git plus the two config files above, so keep a copy of those two.
