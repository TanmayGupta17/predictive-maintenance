# ---- Build stage: install deps, generate Prisma client, compile TypeScript ----
FROM node:20-slim AS build
WORKDIR /app

# Prisma needs the schema present when @prisma/client runs its postinstall
# generate, so copy manifests + schema before installing.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Runtime stage: slim image with compiled output + generated client ----
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# openssl is required by the Prisma query engine; wget backs the healthcheck.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl wget \
  && rm -rf /var/lib/apt/lists/*

# node_modules is copied from the build stage so the generated Prisma client and
# the Prisma CLI (used by the entrypoint to run migrations) are available.
COPY package.json package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -qO- http://localhost:4000/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
