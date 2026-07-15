import type { TelemetryMetricName } from '../types/telemetry.js';

export const analyzerConfiguration = {
  windowSize: 30,
  minimumSamples: 8,
  sustainedSamples: 5,
  movingAveragePeriod: 6,
  smoothingFactor: 0.35,
  spikeLookback: 8,
  ignoredSpikeLimit: 1,
  metrics: {
    temperature: {
      warning: 72,
      critical: 86,
      sustainedIncreaseReadings: 12,
      trendSlopeWarning: 0.18,
      rateOfChangeWarning: 0.28,
    },
    vibration: {
      warning: 4.2,
      critical: 7.5,
      bearingTrendSlope: 0.045,
      sustainedIncreaseReadings: 10,
      rateOfChangeWarning: 0.12,
    },
    pressure: {
      warningLow: 5.8,
      criticalLow: 4.2,
      leakageTrendSlope: -0.035,
      sustainedDecreaseReadings: 10,
    },
    power: {
      warning: 105,
      critical: 135,
      overloadSamples: 5,
      spikeDelta: 22,
    },
    humidity: {
      warning: 65,
      critical: 78,
      sustainedSamples: 8,
    },
  },
} as const;

export const supportedAnalyzerMetrics = Object.keys(
  analyzerConfiguration.metrics,
) as TelemetryMetricName[];
