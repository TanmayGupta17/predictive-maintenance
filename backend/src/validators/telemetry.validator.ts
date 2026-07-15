import { z } from 'zod';

export const telemetryMetricSchema = z.enum([
  'temperature',
  'vibration',
  'power',
  'pressure',
  'humidity',
]);

const timestampSchema = z.coerce
  .date()
  .refine((timestamp) => !Number.isNaN(timestamp.getTime()), 'timestamp must be a valid date');

export const telemetryReadingSchema = z
  .object({
    deviceId: z.string().uuid(),
    metric: telemetryMetricSchema,
    value: z.number().finite(),
    timestamp: timestampSchema.optional(),
  })
  .strict();
