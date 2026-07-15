# Predictive Maintenance Dashboard

A production-style **industrial monitoring dashboard** for predictive maintenance — a
real-time fleet health system inspired by Grafana, Datadog, and AWS CloudWatch. Devices
stream telemetry (temperature, pressure, power, humidity, vibration); an analysis engine
detects failure patterns, raises alerts, and continuously scores each device's health.

- **Repository:** https://github.com/TanmayGupta17/predictive-maintenance
- **Run it:** one command — [`docker compose up -d --build`](#quick-start-docker) → http://localhost:8080

---

## Contents

- [Highlights](#highlights)
- [Screens & features](#screens--features)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Quick start (Docker)](#quick-start-docker)
- [Local development](#local-development)
- [Fleet health model](#fleet-health-model)
- [REST API](#rest-api)
- [Realtime events](#realtime-events)
- [Testing](#testing)
- [Deployment](#deployment)

---

## Highlights

- **Live fleet overview** — healthy / warning / critical counts, average health, active alert
  count, most-critical device, and a prediction risk distribution.
- **Analysis engine** — sliding-window feature extraction with threshold detection, trend
  detection, and spike filtering; a rule engine turns patterns into alerts.
- **Fleet health scoring** — each device scored 0–100 from metric trends and alert activity,
  with **gradual recovery** once conditions normalize.
- **Realtime everything** — telemetry, alerts, and health changes stream to the UI over
  Socket.IO; charts and cards update without refresh.
- **Zoomable time-series charts** — reusable Recharts component with tooltips, legend, brush
  zoom, and responsive resizing.
- **Built-in simulator** — a telemetry generator seeds a device fleet and streams realistic
  readings (with injected anomalies), so the dashboard is populated out of the box.
- **Tested** — 77 unit + integration tests (analysis engine, alert manager, health model,
  REST APIs, ingestion, Socket.IO, data access).
- **One-command deploy** — Dockerized Postgres + backend + nginx frontend with health checks
  and automatic Prisma migrations.

## Screens & features

**Top navigation** across three surfaces, plus a per-device detail page.

| Surface | Contents |
| --- | --- |
| **Fleet Overview** | Health cards (Healthy / Warning / Critical / Average Health / Active Alerts), Most Critical Device, Prediction Risk Distribution, Devices Table, Active Alerts, Recent Telemetry |
| **Devices** | Searchable / status-filterable inventory with status, health bar, latest metrics, and last-updated |
| **Alerts** | Active alerts and resolved alert history |
| **Device Detail** | Live metric tiles + five zoomable time-series charts (temperature, pressure, power, humidity, vibration) and an alert timeline |

The UI is dark-themed, fully responsive, and avoids unnecessary animation (live charts render
without transition churn).

## Architecture

```
                       ┌────────────────────────────────────────┐
  browser  ─────────▶  │ frontend (nginx :80 → host :8080)        │
                       │  • serves the static Vite bundle         │
                       │  • proxies /api/*       → backend:4000   │
                       │  • proxies /socket.io/* → backend:4000   │
                       └───────────────┬──────────────────────────┘
                                       │
                       ┌───────────────▼──────────────────────────┐
                       │ backend (Node :4000)                      │
                       │  • REST API + Socket.IO gateway           │
                       │  • telemetry ingestion → analysis engine  │
                       │  • alert manager + health scoring         │
                       │  • telemetry simulator (self-seeds fleet) │
                       └───────────────┬──────────────────────────┘
                                       │
                       ┌───────────────▼──────────────────────────┐
                       │ postgres 16 (Prisma, volume-backed)       │
                       └───────────────────────────────────────────┘
```

**Ingestion → insight pipeline:** `POST /api/telemetry` → persist → broadcast → sliding-window
feature extraction → rule engine → alert manager (raise / update / resolve) → device health
recalculation → realtime broadcast to subscribed clients.

## Tech stack

**Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Recharts, React Router, Axios,
socket.io-client.

**Backend:** Node 20, Express, TypeScript, Prisma ORM, PostgreSQL, Socket.IO, Zod (validation),
Helmet, CORS, Morgan.

**Testing:** Vitest, Supertest, socket.io-client, vitest-mock-extended.

**Tooling / deploy:** Docker & Docker Compose, nginx, ESLint, Prettier.

## Project structure

```text
predictive-maintenance/
├── backend/
│   ├── prisma/                # schema + migrations
│   └── src/
│       ├── analyzer/          # sliding window, analytics, rules, alert manager, health scoring
│       ├── controllers/ routes/ services/ repositories/
│       ├── simulator/         # telemetry generator + publisher
│       ├── sockets/           # realtime gateway + broadcast service
│       ├── middleware/ validators/ utils/ config/
│       └── server.ts
│   └── tests/                 # unit + integration suites
├── frontend/
│   └── src/
│       ├── pages/             # Dashboard, Devices, Alerts, Device Detail
│       ├── components/        # cards, tables, charts, panels
│       ├── context/ hooks/    # realtime (Socket.IO) plumbing
│       └── api/ types/ utils/
├── docker-compose.yml
├── DEPLOYMENT.md
└── README.md
```

## Quick start (Docker)

Requires Docker Engine 24+ and Docker Compose v2.

```bash
git clone https://github.com/TanmayGupta17/predictive-maintenance.git
cd predictive-maintenance
cp .env.example .env          # optional — defaults work locally
docker compose up -d --build
```

Open **http://localhost:8080**. Postgres migrates automatically, the simulator seeds a fleet,
and the dashboard populates within a few seconds. Manage with:

```bash
docker compose logs -f        # tail logs
docker compose down           # stop (keep data)
docker compose down -v        # stop and wipe the database
```

## Local development

Run the backend and frontend workspaces directly (needs Node 20+ and a local PostgreSQL).

```bash
# backend
cd backend
cp .env.example .env          # set DATABASE_URL to your Postgres
npm install
npm run prisma:migrate        # apply schema
npm run dev                   # http://localhost:4000

# frontend (second terminal)
cd frontend
cp .env.example .env          # VITE_API_BASE_URL / VITE_SOCKET_URL
npm install
npm run dev                   # http://localhost:5173
```

### Key environment variables

| Scope | Variable | Purpose |
| --- | --- | --- |
| backend | `DATABASE_URL` | PostgreSQL connection string |
| backend | `CORS_ORIGIN` | Allowed browser origin (Socket.IO handshake) |
| backend | `SIMULATOR_ENABLED` | Toggle the telemetry simulator |
| backend | `SIMULATOR_INTERVAL_MS` / `SIMULATOR_ANOMALY_PROBABILITY` | Simulator cadence and anomaly rate |
| frontend | `VITE_API_BASE_URL` | REST base URL (`/api` behind the proxy) |
| frontend | `VITE_SOCKET_URL` | Socket.IO URL (`/` = same origin) |

## Fleet health model

Every device carries a health score in **0–100**. A *target* score is computed each cycle by
subtracting weighted penalties from a baseline of 100:

| Signal | How it lowers health |
| --- | --- |
| **Temperature trend** | level within the warning→critical band + sustained upward slope |
| **Vibration trend** | level + rising slope (early bearing-wear signature) |
| **Pressure abnormalities** | low pressure + downward leak trend + spike instability |
| **Repeated alerts** | severity-weighted active alerts + repeat frequency in a rolling window |
| **Recent failures** | critical alerts raised in the rolling window (ages out over time) |

The stored score then **eases toward the target**: it recovers gradually once metrics normalize
but degrades faster when conditions worsen, so a developing fault shows promptly while recovery
is smooth. Devices are bucketed into **LOW / MODERATE / HIGH / CRITICAL** risk bands to build the
fleet's prediction risk distribution.

## REST API

Base path: `/api`

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/health` | Liveness probe |
| `POST` | `/telemetry` | Ingest a telemetry reading (used by the simulator / devices) |
| `GET` | `/devices` | Paginated fleet summary (filters: `status`, `type`, `location`, `search`; sorting) |
| `GET` | `/devices/:id` | Device with its latest metric per channel |
| `GET` | `/devices/:id/history` | Paginated telemetry history (filter by `metric`, time range) |
| `GET` | `/alerts` | Active alerts (open / acknowledged) |
| `GET` | `/alerts/history` | Resolved alert history |
| `GET` | `/dashboard` | Fleet overview: health counts, average health, **active alert count**, **most critical device**, **risk distribution**, recent failures, top risky devices |

Validation errors return `400` with details; unknown resources return `404`.

## Realtime events

Socket.IO server emits:

| Event | Payload |
| --- | --- |
| `telemetry:updated` | new reading `{ deviceId, metric, value, timestamp }` |
| `alerts:changed` | `{ action: created \| updated \| resolved, deviceId, alert }` |
| `device:healthChanged` | `{ deviceId, healthScore, status, updatedAt }` |
| `dashboard:changed` | `{ reason, deviceId? }` |
| `simulator:anomaly` | injected-anomaly notice |

Clients emit `device:subscribe` / `device:unsubscribe` to join a per-device stream.

## Testing

```bash
cd backend
npm test                      # vitest run
```

**77 tests across 10 files** (1 real-database suite is skipped unless `TEST_DATABASE_URL` is set):

- **Unit** — analytics (threshold / trend / spike filtering), sliding window (EMA smoothing),
  analysis-engine rules, rule-engine dispatch, alert manager, health-scoring model.
- **Integration** — REST APIs (Supertest over the real Express app, Prisma mocked), telemetry
  ingestion pipeline, Socket.IO round-trip (real server + client), and data-access query shape;
  plus an env-gated real-Postgres CRUD suite for CI.

## Deployment

Self-hosted via Docker Compose — see **[DEPLOYMENT.md](DEPLOYMENT.md)** for configuration,
migrations, health checks, running behind a domain/TLS, and troubleshooting.
