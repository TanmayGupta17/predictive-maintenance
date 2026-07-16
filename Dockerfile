# Single production image: one container serves the frontend, REST API, and
# Socket.IO on one port/origin (no CORS, works on any device from one URL).
# Build context is the repo root.

# ---- Frontend build ----
FROM node:20-slim AS frontend
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# Same-origin: the API and socket are served by this app, so relative paths.
ENV VITE_API_BASE_URL=/api
ENV VITE_SOCKET_URL=/
RUN npm run build

# ---- Backend build ----
FROM node:20-slim AS backend
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
COPY backend/prisma ./prisma
RUN npm ci
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build

# ---- Runtime ----
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl wget \
  && rm -rf /var/lib/apt/lists/*

COPY backend/package.json backend/package-lock.json ./
COPY --from=backend /app/node_modules ./node_modules
COPY --from=backend /app/dist ./dist
COPY --from=backend /app/prisma ./prisma
# The built frontend is served from /app/public by the backend (see src/app.ts).
COPY --from=frontend /web/dist ./public
COPY backend/docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD wget -qO- http://localhost:4000/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
