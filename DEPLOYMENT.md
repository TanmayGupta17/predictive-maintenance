# Deployment

Self-hosted deployment with Docker Compose. One command builds and runs the full
stack: PostgreSQL, the backend (Express + Prisma + Socket.IO + telemetry
simulator), and the frontend (Vite build served by nginx).

## Architecture

```
                       ┌────────────────────────────────────────┐
  browser  ─────────▶  │ frontend (nginx :80 → host :8080)        │
  http://localhost:8080│  • serves the static Vite bundle         │
                       │  • proxies /api/*       → backend:4000   │
                       │  • proxies /socket.io/* → backend:4000   │
                       └───────────────┬──────────────────────────┘
                                       │
                       ┌───────────────▼──────────────────────────┐
                       │ backend (Node :4000)                      │
                       │  • runs `prisma migrate deploy` on start  │
                       │  • REST API + Socket.IO                   │
                       │  • telemetry simulator (self-seeds fleet) │
                       └───────────────┬──────────────────────────┘
                                       │
                       ┌───────────────▼──────────────────────────┐
                       │ postgres:16 (volume: pgdata)              │
                       └───────────────────────────────────────────┘
```

Because the frontend proxies the API and WebSocket on the same origin, there is
no cross-origin traffic from the browser and no backend host to hard-code.

## Prerequisites

- Docker Engine 24+ and Docker Compose v2 (`docker compose version`).

## Quick start

```bash
cd predictive-maintenance
cp .env.example .env        # optional — defaults work for local use
docker compose up -d --build
```

Then open <http://localhost:8080>. The simulator begins streaming telemetry for
a seeded fleet within a few seconds, so the dashboard populates on its own.

Check status and logs:

```bash
docker compose ps
docker compose logs -f backend
```

Tear down (keep data) / wipe everything:

```bash
docker compose down           # stop containers, keep the pgdata volume
docker compose down -v        # also delete the database volume
```

## Configuration

All variables have defaults in `docker-compose.yml`; override them in `.env`.

| Variable            | Default                     | Purpose                                                        |
| ------------------- | --------------------------- | -------------------------------------------------------------- |
| `POSTGRES_USER`     | `postgres`                  | Database user.                                                 |
| `POSTGRES_PASSWORD` | `postgres`                  | Database password. **Change for anything internet-facing.**    |
| `POSTGRES_DB`       | `predictive_maintenance`    | Database name.                                                |
| `PUBLIC_PORT`       | `8080`                      | Host port the frontend is published on.                        |
| `PUBLIC_URL`        | `http://localhost:8080`     | Public URL users load; must match for the Socket.IO handshake. |

The backend `DATABASE_URL` is assembled from the `POSTGRES_*` values and points
at the `postgres` service on the compose network.

## Migrations & data

- On startup the backend runs `prisma migrate deploy`, applying
  `backend/prisma/migrations` to the database (idempotent).
- The telemetry simulator upserts its device fleet on boot, so there is no
  separate seed step. Set `SIMULATOR_ENABLED=false` on the backend service to
  ingest only real telemetry via `POST /api/telemetry`.

To create a new migration after changing `prisma/schema.prisma` (locally, with a
dev database):

```bash
cd backend && npx prisma migrate dev --name <change>
```

Commit the generated folder under `backend/prisma/migrations`; it ships in the
image and is applied on the next deploy.

## Deploying to a server / domain

1. Point DNS at the host and set `PUBLIC_URL=https://your-domain` in `.env`.
2. Run the stack; publish behind a TLS terminator (Caddy, Traefik, or an nginx
   reverse proxy with Let's Encrypt) that forwards `:443 → frontend:80` and
   preserves the `Upgrade`/`Connection` headers for WebSockets.
3. Use a strong `POSTGRES_PASSWORD` and restrict the Postgres port (it is not
   published to the host by default — only reachable on the compose network).

## Health & verification

- Backend liveness: `GET /api/health` → `{"status":"ok"}` (also the container
  healthcheck). Through the proxy: `curl http://localhost:8080/api/health`.
- Fleet data: `curl http://localhost:8080/api/dashboard`.
- Frontend: `curl -I http://localhost:8080/` → `200`.

## Troubleshooting

- **Backend restarts / "migrate deploy" errors** — Postgres wasn't ready. The
  backend waits on the Postgres healthcheck; check `docker compose logs postgres`.
- **WebSocket won't connect** — ensure your external proxy forwards the
  `Upgrade`/`Connection` headers and that `PUBLIC_URL` matches the browser URL.
- **Dashboard empty** — confirm the simulator is enabled and healthy:
  `docker compose logs backend | grep -i simulator`.
