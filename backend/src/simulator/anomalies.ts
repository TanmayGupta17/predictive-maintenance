import type { TelemetryMetricName } from '../types/telemetry.js';
import { anomalySettings } from './config.js';
import { pickOne, randomBetween } from './random.js';
import type { ActiveAnomaly, AnomalyKind, DeviceRuntimeState } from './types.js';

const anomalyKinds: AnomalyKind[] = [
  'temperatureRise',
  'vibrationIncrease',
  'pressureDrop',
  'powerSpike',
  'sensorOutage',
  'duplicateReading',
  'outOfOrderReading',
  'randomSpike',
];

const anomalyMetricByKind: Partial<Record<AnomalyKind, TelemetryMetricName>> = {
  temperatureRise: 'temperature',
  vibrationIncrease: 'vibration',
  pressureDrop: 'pressure',
  powerSpike: 'power',
};

export function createAnomaly(now: number): ActiveAnomaly {
  const kind = pickOne(anomalyKinds);
  const metric = anomalyMetricByKind[kind] ?? pickOne<TelemetryMetricName>([
    'temperature',
    'vibration',
    'power',
    'pressure',
    'humidity',
  ]);

  return {
    kind,
    metric,
    startedAt: now,
    endsAt: now + durationFor(kind),
    magnitude: magnitudeFor(kind),
  };
}

export function pruneExpiredAnomalies(state: DeviceRuntimeState, now: number) {
  state.activeAnomalies = state.activeAnomalies.filter((anomaly) => anomaly.endsAt > now);
}

export function hasActiveAnomaly(state: DeviceRuntimeState, kind: AnomalyKind) {
  return state.activeAnomalies.some((anomaly) => anomaly.kind === kind);
}

export function anomalyOffsetForMetric(
  state: DeviceRuntimeState,
  metric: TelemetryMetricName,
) {
  return state.activeAnomalies.reduce((offset, anomaly) => {
    if (anomaly.metric !== metric) {
      return offset;
    }

    if (anomaly.kind === 'temperatureRise' || anomaly.kind === 'vibrationIncrease') {
      return offset + gradualStep(anomaly);
    }

    if (anomaly.kind === 'pressureDrop') {
      return offset + gradualStep(anomaly);
    }

    if (anomaly.kind === 'powerSpike' || anomaly.kind === 'randomSpike') {
      return offset + anomaly.magnitude;
    }

    return offset;
  }, 0);
}

function durationFor(kind: AnomalyKind) {
  if (kind === 'temperatureRise' || kind === 'vibrationIncrease' || kind === 'pressureDrop') {
    return anomalySettings.gradualDurationMs;
  }

  if (kind === 'sensorOutage') {
    return anomalySettings.shortDurationMs;
  }

  return 1_000;
}

function magnitudeFor(kind: AnomalyKind) {
  if (kind === 'temperatureRise') {
    return randomBetween(12, anomalySettings.magnitudes.temperatureRise);
  }

  if (kind === 'vibrationIncrease') {
    return randomBetween(2, anomalySettings.magnitudes.vibrationIncrease);
  }

  if (kind === 'pressureDrop') {
    return randomBetween(anomalySettings.magnitudes.pressureDrop, -0.9);
  }

  if (kind === 'powerSpike') {
    return randomBetween(25, anomalySettings.magnitudes.powerSpike);
  }

  if (kind === 'randomSpike') {
    return randomBetween(6, anomalySettings.magnitudes.randomSpike);
  }

  return 0;
}

function gradualStep(anomaly: ActiveAnomaly) {
  const duration = anomaly.endsAt - anomaly.startedAt;
  const seconds = Math.max(1, duration / 1_000);
  return anomaly.magnitude / seconds;
}
