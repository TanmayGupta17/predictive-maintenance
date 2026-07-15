import { TelemetryMetric } from '@prisma/client';

import type { TelemetryMetricName } from '../types/telemetry.js';

export const prismaMetricByAnalyzerMetric: Record<TelemetryMetricName, TelemetryMetric> = {
  temperature: TelemetryMetric.TEMPERATURE,
  vibration: TelemetryMetric.VIBRATION,
  power: TelemetryMetric.POWER,
  pressure: TelemetryMetric.PRESSURE,
  humidity: TelemetryMetric.HUMIDITY,
};
