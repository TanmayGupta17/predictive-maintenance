# Predictive Maintenance Dashboard

Production-ready monorepo scaffold for a predictive maintenance dashboard.

## Structure

```text
predictive-maintenance/
  backend/
  frontend/
```

## Getting Started

```bash
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm run dev
```

Business logic is intentionally not implemented yet. The scaffold defines the project boundaries,
configuration, and entrypoints for backend API, realtime sockets, data analysis, simulation, and
frontend dashboard surfaces.
