# syntax=docker/dockerfile:1

# =============================================================================
# Frontend de Cuentas (React + Vite + PWA) servido por nginx.
#
# Etapas:
#   build    compila la PWA (dist/ con service worker y precache)
#   runtime  nginx: SPA, cache de assets y proxy /api -> API_BACKEND
#
# Variables en runtime:
#   API_BACKEND   destino del proxy (default http://api:3000)
#   SERVER_NAME   server_name de nginx (default _)
#
# El navegador solo habla con este contenedor (mismo origen): la cookie del
# refresh viaja con SameSite=Strict sin necesidad de CORS.
# =============================================================================

# ---------- Compilacion ------------------------------------------------------
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---------- Runtime ----------------------------------------------------------
FROM nginx:1.27-alpine AS runtime
ENV API_BACKEND=http://api:3000 \
    SERVER_NAME=_
# El entrypoint oficial aplica envsubst a /etc/nginx/templates/*.template.
COPY deploy/nginx.docker.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
