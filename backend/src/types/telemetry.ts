import type { z } from 'zod';

import type { telemetryReadingSchema } from '../validators/telemetry.validator.js';

export type TelemetryMetricName = 'temperature' | 'vibration' | 'power' | 'pressure' | 'humidity';

export type TelemetryReadingInput = z.infer<typeof telemetryReadingSchema>;

export interface TelemetryReading {
  deviceId: string;
  metric: TelemetryMetricName;
  value: number;
  timestamp: Date;
}

export interface TelemetryIngestionResult {
  telemetry: unknown;
  duplicate: boolean;
  late: boolean;
  timestampWasMissing: boolean;
}
