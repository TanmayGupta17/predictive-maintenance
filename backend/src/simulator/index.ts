import { env } from '../config/env.js';
import { deviceRepository } from '../repositories/device.repository.js';
import { realtimeService } from '../sockets/realtime.service.js';
import { logger } from '../utils/logger.js';
import { simulatedDevices, simulatorRuntimeConfig } from './config.js';
import { generateDeviceReadings, createInitialState } from './generator.js';
import { publishReading } from './publisher.js';

const deviceStates = new Map(
  simulatedDevices.map((device) => [device.id, createInitialState()] as const),
);

export async function startTelemetrySimulator() {
  if (!env.SIMULATOR_ENABLED) {
    logger.info('Telemetry simulator disabled');
    return;
  }

  try {
    await deviceRepository.upsertSimulatedDevices(simulatedDevices);
  } catch (error) {
    logger.warn(error);
  }

  setInterval(() => {
    void tick();
  }, simulatorRuntimeConfig.intervalMs);

  logger.info(
    `Telemetry simulator started for ${simulatedDevices.length} devices at ${simulatorRuntimeConfig.intervalMs}ms intervals`,
  );
}

async function tick() {
  const now = new Date();

  await Promise.all(
    simulatedDevices.flatMap((device) => {
      const state = deviceStates.get(device.id) ?? createInitialState();
      deviceStates.set(device.id, state);

      const anomalyCountBefore = state.activeAnomalies.length;
      const readings = generateDeviceReadings(device, state, simulatorRuntimeConfig, now);

      if (state.activeAnomalies.length > anomalyCountBefore) {
        const anomaly = state.activeAnomalies[state.activeAnomalies.length - 1];

        realtimeService.emitSimulatorAnomaly({
          deviceId: device.id,
          anomaly,
        });
      }

      return readings.map((reading) => publishReading(reading, simulatorRuntimeConfig));
    }),
  );
}
