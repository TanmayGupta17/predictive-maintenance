import { env } from '../config/env.js';
import type { TelemetryMetricName } from '../types/telemetry.js';
import type { MetricProfile, SimulatedDevice, SimulatorRuntimeConfig } from './types.js';

export const simulatedDevices: SimulatedDevice[] = [
  {
    id: '7f5f5d2e-81e6-49cb-a7b4-5f526dd6fb33',
    name: 'Boiler Feed Pump A',
    type: 'pump',
    location: 'Plant 1 / Boiler Room',
    healthScore: 96,
  },
  {
    id: 'bb1f0ae6-51f8-4c87-934d-98e16c7ed4dc',
    name: 'Main Conveyor Motor',
    type: 'motor',
    location: 'Plant 1 / Packaging Line',
    healthScore: 91,
  },
  {
    id: '9cf3d1f8-8e03-4577-9b5c-a3b2840ad827',
    name: 'Air Compressor C',
    type: 'compressor',
    location: 'Plant 2 / Utility Bay',
    healthScore: 88,
  },
  {
    id: '2f02e674-9256-45e8-bd3b-35380058e15e',
    name: 'Backup Generator',
    type: 'generator',
    location: 'Plant 2 / Power Room',
    healthScore: 93,
  },
  {
    id: 'ca8d22d0-3d9b-45c4-a3fd-b23847d2a1bb',
    name: 'Cooling Tower Fan',
    type: 'conveyor',
    location: 'Plant 3 / Cooling Yard',
    healthScore: 89,
  },
];

export const metricProfiles: Record<TelemetryMetricName, MetricProfile> = {
  temperature: {
    baseline: 58,
    min: 32,
    max: 105,
    naturalNoise: 0.45,
    reversion: 0.03,
    precision: 2,
  },
  vibration: {
    baseline: 2.4,
    min: 0.2,
    max: 12,
    naturalNoise: 0.08,
    reversion: 0.04,
    precision: 3,
  },
  power: {
    baseline: 74,
    min: 5,
    max: 180,
    naturalNoise: 1.8,
    reversion: 0.05,
    precision: 2,
  },
  pressure: {
    baseline: 7.2,
    min: 0.5,
    max: 14,
    naturalNoise: 0.07,
    reversion: 0.04,
    precision: 3,
  },
  humidity: {
    baseline: 44,
    min: 5,
    max: 95,
    naturalNoise: 0.6,
    reversion: 0.025,
    precision: 2,
  },
};

export const anomalySettings = {
  gradualDurationMs: 180_000,
  shortDurationMs: 20_000,
  outOfOrderLagMs: {
    min: 5_000,
    max: 45_000,
  },
  magnitudes: {
    temperatureRise: 24,
    vibrationIncrease: 4.8,
    pressureDrop: -2.8,
    powerSpike: 55,
    randomSpike: 18,
  },
};

export const simulatorRuntimeConfig: SimulatorRuntimeConfig = {
  intervalMs: env.SIMULATOR_INTERVAL_MS,
  anomalyProbability: env.SIMULATOR_ANOMALY_PROBABILITY,
  ingestionUrl: env.SIMULATOR_INGESTION_URL,
};
