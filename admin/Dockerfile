# Node 22, matching CI and the sibling images. See the note in the root
# Dockerfile — Node 20 is past end-of-life as of April 2026.
FROM node:22-bookworm-slim@sha256:6c74791e557ce11fc957704f6d4fe134a7bc8d6f5ca4403205b2966bd488f6b3 AS build

# This Dockerfile is built from the project root.  The admin package has a
# local `file:..` dependency, so npm needs the parent package manifest in the
# image while it resolves the admin lockfile.
WORKDIR /app

COPY package.json package-lock.json ./
COPY admin/package.json admin/package-lock.json ./admin/

WORKDIR /app/admin
RUN npm ci

COPY admin/index.html admin/vite.config.js ./
COPY admin/src ./src

ARG VITE_ADMIN_API_BASE_URL=""
ARG VITE_PUBLIC_SITE_URL=""
ENV VITE_ADMIN_API_BASE_URL=${VITE_ADMIN_API_BASE_URL}
ENV VITE_PUBLIC_SITE_URL=${VITE_PUBLIC_SITE_URL}

RUN npm run build

FROM nginx:1.31-alpine-slim@sha256:45b82ed5f285b90d63df07ba70430fdd8f25624b416617d9e6dc93412b2006dc AS runtime

# Same reason as the root Dockerfile: pick up Alpine's patched OS packages
# without waiting for the nginx image to be rebuilt against them.
RUN apk --no-cache upgrade

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/admin/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
