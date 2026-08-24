# CareerVeda Deployment — GCP Compute Engine (pull-based CD)

One VM, no Terraform, no container registry. The VM tracks `main` directly:
every push to `main` is live on the site within ~2 minutes, automatically.

```
  git push origin main
        │
        ▼
┌───────────────────────────── GitHub ─────────────────────────────┐
│  main branch                                                     │
└──────────────────────────┬───────────────────────────────────────┘
                           │  pulled by the VM
                           ▼
┌──────────────────────── Compute Engine VM ───────────────────────┐
│  careerveda-autodeploy.timer   polls origin/main every 2 min     │
│        └─► deploy/deploy.sh    build + restart (only on change)  │
│                                                                  │
│  nginx :80      → static frontend (/opt/careerveda/dist)         │
│                   /api/*, /health → proxy to 127.0.0.1:8080      │
│  nginx :8081    → admin panel  (/opt/careerveda/admin/dist)      │
│  node  :8080    → backend API (careerveda-backend.service)       │
└──────────────────────────────────────────────────────────────────┘
```

Optional instant deploys: the `CD (Compute Engine)` workflow SSHes into the VM
right after each push to `main` and runs the same deploy script. It stays skipped
until you add the repo variable `CD_SSH_HOST` — during testing you can ignore it;
the timer alone does everything.

---

## One-time setup

### 1. Create the VM and open the firewall

```bash
gcloud compute instances create careerveda-test \
  --zone=asia-south1-a \
  --machine-type=e2-small \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --tags=careerveda

gcloud compute firewall-rules create careerveda-allow-http \
  --allow=tcp:80,tcp:8081 --source-ranges=0.0.0.0/0 --target-tags=careerveda
```

e2-small (2 GB) is enough for testing; builds are capped at ~1.5 GB heap.

### 2. Bootstrap the server (run once, ON the VM)

```bash
gcloud compute ssh careerveda-test --zone=asia-south1-a

sudo REPO_URL=https://github.com/vishalcoder0912/ai-careeerveda.git \
     MONGODB_URI="mongodb+srv://user:pass@cluster0....mongodb.net/?retryWrites=true&w=majority" \
     bash <(curl -fsSL https://raw.githubusercontent.com/vishalcoder0912/ai-careeerveda/main/deploy/setup-server.sh)
```

Or from a local checkout: copy the repo to the VM (`gcloud compute scp`) and run
`sudo bash deploy/setup-server.sh`.

The script installs Node 22 + nginx + git, clones the repo to `/opt/careerveda`,
writes `backend/.env` (JWT secrets are generated for you), enables two systemd
units, and runs the first deploy. When it prints "Setup complete", open:

- Site: `http://<VM_EXTERNAL_IP>/`
- Admin panel: `http://<VM_EXTERNAL_IP>:8081/`
- API health: `http://<VM_EXTERNAL_IP>/health`

### 3. That's it

From now on: **push to `main` → live within ~2 minutes.** No secrets in GitHub,
no images, no manual steps.

To make deploys instant instead of ≤2 min, add under *Settings → Secrets and
variables → Actions*:

| Where     | Name          | Value                                              |
| --------- | ------------- | -------------------------------------------------- |
| Variable  | `CD_SSH_HOST` | VM external IP                                     |
| Variable  | `CD_SSH_USER` | SSH user (default `deploy`)                        |
| Secret    | `CD_SSH_KEY`  | private key matching that user's authorized_keys   |

---

## Day-to-day operations

All commands run on the VM:

```bash
journalctl -u careerveda-backend -f           # API logs (live)
journalctl -u careerveda-autodeploy -n 50     # what the last deploy did
systemctl list-timers careerveda-*            # when the next pull happens
sudo FORCE=1 /opt/careerveda/deploy/deploy.sh # rebuild + restart right now
```

Change a secret or env var: edit `/opt/careerveda/backend/.env`, then
`sudo systemctl restart careerveda-backend`. The file is not tracked by git, so
deploys never touch it.

Rollback: `git -C /opt/careerveda reset --hard <good-sha>` then
`sudo systemctl restart careerveda-backend && sudo systemctl reload nginx`
(the next autodeploy poll will re-deploy `main`; revert the commit to stay there).

## Notes for production cutover

- Put a domain + TLS on the front (certbot `--nginx`) and flip
  `COOKIE_SECURE=true` / set `COOKIE_DOMAIN` in `backend/.env`.
- `deploy/nginx-www-redirect.conf` has a ready www→apex block for that day.
- The admin panel currently rides port 8081; move it behind the same domain with
  a second `server_name` before exposing it publicly.
