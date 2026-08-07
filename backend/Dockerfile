# Node 22, matching CI and the sibling images. See the note in the root
# Dockerfile — Node 20 is past end-of-life as of April 2026. Both stages must
# stay on the same major: native modules are compiled against this one in the
# dependencies stage and loaded by the other.
FROM node:25-bookworm-slim@sha256:81db02c4b671288a03915da9534dbd54f96d0e7c24d80ccc54f5b36b2e684370 AS dependencies

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
  && npm cache clean --force

# Distroless: the Node runtime and its libc, and nothing else. No apt, no shell,
# no perl, no coreutils. Those packages are what a container scanner spends most
# of its findings on, and none of them were ever reachable from an Express API —
# they came with the base image, not with the code.
#
# debian12 on both sides is load-bearing, not cosmetic. argon2 is a native module
# compiled against this glibc in the dependencies stage above; a runtime on a
# different libc (alpine/musl) or a different Debian major loads it and fails at
# require() time, in production, on the first login.
#
# :nonroot resolves to uid 65532 and is already the image's USER, so the
# groupadd/useradd this stage used to run are gone rather than replaced.
#
# There is deliberately no `apk upgrade` equivalent here, unlike the two nginx
# images: distroless has no package manager to run one with. The single lever
# for an OS CVE in this image (libssl3 is one of the ~7 Debian packages it
# carries) is the `--pull` in cloudbuild.yaml and quality.yml, which re-resolves
# :nonroot. Google rebuilds it against Debian security within days, so the fix
# arrives by rebuilding — never by editing anything below.
FROM gcr.io/distroless/nodejs22-debian12:nonroot@sha256:13593b7570658e8477de39e2f4a1dd25db2f836d68a0ba771251572d23bb4f8e AS runtime

ENV NODE_ENV=production
ENV PORT=8080

WORKDIR /app

COPY --from=dependencies --chown=nonroot:nonroot /app/node_modules ./node_modules
COPY --chown=nonroot:nonroot package.json package-lock.json ./
COPY --chown=nonroot:nonroot src ./src

EXPOSE 8080

# This HEALTHCHECK is for `docker run` and compose.yaml. Cloud Run ignores the
# Dockerfile instruction entirely — it runs its own startup and liveness probes,
# and by default those are a TCP connect to $PORT, which passes as soon as nginx
# or node binds the socket rather than when /health actually answers.
#
# That default is adequate here (the process binds only after the app is wired
# up), so this is a note, not a defect. To make Cloud Run probe the endpoint
# below rather than the socket, add an explicit probe at deploy time:
#
#   gcloud run deploy ... \
#     --startup-probe=httpGet.path=/health,periodSeconds=5,failureThreshold=6
#
# It is left out of cloudbuild.yaml on purpose: the flag's exact spelling varies
# between gcloud releases, and an untested flag in the one command that ships the
# site is a worse failure than the probe it would add.
#
# Exec form with an absolute path, because distroless has no shell. The usual
# `HEALTHCHECK CMD ...` string form is run through /bin/sh, which does not exist
# in this image — it would report unhealthy forever rather than error visibly.
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD ["/nodejs/bin/node", "-e", "fetch('http://127.0.0.1:8080/health').then((response) => {if (!response.ok) process.exit(1)}).catch(() => process.exit(1))"]

# The image's ENTRYPOINT is already /nodejs/bin/node, so this is its argument
# list, not a command. `["node", "src/server.js"]` here would run `node node
# src/server.js` and exit non-zero.
CMD ["src/server.js"]
