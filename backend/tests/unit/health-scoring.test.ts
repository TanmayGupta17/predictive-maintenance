import { AlertSeverity } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import {
  applyGradualRecovery,
  buildRiskDistribution,
  classifyRisk,
  computeTargetHealth,
} from '../../src/analyzer/health-scoring.js';
import type { MetricFeatures } from '../../src/analyzer/types.js';
import type { TelemetryMetricName } from '../../src/types/telemetry.js';

function features(metric: TelemetryMetricName, overrides: Partial<MetricFeatures>): MetricFeatures {
  return {
    metric,
    latest: 0,
    latestSmoothed: 0,
    movingAverage: 0,
    previousMovingAverage: 0,
    rateOfChange: 0,
    trendSlope: 0,
    continuousIncreaseCount: 0,
    continuousDecreaseCount: 0,
    spikeCount: 0,
    sampleCount: 20,
    ...overrides,
  };
}

const healthy = () =>
  computeTargetHealth({ features: {}, activeAlerts: [], recentAlertCount: 0, recentCriticalCount: 0 });

describe('computeTargetHealth', () => {
  it('keeps a device at full health with no adverse signals', () => {
    expect(healthy().target).toBe(100);
  });

  it('lowers health for a rising temperature trend', () => {
    const result = computeTargetHealth({
      features: { temperature: features('temperature', { movingAverage: 90, trendSlope: 0.2, continuousIncreaseCount: 12 }) },
      activeAlerts: [],
      recentAlertCount: 0,
      recentCriticalCount: 0,
    });

    expect(result.breakdown.temperature).toBeGreaterThan(0);
    expect(result.target).toBeLessThan(100);
  });

  it('lowers health for a rising vibration trend', () => {
    const result = computeTargetHealth({
      features: { vibration: features('vibration', { movingAverage: 8, trendSlope: 0.06, continuousIncreaseCount: 10 }) },
      activeAlerts: [],
      recentAlertCount: 0,
      recentCriticalCount: 0,
    });

    expect(result.breakdown.vibration).toBeGreaterThan(0);
  });

  it('lowers health for abnormal (low, falling) pressure', () => {
    const result = computeTargetHealth({
      features: { pressure: features('pressure', { movingAverage: 4, trendSlope: -0.05, continuousDecreaseCount: 10 }) },
      activeAlerts: [],
      recentAlertCount: 0,
      recentCriticalCount: 0,
    });

    expect(result.breakdown.pressure).toBeGreaterThan(0);
  });

  it('penalizes repeated alerts and recent failures', () => {
    const result = computeTargetHealth({
      features: {},
      activeAlerts: [
        { severity: AlertSeverity.CRITICAL, confidenceScore: 90 },
        { severity: AlertSeverity.WARNING, confidenceScore: 80 },
      ],
      recentAlertCount: 6,
      recentCriticalCount: 3,
    });

    expect(result.breakdown.repeatedAlerts).toBeGreaterThan(0);
    expect(result.breakdown.recentFailures).toBeGreaterThan(0);
    expect(result.target).toBeLessThan(60);
  });

  it('clamps the target to the 0..100 range', () => {
    const result = computeTargetHealth({
      features: {
        temperature: features('temperature', { movingAverage: 200, trendSlope: 5, continuousIncreaseCount: 30 }),
        vibration: features('vibration', { movingAverage: 50, trendSlope: 5, continuousIncreaseCount: 30 }),
      },
      activeAlerts: Array.from({ length: 10 }, () => ({ severity: AlertSeverity.CRITICAL, confidenceScore: 100 })),
      recentAlertCount: 50,
      recentCriticalCount: 50,
    });

    expect(result.target).toBeGreaterThanOrEqual(0);
    expect(result.target).toBeLessThanOrEqual(100);
  });
});

describe('applyGradualRecovery', () => {
  it('recovers gradually toward the target without overshooting', () => {
    const oneSecond = applyGradualRecovery(40, 100, 1);
    const tenSeconds = applyGradualRecovery(40, 100, 10);

    expect(oneSecond).toBeGreaterThan(40);
    expect(oneSecond).toBeLessThan(100);
    expect(tenSeconds).toBeGreaterThan(oneSecond);
    expect(applyGradualRecovery(98, 100, 999)).toBe(100);
  });

  it('degrades faster than it recovers', () => {
    const recovered = applyGradualRecovery(20, 80, 1) - 20;
    const degraded = 80 - applyGradualRecovery(80, 20, 1);

    expect(degraded).toBeGreaterThan(recovered);
    expect(applyGradualRecovery(80, 20, 999)).toBe(20); // never undershoots the target
  });

  it('is a no-op when already at the target', () => {
    expect(applyGradualRecovery(73, 73, 5)).toBe(73);
  });
});

describe('risk classification', () => {
  it('maps health scores to risk bands', () => {
    expect(classifyRisk(95)).toBe('LOW');
    expect(classifyRisk(75)).toBe('MODERATE');
    expect(classifyRisk(60)).toBe('HIGH');
    expect(classifyRisk(30)).toBe('CRITICAL');
  });

  it('builds a risk distribution across the fleet', () => {
    const distribution = buildRiskDistribution([95, 90, 75, 60, 30, 10]);

    expect(distribution).toEqual({ LOW: 2, MODERATE: 1, HIGH: 1, CRITICAL: 2, total: 6 });
  });
});
