# ---- Build stage: produce the static Vite bundle ----
FROM node:20-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite inlines VITE_* variables at build time. Defaults assume the app is served
# same-origin behind the bundled nginx, which proxies /api and /socket.io to the
# backend (so no CORS and no hard-coded backend host).
ARG VITE_API_BASE_URL=/api
ARG VITE_SOCKET_URL=/
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
RUN npm run build

# ---- Runtime stage: serve the bundle with nginx ----
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# Use 127.0.0.1 (not localhost): nginx listens on IPv4 only, and localhost may
# resolve to IPv6 ::1 inside the container.
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
