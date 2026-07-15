import { AlertSeverity, AlertStatus, DeviceStatus, DeviceType, TelemetryMetric } from '@prisma/client';

import type { TelemetryWindowPoint } from '../../src/analyzer/types.js';
import type { TelemetryMetricName } from '../../src/types/telemetry.js';

// Stable, RFC-4122-valid UUIDs (version 4) so they pass the socket subscribe filter.
export const DEVICE_ID = '11111111-1111-4111-8111-111111111111';
export const DEVICE_ID_2 = '22222222-2222-4222-8222-222222222222';
export const ALERT_ID = '33333333-3333-4333-8333-333333333333';

export function makeDevice(overrides: Record<string, unknown> = {}) {
  return {
    id: DEVICE_ID,
    name: 'Pump A1',
    type: DeviceType.PUMP,
    location: 'Plant 1',
    healthScore: 95,
    status: DeviceStatus.ONLINE,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

export function makeAlert(overrides: Record<string, unknown> = {}) {
  return {
    id: ALERT_ID,
    deviceId: DEVICE_ID,
    metric: TelemetryMetric.TEMPERATURE,
    ruleKey: 'temperature-sustained-rise',
    severity: AlertSeverity.WARNING,
    confidenceScore: 88,
    title: 'Sustained temperature rise detected',
    description: 'Possible cooling failure or excessive thermal load.',
    reason: 'Temperature has increased continuously.',
    recommendation: 'Inspect cooling systems.',
    status: AlertStatus.OPEN,
    createdAt: new Date('2026-01-02T00:00:00.000Z'),
    resolvedAt: null,
    ...overrides,
  };
}

export function makeTelemetry(overrides: Record<string, unknown> = {}) {
  return {
    id: '44444444-4444-4444-8444-444444444444',
    deviceId: DEVICE_ID,
    metric: TelemetryMetric.TEMPERATURE,
    value: 72.5,
    timestamp: new Date('2026-01-02T00:00:00.000Z'),
    receivedAt: new Date('2026-01-02T00:00:01.000Z'),
    ...overrides,
  };
}

/**
 * Builds a sliding-window slice with `smoothedValue === value` so feature math
 * (moving average, trend slope, spikes) can be asserted exactly. Timestamps are
 * `stepMs` apart, oldest first.
 */
export function buildWindow(
  values: number[],
  options: { metric?: TelemetryMetricName; deviceId?: string; stepMs?: number } = {},
): TelemetryWindowPoint[] {
  const { metric = 'temperature', deviceId = DEVICE_ID, stepMs = 1_000 } = options;
  return values.map((value, index) => ({
    deviceId,
    metric,
    value,
    timestamp: new Date(index * stepMs),
    smoothedValue: value,
  }));
}
