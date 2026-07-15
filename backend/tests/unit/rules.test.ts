import { AlertSeverity, TelemetryMetric } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { analyzerRules } from '../../src/analyzer/rules.js';
import type { MetricFeatures, RuleContext } from '../../src/analyzer/types.js';
import type { TelemetryMetricName } from '../../src/types/telemetry.js';
import { DEVICE_ID } from '../helpers/fixtures.js';

function ruleByKey(key: string) {
  const rule = analyzerRules.find((candidate) => candidate.key === key);
  if (!rule) {
    throw new Error(`rule ${key} not found`);
  }
  return rule;
}

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

function context(prismaMetric: TelemetryMetric, metricFeatures: MetricFeatures): RuleContext {
  return { deviceId: DEVICE_ID, metric: metricFeatures.metric, prismaMetric, window: [], features: metricFeatures };
}

describe('temperature-sustained-rise rule', () => {
  const rule = ruleByKey('temperature-sustained-rise');

  it('raises a WARNING when temperature sustains a rise above the warning threshold', () => {
    const result = rule.evaluate(
      context(
        TelemetryMetric.TEMPERATURE,
        features('temperature', { movingAverage: 75, continuousIncreaseCount: 12 }),
      ),
    );

    expect(result).not.toBeNull();
    expect(result?.severity).toBe(AlertSeverity.WARNING);
    expect(result?.metric).toBe(TelemetryMetric.TEMPERATURE);
    expect(result?.ruleKey).toBe('temperature-sustained-rise');
    expect(result?.confidenceScore).toBe(88);
  });

  it('escalates to CRITICAL above the critical threshold', () => {
    const result = rule.evaluate(
      context(
        TelemetryMetric.TEMPERATURE,
        features('temperature', { movingAverage: 90, continuousIncreaseCount: 12 }),
      ),
    );

    expect(result?.severity).toBe(AlertSeverity.CRITICAL);
    expect(result?.confidenceScore).toBe(94);
  });

  it('fires on a steep trend even before the continuous-rise count is reached', () => {
    const result = rule.evaluate(
      context(
        TelemetryMetric.TEMPERATURE,
        features('temperature', {
          movingAverage: 75,
          continuousIncreaseCount: 3,
          trendSlope: 0.2,
          rateOfChange: 0.3,
        }),
      ),
    );

    expect(result?.severity).toBe(AlertSeverity.WARNING);
  });

  it('does not fire below the warning threshold', () => {
    const result = rule.evaluate(
      context(
        TelemetryMetric.TEMPERATURE,
        features('temperature', { movingAverage: 70, continuousIncreaseCount: 12 }),
      ),
    );

    expect(result).toBeNull();
  });

  it('suppresses the alert when the window is too spiky (spike filtering)', () => {
    const result = rule.evaluate(
      context(
        TelemetryMetric.TEMPERATURE,
        features('temperature', { movingAverage: 90, continuousIncreaseCount: 12, spikeCount: 5 }),
      ),
    );

    expect(result).toBeNull();
  });
});

describe('vibration-bearing-failure-pattern rule', () => {
  const rule = ruleByKey('vibration-bearing-failure-pattern');

  it('detects the bearing-wear pattern (rising vibration with sustained slope)', () => {
    const result = rule.evaluate(
      context(
        TelemetryMetric.VIBRATION,
        features('vibration', {
          movingAverage: 5,
          continuousIncreaseCount: 10,
          trendSlope: 0.05,
          rateOfChange: 0.15,
        }),
      ),
    );

    expect(result?.severity).toBe(AlertSeverity.WARNING);
    expect(result?.metric).toBe(TelemetryMetric.VIBRATION);
  });

  it('escalates to CRITICAL above the critical vibration threshold', () => {
    const result = rule.evaluate(
      context(
        TelemetryMetric.VIBRATION,
        features('vibration', {
          movingAverage: 8,
          continuousIncreaseCount: 10,
          trendSlope: 0.05,
          rateOfChange: 0.15,
        }),
      ),
    );

    expect(result?.severity).toBe(AlertSeverity.CRITICAL);
  });

  it('does not fire when the upward trend is too shallow', () => {
    const result = rule.evaluate(
      context(
        TelemetryMetric.VIBRATION,
        features('vibration', {
          movingAverage: 5,
          continuousIncreaseCount: 10,
          trendSlope: 0.01,
          rateOfChange: 0.15,
        }),
      ),
    );

    expect(result).toBeNull();
  });
});

describe('pressure-leakage-pattern rule', () => {
  const rule = ruleByKey('pressure-leakage-pattern');

  it('detects a sustained pressure drop (leakage)', () => {
    const result = rule.evaluate(
      context(
        TelemetryMetric.PRESSURE,
        features('pressure', {
          movingAverage: 5,
          continuousDecreaseCount: 10,
          trendSlope: -0.05,
        }),
      ),
    );

    expect(result?.severity).toBe(AlertSeverity.WARNING);
    expect(result?.metric).toBe(TelemetryMetric.PRESSURE);
  });

  it('escalates to CRITICAL below the critical-low threshold', () => {
    const result = rule.evaluate(
      context(
        TelemetryMetric.PRESSURE,
        features('pressure', {
          movingAverage: 4,
          continuousDecreaseCount: 10,
          trendSlope: -0.05,
        }),
      ),
    );

    expect(result?.severity).toBe(AlertSeverity.CRITICAL);
  });

  it('does not fire when the decline is not sustained downward', () => {
    const result = rule.evaluate(
      context(
        TelemetryMetric.PRESSURE,
        features('pressure', {
          movingAverage: 5,
          continuousDecreaseCount: 10,
          trendSlope: -0.01,
        }),
      ),
    );

    expect(result).toBeNull();
  });
});

describe('power-overload-pattern rule', () => {
  const rule = ruleByKey('power-overload-pattern');

  it('detects a sustained power overload', () => {
    const result = rule.evaluate(
      context(TelemetryMetric.POWER, features('power', { movingAverage: 110, sampleCount: 10 })),
    );

    expect(result?.severity).toBe(AlertSeverity.WARNING);
  });

  it('is suppressed when the window is too spiky', () => {
    const result = rule.evaluate(
      context(
        TelemetryMetric.POWER,
        features('power', { movingAverage: 110, sampleCount: 10, spikeCount: 5 }),
      ),
    );

    expect(result).toBeNull();
  });
});

describe('humidity-environment-risk rule', () => {
  const rule = ruleByKey('humidity-environment-risk');

  it('detects sustained elevated humidity', () => {
    const result = rule.evaluate(
      context(TelemetryMetric.HUMIDITY, features('humidity', { movingAverage: 70, sampleCount: 20 })),
    );

    expect(result?.severity).toBe(AlertSeverity.WARNING);
  });

  it('does not fire below the humidity warning threshold', () => {
    const result = rule.evaluate(
      context(TelemetryMetric.HUMIDITY, features('humidity', { movingAverage: 60, sampleCount: 20 })),
    );

    expect(result).toBeNull();
  });
});
