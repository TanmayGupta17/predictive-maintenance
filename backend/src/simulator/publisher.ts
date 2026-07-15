import type { TelemetryReading } from '../types/telemetry.js';
import { logger } from '../utils/logger.js';
import type { SimulatorRuntimeConfig } from './types.js';

export async function publishReading(reading: TelemetryReading, config: SimulatorRuntimeConfig) {
  try {
    const response = await fetch(config.ingestionUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(reading),
    });

    if (!response.ok) {
      logger.warn(`Telemetry ingestion failed with status ${response.status}`);
    }
  } catch (error) {
    logger.warn(error);
  }
}
