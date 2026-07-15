import { AlertSeverity, TelemetryMetric } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { ruleEngine } from '../../src/analyzer/rule-engine.js';
import { buildWindow, DEVICE_ID } from '../helpers/fixtures.js';

describe('ruleEngine.evaluate', () => {
  it('returns no alerts when the window is below the minimum sample size', () => {
    const window = buildWindow([70, 72, 74], { metric: 'temperature' });
    expect(ruleEngine.evaluate(DEVICE_ID, window)).toEqual([]);
  });

  it('returns no alerts for a healthy, in-range signal', () => {
    const window = buildWindow(Array.from({ length: 12 }, () => 60), { metric: 'temperature' });
    expect(ruleEngine.evaluate(DEVICE_ID, window)).toEqual([]);
  });

  it('produces a temperature alert for a sustained rise into the critical band', () => {
    const window = buildWindow(
      Array.from({ length: 20 }, (_, index) => 70 + index * 2),
      { metric: 'temperature' },
    );

    const alerts = ruleEngine.evaluate(DEVICE_ID, window);

    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.metric).toBe(TelemetryMetric.TEMPERATURE);
    expect(alerts[0]?.ruleKey).toBe('temperature-sustained-rise');
    expect(alerts[0]?.severity).toBe(AlertSeverity.CRITICAL);
  });

  it('only evaluates rules matching the window metric', () => {
    const window = buildWindow(
      Array.from({ length: 20 }, (_, index) => 3.5 + index * 0.3),
      { metric: 'vibration' },
    );

    const alerts = ruleEngine.evaluate(DEVICE_ID, window);

    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts.every((alert) => alert.metric === TelemetryMetric.VIBRATION)).toBe(true);
  });
});
