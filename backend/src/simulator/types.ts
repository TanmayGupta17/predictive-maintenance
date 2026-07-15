import type { TelemetryMetricName, TelemetryReading } from '../types/telemetry.js';

export type SimulatedDeviceType = 'pump' | 'motor' | 'compressor' | 'generator' | 'conveyor';

export interface SimulatedDevice {
  id: string;
  name: string;
  type: SimulatedDeviceType;
  location: string;
  healthScore: number;
}

export interface MetricProfile {
  baseline: number;
  min: number;
  max: number;
  naturalNoise: number;
  reversion: number;
  precision: number;
}

export type AnomalyKind =
  | 'temperatureRise'
  | 'vibrationIncrease'
  | 'pressureDrop'
  | 'powerSpike'
  | 'sensorOutage'
  | 'duplicateReading'
  | 'outOfOrderReading'
  | 'randomSpike';

export interface ActiveAnomaly {
  kind: AnomalyKind;
  metric?: TelemetryMetricName;
  startedAt: number;
  endsAt: number;
  magnitude: number;
}

export interface DeviceRuntimeState {
  values: Record<TelemetryMetricName, number>;
  activeAnomalies: ActiveAnomaly[];
  lastReadings: TelemetryReading[];
}

export interface SimulatorRuntimeConfig {
  intervalMs: number;
  anomalyProbability: number;
  ingestionUrl: string;
}
