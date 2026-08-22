# Node 22. Node 20 left its maintenance window in April 2026, so it no longer
# receives security patches.
#
# This no longer matches CI: the Jenkins pipeline takes node from the build
# machine's PATH rather than pinning one, so the suite that gates a push may run
# on a different major than this image. Either pin a NodeJS tool in Jenkins to
# 22, or move this FROM to whatever the build machine runs — but the two should
# agree, because an image built on a major CI never verified is a build nobody
# has actually tested.
FROM node:22-bookworm-slim@sha256:6c74791e557ce11fc957704f6d4fe134a7bc8d6f5ca4403205b2966bd488f6b3 AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# `npm run build` now carries a prebuild and a postbuild: the sitemap and
# llms.txt are generated before Vite runs, and prerender.mjs + snapshot.mjs run
# after it. snapshot.mjs loads every route in a real browser and writes the
# rendered markup into dist/, and it is deliberately written to warn and exit 0
# when no browser is present — so without this line the image still builds, and
# every page it serves ships `<div id="root"></div>` as its entire body. That is
# precisely what the non-JS crawlers read (GPTBot, ClaudeBot, PerplexityBot,
# Bingbot), which is the reason the script exists at all.
#
# The cost lands in this stage only. The runtime stage below is nginx and copies
# nothing but dist/, so chromium never reaches the deployed image.
RUN npx playwright install --with-deps chromium

COPY index.html vite.config.js ./
COPY public ./public
COPY scripts ./scripts
COPY src ./src

ARG VITE_PUBLIC_API_BASE_URL=""
ENV VITE_PUBLIC_API_BASE_URL=${VITE_PUBLIC_API_BASE_URL}

RUN npm run build

FROM nginx:1.31-alpine-slim@sha256:45b82ed5f285b90d63df07ba70430fdd8f25624b416617d9e6dc93412b2006dc AS runtime

# Alpine publishes OS security fixes days-to-weeks before the nginx image is
# rebuilt against them, and that gap is where container scanners find their
# libcrypto3/libssl3 findings — CVE-2026-31789 (heap overflow printing >1GB
# X.509 certificates on 32-bit) was the most recent. `--pull` in cloudbuild.yaml
# and quality.yml only gets the newest *published* base; this gets the newest
# published *packages*, which is a strictly earlier moment.
#
# This may also move nginx itself to the newest patch in its own apk repo. That
# is the point of a security rebuild, but it does mean the 1.31 in the tag above
# is a floor, not an exact version.
RUN apk --no-cache upgrade

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
