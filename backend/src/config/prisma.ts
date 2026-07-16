import { PrismaClient } from '@prisma/client';

import { env } from './env.js';

// Append conservative connection-pool settings so bursts of writes (the telemetry
// simulator) don't exhaust the pool on small / free-tier databases — requests wait
// briefly for a connection instead of failing with a 500.
function withPoolSettings(url: string) {
  const params = 'connection_limit=10&pool_timeout=20';
  return url.includes('?') ? `${url}&${params}` : `${url}?${params}`;
}

export const prisma = new PrismaClient({
  datasources: {
    db: { url: withPoolSettings(env.DATABASE_URL) },
  },
});
