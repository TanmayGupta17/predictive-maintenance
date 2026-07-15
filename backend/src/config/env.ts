import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }

  return value;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url(),
  CORS_ORIGIN: z.string().url().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  SIMULATOR_ENABLED: booleanFromEnv.default(true),
  SIMULATOR_INTERVAL_MS: z.coerce.number().int().positive().default(1000),
  SIMULATOR_ANOMALY_PROBABILITY: z.coerce.number().min(0).max(1).default(0.08),
  SIMULATOR_INGESTION_URL: z.string().url().default('http://localhost:4000/api/telemetry'),
});

export const env = envSchema.parse(process.env);
