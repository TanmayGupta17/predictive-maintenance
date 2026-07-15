import type { TelemetryMetricName, TelemetryReading } from '../types/telemetry.js';
import { anomalySettings, metricProfiles } from './config.js';
import {
  anomalyOffsetForMetric,
  createAnomaly,
  hasActiveAnomaly,
  pruneExpiredAnomalies,
} from './anomalies.js';
import { chance, randomInt } from './random.js';
import type { DeviceRuntimeState, SimulatedDevice, SimulatorRuntimeConfig } from './types.js';

const metrics = Object.keys(metricProfiles) as TelemetryMetricName[];

export function createInitialState(): DeviceRuntimeState {
  return {
    values: metrics.reduce(
      (values, metric) => ({
        ...values,
        [metric]: metricProfiles[metric].baseline,
      }),
      {} as Record<TelemetryMetricName, number>,
    ),
    activeAnomalies: [],
    lastReadings: [],
  };
}

export function generateDeviceReadings(
  device: SimulatedDevice,
  state: DeviceRuntimeState,
  config: SimulatorRuntimeConfig,
  now = new Date(),
) {
  const nowMs = now.getTime();
  pruneExpiredAnomalies(state, nowMs);

  if (chance(config.anomalyProbability)) {
    state.activeAnomalies.push(createAnomaly(nowMs));
  }

  if (hasActiveAnomaly(state, 'sensorOutage')) {
    return [];
  }

  const readings = metrics.map((metric) => createReading(device.id, metric, state, now));

  if (hasActiveAnomaly(state, 'duplicateReading') && state.lastReadings.length > 0) {
    const previousReading = state.lastReadings[randomInt(0, state.lastReadings.length - 1)];

    if (previousReading) {
      readings.push(previousReading);
    }
  }

  if (hasActiveAnomaly(state, 'outOfOrderReading') && readings.length > 0) {
    const reading = readings[randomInt(0, readings.length - 1)];

    if (reading) {
      readings.push({
        ...reading,
        timestamp: new Date(
          nowMs -
            randomInt(anomalySettings.outOfOrderLagMs.min, anomalySettings.outOfOrderLagMs.max),
        ),
      });
    }
  }

  state.lastReadings = readings.slice(-metrics.length);
  return readings;
}

function createReading(
  deviceId: string,
  metric: TelemetryMetricName,
  state: DeviceRuntimeState,
  timestamp: Date,
): TelemetryReading {
  const profile = metricProfiles[metric];
  const previousValue = state.values[metric];
  const naturalMovement =
    (profile.baseline - previousValue) * profile.reversion +
    (Math.random() * 2 - 1) * profile.naturalNoise;
  const anomalyMovement = anomalyOffsetForMetric(state, metric);
  const nextValue = clamp(previousValue + naturalMovement + anomalyMovement, profile.min, profile.max);

  state.values[metric] = nextValue;

  return {
    deviceId,
    metric,
    value: roundTo(nextValue, profile.precision),
    timestamp,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundTo(value: number, precision: number) {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}
