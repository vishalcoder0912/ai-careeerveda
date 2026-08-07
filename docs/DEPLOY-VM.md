# Deploying CareerVeda to a Compute Engine VM

One Ubuntu VM. nginx serves the two static builds and proxies the API, PM2 keeps
the backend running, certbot handles TLS. MongoDB stays on Atlas.

```
Internet
   ↓
 nginx
   ├── <SITE_HOST>   → /var/www/careerveda        (Vite build, prerendered)
   ├── <ADMIN_HOST>  → /var/www/careerveda-admin  (Vite build)
   └── <API_HOST>    → 127.0.0.1:8080             (PM2 → src/server.js)
```

Everything below runs **on the VM** unless it says otherwise.

---

## Two phases: preview, then production

`careerveda.in` is currently served by Vercel. Deploy to the preview hostnames
first, prove the whole stack works there, and only then repoint the live domain.
Every step below is written against three variables, so the same procedure runs
in both phases:

| | **Phase 1 — preview** | **Phase 2 — production** |
|---|---|---|
| `SITE_HOST` | `frontend.preview.careerveda.in` | `careerveda.in` |
| `ADMIN_HOST` | `admin.preview.careerveda.in` | `admin.careerveda.in` |
| `API_HOST` | `backend.preview.careerveda.in` | `api.careerveda.in` |
| Cookie domain | `.preview.careerveda.in` | `.careerveda.in` |

The preview phase touches nothing the public uses: those three names resolve
nowhere today, so a mistake is invisible. Phase 2 is then a DNS change plus a
rebuild, with Vercel still there to roll back to.

Export them on the VM so the commands below can be pasted as written:

```bash
export SITE_HOST=frontend.preview.careerveda.in
export ADMIN_HOST=admin.preview.careerveda.in
export API_HOST=backend.preview.careerveda.in
export COOKIE_DOMAIN_VALUE=.preview.careerveda.in
```

---

## Before you start — three things that bite later

**1. Give the VM a static IP.** The console attaches an *ephemeral* one by
default. Your DNS records and the Atlas allowlist will name that address, and it
is released the moment the VM stops — the site comes back on a different IP, DNS
points nowhere, and Atlas refuses the connection.

Reserve the address the VM already has, rather than allocating a new one. This
promotes the existing ephemeral IP in place: same address, no downtime, nothing
to re-point afterwards. From your laptop:

```bash
# The IP the VM is currently using
gcloud compute instances list

gcloud compute addresses create careerveda-ip \
  --addresses=<THAT_IP> --region=us-central1

# Confirm it is now reserved and IN_USE
gcloud compute addresses list
```

Detaching and reattaching an access config also works, but hands the VM a
*different* address — which means redoing DNS and Atlas for no reason.

**2. Create the preview DNS records — A records, not Forwarding.**

In GoDaddy, **Forwarding** and **DNS Records** are two different things.
Forwarding issues an HTTP 301 from GoDaddy's own servers and plants its own
records to do it, which override any A record on the same name. A subdomain
forwarded to itself is a redirect loop that never reaches your VM.

So first **delete** any Forwarding entries for `frontend.preview`,
`admin.preview` and `backend.preview` under Domain Settings → Forwarding →
Subdomains. Then under **DNS Records → Add**, create three:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `frontend.preview` | `<STATIC_IP>` | 600 |
| A | `admin.preview` | `<STATIC_IP>` | 600 |
| A | `backend.preview` | `<STATIC_IP>` | 600 |

GoDaddy appends the domain, so `frontend.preview` becomes
`frontend.preview.careerveda.in`. Leave the existing `@`, `www` and `admin`
records pointing at Vercel — those are the live site and are not touched until
Phase 2.

Confirm before going further (from your laptop):

```bash
nslookup frontend.preview.careerveda.in
nslookup admin.preview.careerveda.in
nslookup backend.preview.careerveda.in
```

All three must return the VM IP. Certbot cannot issue a certificate for a name
that does not resolve here, so this has to be true before Step 14.

**3. Allowlist the IP in Atlas** → Network Access → `<STATIC_IP>/32`. Without
it the API starts fine and every database call fails. Do not use `0.0.0.0/0` —
that opens the cluster to the whole internet to save one step.

---

## Step 1 — Update

```bash
sudo apt update && sudo apt upgrade -y
```

## Step 2 — Packages

```bash
sudo apt install -y git curl wget build-essential nginx certbot \
  python3-certbot-nginx software-properties-common unzip
```

`build-essential` is not optional: `argon2` is a native module and npm compiles
it from source whenever no prebuilt binary matches your Node version.

## Step 3 — Node 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v && npm -v
```

Ubuntu ships Node 18, which is past end of life. 22 matches CI and the
`engines` field.

## Step 4 — Swap

An e2-medium has 4 GB and 2 *shared* vCPUs. The Vite build bundles three.js,
framer-motion and GSAP, and then a prerender pass runs on top of it. Without
swap the build gets OOM-killed halfway, which looks like npm hanging.

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

## Step 5 — PM2

```bash
sudo npm install -g pm2
pm2 install pm2-logrotate
```

`pm2-logrotate` stops the API log filling a 30 GB disk over a few months.

## Step 6 — Clone the repo

The repo is private, so this needs credentials. Generate a key on the VM and add
the public half to GitHub → repo → Settings → Deploy keys (read-only):

```bash
ssh-keygen -t ed25519 -C "careerveda-vm" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

Then:

```bash
cd ~
git clone git@github.com:vishalcoder0912/full-stack-careerveda.git
cd full-stack-careerveda
```

## Step 7 — Install dependencies

```bash
npm ci
npm ci --prefix backend
npm ci --prefix admin
```

`npm ci`, not `npm install`. `install` is free to resolve versions that are not
in the lockfile, so the server can end up running a tree nothing was tested
against.

## Step 8 — Backend environment

Create **`backend/.env`**. Not `/etc/careerveda/backend.env` — `backend/src/config/env.js`
loads `../../.env` relative to itself through dotenv, so `backend/.env` is the
only path it reads. Anywhere else and the server exits at boot with
`Invalid environment configuration`.

Write it from the variables exported earlier, so the preview and production
phases differ only in those exports:

```bash
cat > backend/.env <<EOF
NODE_ENV=production
PORT=8080

MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=careerveda

FRONTEND_URL=https://${SITE_HOST}
ADMIN_URL=https://${ADMIN_HOST}
CORS_ALLOWED_ORIGINS=https://${SITE_HOST},https://${ADMIN_HOST}

JWT_ACCESS_SECRET=$(openssl rand -base64 48)
JWT_REFRESH_SECRET=$(openssl rand -base64 48)

COOKIE_SECURE=true
COOKIE_DOMAIN=${COOKIE_DOMAIN_VALUE}

LOG_LEVEL=info

IMAGEKIT_PUBLIC_KEY=
IMAGEKIT_PRIVATE_KEY=
IMAGEKIT_URL_ENDPOINT=
EOF

nano backend/.env    # paste the real MONGODB_URI and ImageKit keys
chmod 600 backend/.env
```

Notes on the values:

- **The two JWT secrets must be at least 32 characters** — the schema rejects
  anything shorter and the server refuses to boot. `openssl rand -base64 48`
  above generates them; keep a copy, because regenerating them invalidates every
  issued token and logs everyone out.
- **`COOKIE_SECURE=true` and `COOKIE_DOMAIN` are both load-bearing.** Without
  Secure the refresh cookie travels in clear text. Without the leading dot the
  API and admin hosts cannot share it, and every admin login appears to succeed
  and then immediately logs out.
- **`.preview.careerveda.in` rather than `.careerveda.in` for the preview
  phase.** Both work, but the narrower one keeps the preview cookie off the live
  Vercel site while both are running.
- **ImageKit keys are optional** — the media upload routes are only registered
  when all three are present, so leaving them blank disables uploads rather than
  breaking the server.

## Step 9 — Build

**This is the step most likely to go wrong silently.** Vite inlines `VITE_*`
variables into the JavaScript at *build* time. Build without them and the site
compiles fine, deploys fine, and quietly serves the static fallback data in
`src/data` instead of anything from your database — while the admin panel points
at nothing at all.

It also means **the build is tied to the hostnames**: a bundle built for the
preview hosts keeps calling the preview API forever. Phase 2 is a rebuild, not
just a DNS change.

Install Chromium first. `scripts/snapshot.mjs` renders every route in a real
browser and writes the markup into `dist/`; without it the script warns, exits 0
and you are left with head-only prerendering:

```bash
sudo npx playwright install-deps chromium
npx playwright install chromium
```

```bash
export VITE_PUBLIC_API_BASE_URL="https://${API_HOST}/api/v1"
export VITE_ADMIN_API_BASE_URL="https://${API_HOST}/api/v1"
export VITE_PUBLIC_SITE_URL="https://${SITE_HOST}"

npm run build          # public site — see the warning below
npm run build:admin
npm run build:backend  # syntax check only
```

**Use `npm run build`, not `npm run build:all`.** npm fires `prebuild` and
`postbuild` only for the script literally named `build`. Those hooks are what
generate the sitemap and `llms.txt`, and then run `prerender.mjs` and
`snapshot.mjs`. `build:all` chains `build:frontend`, which is a bare `vite build`
and skips every one of them — you get a working site with no prerendering and a
stale sitemap, and nothing reports an error.

One ordering note: the snapshot pass loads each page in a browser, and those
pages call the API. Taking snapshots before the API is reachable bakes empty
states into `dist/`. It is not fatal — the site fetches live data in the
visitor's browser regardless — but for accurate snapshots, rebuild once after
Step 14 when the API is answering over HTTPS.

Check the API URL actually made it in:

```bash
grep -rl "$API_HOST" dist/assets/ | head -1
grep -rl "$API_HOST" admin/dist/assets/ | head -1
```

Nothing printed means the variables were not set when Vite ran. Re-export and
rebuild — there is no way to patch it afterwards.

## Step 10 — Publish the static builds

```bash
sudo mkdir -p /var/www/careerveda /var/www/careerveda-admin

sudo rm -rf /var/www/careerveda/* /var/www/careerveda-admin/*
sudo cp -r dist/*       /var/www/careerveda/
sudo cp -r admin/dist/* /var/www/careerveda-admin/

sudo chown -R www-data:www-data /var/www/careerveda /var/www/careerveda-admin
```

`rm -rf` first, every time. Asset filenames are content-hashed, so a stale file
left behind is never overwritten and never requested — it just sits there.

## Step 11 — Start the API with PM2

The entry point is `backend/src/server.js` (`npm start` runs exactly that):

```bash
cd ~/full-stack-careerveda/backend
pm2 start src/server.js --name careerveda-api
pm2 logs careerveda-api --lines 50
```

Confirm it is actually serving, not just "online" in the PM2 table:

```bash
curl -fsS http://127.0.0.1:8080/health
```

If PM2 shows it restarting in a loop, the env schema rejected something —
`pm2 logs careerveda-api` prints which variable, never its value.

Persist across reboots:

```bash
pm2 save
pm2 startup
# then run the sudo command it prints
```

## Step 12 — Seed the first admin user

Otherwise there is no account to log into the admin panel with:

```bash
cd ~/full-stack-careerveda
npm --prefix backend run seed:admin
```

## Step 13 — nginx

The site config lives in the repo at `deploy/nginx-careerveda.conf`, with three
placeholders for the three hostnames:

```bash
sed -e "s/__SITE_HOST__/${SITE_HOST}/g" \
    -e "s/__ADMIN_HOST__/${ADMIN_HOST}/g" \
    -e "s/__API_HOST__/${API_HOST}/g" \
    deploy/nginx-careerveda.conf \
  | sudo tee /etc/nginx/sites-available/careerveda >/dev/null

sudo ln -sf /etc/nginx/sites-available/careerveda /etc/nginx/sites-enabled/careerveda

# The stock default site claims default_server on port 80 — it is what serves
# the "Welcome to nginx!" page today, and leaving it enabled alongside ours
# makes nginx refuse to start.
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t && sudo systemctl reload nginx
```

Now check it over plain HTTP, before certbot. TLS on a broken site is much
harder to debug:

```bash
curl -sI "http://${SITE_HOST}"  | head -1
curl -sI "http://${ADMIN_HOST}" | head -1
curl -fsS "http://${API_HOST}/health"
```

If DNS has not propagated yet you can test the VM directly by sending the
hostname yourself — this bypasses DNS entirely:

```bash
curl -sI -H "Host: ${SITE_HOST}" http://127.0.0.1 | head -1
```

## Step 14 — TLS

Only once all three names resolve to this VM:

```bash
sudo certbot --nginx -d "$SITE_HOST" -d "$ADMIN_HOST" -d "$API_HOST"
```

Certbot edits `/etc/nginx/sites-available/careerveda` in place: it adds the
`listen 443 ssl` blocks, the certificate paths and an http→https redirect. Its
systemd timer renews automatically — verify with:

```bash
sudo certbot renew --dry-run
```

**Because certbot owns that file now, re-running the `sed` in Step 13 wipes its
edits.** After changing `deploy/nginx-careerveda.conf` in the repo, re-run the
`sed`, then re-run `certbot --nginx` to put the TLS blocks back.

## Step 15 — Verify end to end

```bash
curl -I "https://${SITE_HOST}"
curl -I "https://${ADMIN_HOST}"
curl -fsS "https://${API_HOST}/health"
```

Then in a browser: log into the admin panel, change something, and confirm it
appears on the public site. That single check exercises TLS, CORS, the cookie
domain and the Atlas connection at once — the four things most likely to be
wrong.

---

## Phase 2 — cutting over to the live domain

Live values for this deployment:

| | |
|---|---|
| VM | `instance-20260803-065053`, `us-central1-a` |
| IP | `136.116.25.32` (reserved as `careerveda-ip`) |
| `SITE_HOST` | `careerveda.in` |
| `ADMIN_HOST` | `admin.careerveda.in` |
| `API_HOST` | `backend.careerveda.in` — **backend**, not `api` |
| Cookie domain | `.careerveda.in` |
| DNS | Cloudflare (moved off GoDaddy) |

Order matters. The server must be ready for the new hostnames *before* DNS
moves, and the certificate can only be issued *after* it moves. Vercel keeps
serving until the records change, so that is the rollback.

**1. Lower the TTL** on `@`, `www` and `admin` to the minimum and wait out the
old TTL. That is what makes a rollback take minutes rather than hours.

**2. Point the backend env at the new hosts** (keep the JWT secrets — changing
them logs everyone out):

```bash
cd ~/full-stack-careerveda
sed -i 's|^FRONTEND_URL=.*|FRONTEND_URL=https://careerveda.in|' backend/.env
sed -i 's|^ADMIN_URL=.*|ADMIN_URL=https://admin.careerveda.in|' backend/.env
sed -i 's|^CORS_ALLOWED_ORIGINS=.*|CORS_ALLOWED_ORIGINS=https://careerveda.in,https://www.careerveda.in,https://admin.careerveda.in|' backend/.env
```

**3. Point nginx at the new hosts, and add the www redirect** — the preview
phase had no equivalent of it:

```bash
sed -e "s/__SITE_HOST__/careerveda.in/g"     -e "s/__ADMIN_HOST__/admin.careerveda.in/g"     -e "s/__API_HOST__/backend.careerveda.in/g"     deploy/nginx-careerveda.conf | sudo tee /etc/nginx/sites-available/careerveda >/dev/null

sed "s/__DOMAIN__/careerveda.in/g" deploy/nginx-www-redirect.conf   | sudo tee /etc/nginx/sites-available/careerveda-www >/dev/null
sudo ln -sf /etc/nginx/sites-available/careerveda-www /etc/nginx/sites-enabled/

sudo nginx -t && sudo systemctl reload nginx
```

**4. Rebuild.** The API URL is compiled into the bundle; DNS alone will not
change it.

```bash
SITE_HOST=careerveda.in ADMIN_HOST=admin.careerveda.in   API_HOST=backend.careerveda.in ./scripts/redeploy.sh
```

**5. Change the DNS records** to the VM, **grey cloud / DNS only**:

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `careerveda.in` | `136.116.25.32` | DNS only |
| A | `www` | `136.116.25.32` | DNS only |
| A | `admin` | `136.116.25.32` | DNS only |
| A | `backend` | `136.116.25.32` | DNS only |

Leave every Google Workspace MX record alone, or mail to `@careerveda.in`
stops delivering.

**6. Issue the certificate** once all four resolve to the VM:

```bash
sudo certbot --nginx -d careerveda.in -d www.careerveda.in   -d admin.careerveda.in -d backend.careerveda.in   --redirect --agree-tos -m careervedatools@gmail.com --non-interactive
```

Grey cloud is required here. Behind the Cloudflare proxy the HTTP-01 challenge
is intercepted and issuance fails.

**7. Verify**, then turn the proxy on — see the Cloudflare section below.

---

## Cloudflare proxy

Only after Step 6 succeeds and the site is verified working on grey cloud.

**SSL/TLS mode must be Full (strict).** Not Flexible. Flexible makes Cloudflare
talk plain HTTP to the origin, but certbot added a 301 HTTP→HTTPS to the nginx
config, so Cloudflare is redirected to itself forever — `ERR_TOO_MANY_REDIRECTS`.
Full (strict) validates the Let's Encrypt certificate and works as-is.

**Restore the real client IP, or the rate limiter breaks.** `app.js` sets
`trust proxy: 1` — exactly one hop, correct today. Proxied, there are two, so
`req.ip` becomes a Cloudflare address and `express-rate-limit` treats every
visitor on earth as one client. The first busy hour, real users start getting
429s. Fix it in nginx so `trust proxy: 1` stays true — add to the API server
block, above `location /`:

```nginx
real_ip_header CF-Connecting-IP;
set_real_ip_from 173.245.48.0/20;
set_real_ip_from 103.21.244.0/22;
set_real_ip_from 104.16.0.0/13;
set_real_ip_from 172.64.0.0/13;
set_real_ip_from 131.0.72.0/22;
# full current list: https://www.cloudflare.com/ips/
```

**Renewal gets fragile once proxied** — certbot's HTTP-01 challenge then runs
through Cloudflare. Either switch certbot to DNS-01 with a Cloudflare API token,
or issue a Cloudflare Origin Certificate and stop using certbot for these hosts.

Rolling back at any point is putting the Vercel A records back, which only works
while that project still exists. Leave it up for a week or two.

---

## Redeploying after a code change

Re-export the three hostnames first — a fresh shell does not have them, and
building without them is the silent failure in Step 9.

```bash
cd ~/full-stack-careerveda
git pull

npm ci && npm ci --prefix backend && npm ci --prefix admin

export SITE_HOST=frontend.preview.careerveda.in   # or the production hosts
export ADMIN_HOST=admin.preview.careerveda.in
export API_HOST=backend.preview.careerveda.in

export VITE_PUBLIC_API_BASE_URL="https://${API_HOST}/api/v1"
export VITE_ADMIN_API_BASE_URL="https://${API_HOST}/api/v1"
export VITE_PUBLIC_SITE_URL="https://${SITE_HOST}"
npm run build          # not build:all — see Step 9
npm run build:admin

sudo rm -rf /var/www/careerveda/* /var/www/careerveda-admin/*
sudo cp -r dist/. /var/www/careerveda/
sudo cp -r admin/dist/. /var/www/careerveda-admin/
sudo chown -R www-data:www-data /var/www/careerveda /var/www/careerveda-admin

pm2 restart careerveda-api
sudo systemctl reload nginx
```

`backend/.env` is gitignored, so `git pull` never touches it.

---

## Later — automating this from Jenkins

CI here is Jenkins (`Jenkinsfile`), which already builds all three apps on every
green run of `dev`. It has no deploy stage, deliberately — `main` is a gate on
what is *tested*, not a trigger for what ships.

When you do automate it, **build on the Jenkins agent, not on the VM**, and rsync
the finished `dist/` folders over. Three reasons:

- The agent is a full workstation; the VM has 2 shared vCPUs and 4 GB, and during
  a build the box serving your site is the box compiling it.
- A build that fails in CI never touches production. A build that fails on the
  VM has already deleted the previous one.
- The `VITE_*` values live in the pipeline's `environment` block, so the class of
  bug in Step 9 cannot recur.

The VM side then reduces to: rsync the two `dist/` folders, `git pull` +
`npm ci --omit=dev --prefix backend`, `pm2 restart careerveda-api`. Needs a deploy
SSH key as a Jenkins credential, and the deploy stage gated on `branch 'main'` so
only commits the pipeline already promoted can ship.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| Site loads but shows no database content | `VITE_PUBLIC_API_BASE_URL` was unset at build time — Step 9 |
| Admin login succeeds then immediately logs out | `COOKIE_SECURE` / `COOKIE_DOMAIN` wrong, or `X-Forwarded-Proto` missing from nginx |
| API restarts in a loop | Invalid `backend/.env` — `pm2 logs careerveda-api` names the field |
| Every API call times out | VM IP not allowlisted in Atlas Network Access |
| Browser blocks API calls (CORS) | Origin missing from `CORS_ALLOWED_ORIGINS` |
| Prerendered route 301s to itself | `try_files` ordering changed — see the comment in the nginx config |
| `npm run build` hangs then dies | Out of memory — Step 4 swap |
| Image upload fails at ~1 MB | `client_max_body_size` missing from the api server block |
| Preview host redirects to itself in a loop | A GoDaddy **Forwarding** entry still exists for it; delete it and use an A record |
| Preview host resolves to something that is not the VM | GoDaddy forwarding plants its own records that override your A record — remove the forwarding first |
| Certbot fails with "unauthorized" or "DNS problem" | The hostname does not resolve to this VM yet. `nslookup` it, wait for TTL, retry |
| Site works on preview, breaks after cutover | Bundle still has the preview API URL baked in — rebuild, Phase 2 step 2 |
