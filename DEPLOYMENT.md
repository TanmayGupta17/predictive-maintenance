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

## Cloud deployment (permanent public link)

A public URL requires the container to run on a host that is always on and reachable
from the internet. Two supported paths, both using the production Docker image.

### Option A — Single-image on Render (recommended: one URL, all devices)

The root [`Dockerfile`](Dockerfile) builds **one image** that serves the frontend, REST
API, and Socket.IO on a single origin (no CORS, WebSockets same-origin).

1. Push this repo to GitHub (done).
2. In Render: **New + → Blueprint**, connect the repo. Render reads [`render.yaml`](render.yaml)
   and provisions the Postgres database + one Docker web service.
3. Click **Apply**. When it finishes, Render gives you a public URL like
   `https://predictive-maintenance.onrender.com` — that single link is the whole app,
   and it works on any device.

> Free Render web services sleep after ~15 min idle (first hit then cold-starts in
> ~50s), and free Postgres expires after ~90 days — fine for a demo/submission.

### Option B — Single-image on any VPS / Docker host

On a server with a public IP (DigitalOcean, Hetzner, EC2, etc.):

```bash
git clone https://github.com/TanmayGupta17/predictive-maintenance.git
cd predictive-maintenance
echo "PUBLIC_URL=https://your-domain" > .env      # or use the server IP
docker compose -f docker-compose.prod.yml up -d --build
```

This runs Postgres + the single app container. Point your domain/`:8080` at it, and put
it behind a TLS proxy (Caddy/Traefik/nginx) for HTTPS + WebSocket upgrade headers.

### Alternative — split hosting (Vercel/Netlify frontend + Render backend)

If you specifically want the frontend on Vercel/Netlify, deploy the backend on Render
(the same Docker service serves the API; the built-in static frontend is simply unused),
then build the frontend from the `frontend/` workspace with:

| Variable | Value |
| --- | --- |
| `VITE_API_BASE_URL` | `https://<your-api>.onrender.com/api` |
| `VITE_SOCKET_URL` | `https://<your-api>.onrender.com` |

Set the backend `CORS_ORIGIN` to the frontend URL. [`frontend/vercel.json`](frontend/vercel.json)
and root [`netlify.toml`](netlify.toml) provide the SPA build config.

## Troubleshooting

- **Backend restarts / "migrate deploy" errors** — Postgres wasn't ready. The
  backend waits on the Postgres healthcheck; check `docker compose logs postgres`.
- **WebSocket won't connect** — ensure your external proxy forwards the
  `Upgrade`/`Connection` headers and that `PUBLIC_URL` matches the browser URL.
- **Dashboard empty** — confirm the simulator is enabled and healthy:
  `docker compose logs backend | grep -i simulator`.
