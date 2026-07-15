// Runs before any test module is imported. The env module validates and freezes
// configuration at import time, so required variables must exist first. A real
// Postgres is only used by the env-gated database e2e suite (TEST_DATABASE_URL);
// everything else mocks the Prisma client.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://test:test@localhost:5432/predictive_maintenance_test';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
process.env.SIMULATOR_ENABLED = 'false';
process.env.LOG_LEVEL = 'error';
