import { deviceRepository } from '../repositories/device.repository.js';
import { telemetryRepository } from '../repositories/telemetry.repository.js';
import { telemetryAnalyzer } from '../analyzer/index.js';
import { realtimeService } from '../sockets/realtime.service.js';
import type { TelemetryIngestionResult, TelemetryReading } from '../types/telemetry.js';
import { HttpError } from '../utils/http-error.js';
import { logger } from '../utils/logger.js';
import { telemetryReadingSchema } from '../validators/telemetry.validator.js';

class TelemetryIngestionService {
  async ingest(payload: unknown): Promise<TelemetryIngestionResult> {
    const parsedPayload = telemetryReadingSchema.parse(payload);
    const timestampWasMissing = parsedPayload.timestamp === undefined;
    const reading: TelemetryReading = {
      ...parsedPayload,
      timestamp: parsedPayload.timestamp ?? new Date(),
    };

    if (timestampWasMissing) {
      logger.warn({
        message: 'Telemetry timestamp missing; using server receipt time',
        deviceId: reading.deviceId,
        metric: reading.metric,
      });
    }

    const deviceExists = await deviceRepository.exists(reading.deviceId);

    if (!deviceExists) {
      throw new HttpError(404, 'Device not found', { deviceId: reading.deviceId });
    }

    const [duplicate, latestReading] = await Promise.all([
      telemetryRepository.findDuplicate(reading),
      telemetryRepository.findLatestForDeviceMetric(reading.deviceId, reading.metric),
    ]);

    if (duplicate) {
      logger.info({
        message: 'Duplicate telemetry reading ignored',
        deviceId: reading.deviceId,
        metric: reading.metric,
        timestamp: reading.timestamp,
      });

      return {
        telemetry: duplicate,
        duplicate: true,
        late: false,
        timestampWasMissing,
      };
    }

    const late = latestReading !== null && reading.timestamp < latestReading.timestamp;

    if (late) {
      logger.warn({
        message: 'Late telemetry reading accepted',
        deviceId: reading.deviceId,
        metric: reading.metric,
        timestamp: reading.timestamp,
        latestTimestamp: latestReading.timestamp,
      });
    }

    try {
      const telemetry = await telemetryRepository.create(reading);
      realtimeService.broadcastTelemetry({
        deviceId: reading.deviceId,
        metric: reading.metric,
        value: reading.value,
        timestamp: reading.timestamp,
        telemetryId: telemetry.id,
      });

      try {
        await telemetryAnalyzer.analyze(reading);
      } catch (error) {
        logger.error({
          message: 'Telemetry analysis failed after ingestion',
          deviceId: reading.deviceId,
          metric: reading.metric,
          timestamp: reading.timestamp,
          error,
        });
      }

      logger.info({
        message: 'Telemetry reading ingested',
        deviceId: reading.deviceId,
        metric: reading.metric,
        timestamp: reading.timestamp,
        late,
      });

      return {
        telemetry,
        duplicate: false,
        late,
        timestampWasMissing,
      };
    } catch (error) {
      if (telemetryRepository.isUniqueConstraintError(error)) {
        const telemetry = await telemetryRepository.findDuplicate(reading);

        logger.info({
          message: 'Duplicate telemetry reading ignored after unique constraint conflict',
          deviceId: reading.deviceId,
          metric: reading.metric,
          timestamp: reading.timestamp,
        });

        return {
          telemetry,
          duplicate: true,
          late: false,
          timestampWasMissing,
        };
      }

      throw error;
    }
  }
}

export const telemetryIngestionService = new TelemetryIngestionService();
