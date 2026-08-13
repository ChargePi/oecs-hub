# syntax=docker/dockerfile:1

FROM node:24-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM nginx:1.27-alpine AS runtime

# Official nginx image runs as root by default. Move everything nginx touches at runtime
# (cache dir, pidfile, the rendered config output dir, the served files) to a dedicated
# non-root user instead.
RUN addgroup -S app && adduser -S app -G app \
    && chown -R app:app /usr/share/nginx/html /var/cache/nginx /etc/nginx/conf.d \
    && touch /var/run/nginx.pid \
    && chown app:app /var/run/nginx.pid

ENV BACKEND_URL=http://localhost:9999
# Docker's embedded DNS — override at runtime (-e RESOLVER=...) for other environments, e.g. a
# Kubernetes cluster DNS Service IP.
ENV RESOLVER=127.0.0.11
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build --chown=app:app /app/dist /usr/share/nginx/html

USER app
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
