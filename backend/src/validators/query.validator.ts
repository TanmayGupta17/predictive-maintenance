import { AlertSeverity, DeviceStatus, DeviceType, TelemetryMetric } from '@prisma/client';
import { z } from 'zod';

const sortOrderSchema = z.enum(['asc', 'desc']).default('desc');
const enumQuery = <T extends Record<string, string>>(values: T) =>
  z.preprocess((value) => {
    if (typeof value === 'string') {
      return value.toUpperCase();
    }

    return value;
  }, z.nativeEnum(values));

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const deviceListQuerySchema = paginationQuerySchema.extend({
  status: enumQuery(DeviceStatus).optional(),
  type: enumQuery(DeviceType).optional(),
  location: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional(),
  sortBy: z.enum(['name', 'type', 'location', 'healthScore', 'status', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: sortOrderSchema,
});

export const telemetryHistoryQuerySchema = paginationQuerySchema.extend({
  metric: enumQuery(TelemetryMetric).optional(),
  start: z.coerce.date().optional(),
  end: z.coerce.date().optional(),
  sortBy: z.enum(['timestamp', 'receivedAt', 'value']).default('timestamp'),
  sortOrder: sortOrderSchema,
});

export const alertListQuerySchema = paginationQuerySchema.extend({
  deviceId: z.string().uuid().optional(),
  severity: enumQuery(AlertSeverity).optional(),
  metric: enumQuery(TelemetryMetric).optional(),
  sortBy: z.enum(['createdAt', 'resolvedAt', 'severity', 'confidenceScore']).default('createdAt'),
  sortOrder: sortOrderSchema,
});

export const deviceIdParamSchema = z.object({
  id: z.string().uuid(),
});
