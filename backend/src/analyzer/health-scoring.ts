import type { AlertSeverity } from '@prisma/client';

import type { TelemetryMetricName } from '../types/telemetry.js';
import { calculateFeatures } from './analytics.js';
import { analyzerConfiguration, supportedAnalyzerMetrics } from './configuration.js';
import { slidingWindowStore } from './sliding-window.js';
import type { MetricFeatures } from './types.js';

/** Latest computed features per metric for a single device. */
export type DeviceFeatureSnapshot = Partial<Record<TelemetryMetricName, MetricFeatures>>;

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface HealthPenaltyBreakdown {
  temperature: number;
  vibration: number;
  pressure: number;
  repeatedAlerts: number;
  recentFailures: number;
}

export interface ActiveAlertSummary {
  severity: AlertSeverity;
  confidenceScore: number | null;
}

export interface TargetHealthInput {
  features: DeviceFeatureSnapshot;
  activeAlerts: ActiveAlertSummary[];
  /** Alerts created for this device within the rolling lookback window. */
  recentAlertCount: number;
  /** CRITICAL alerts created for this device within the lookback window. */
  recentCriticalCount: number;
}

export interface RiskDistribution {
  LOW: number;
  MODERATE: number;
  HIGH: number;
  CRITICAL: number;
  total: number;
}

/**
 * Tunable weights for the fleet health model. Each signal subtracts from a
 * healthy baseline of 100; recovery eases the stored score back up once the
 * underlying signals normalize.
 */
export const healthModelConfiguration = {
  /** Maximum health each signal can subtract from the baseline of 100. */
  maxPenalty: {
    temperature: 26,
    vibration: 26,
    pressure: 22,
    repeatedAlerts: 34,
    recentFailures: 26,
  },
  /** Per-second easing rates applied between the previous score and the target. */
  recovery: {
    recoverPerSecond: 1.5, // health climbs slowly once signals normalize
    degradePerSecond: 8, // health drops faster when signals worsen
    maxElapsedSeconds: 45, // clamp long gaps so a stale score doesn't leap
  },
  alerts: {
    /** Rolling window used for "repeated alerts" and "recent failures". */
    lookbackMs: 10 * 60 * 1000,
    severityPenalty: { INFO: 4, WARNING: 12, CRITICAL: 24 } as Record<AlertSeverity, number>,
    repeatPenaltyPerAlert: 6, // each repeated alert in the window
    repeatFreeAllowance: 1, // the first alert isn't counted as a repeat
    failurePenaltyPerCritical: 13, // each critical raised in the window
  },
  /** Health-score cut points for the prediction risk distribution. */
  risk: {
    criticalBelow: 50,
    highBelow: 70,
    moderateBelow: 85,
  },
} as const;

function clamp(value: number, lower: number, upper: number) {
  return Math.max(lower, Math.min(upper, value));
}

/** Normalizes `value` to 0..1 across the [start, full] band (clamped). */
function ramp(value: number, start: number, full: number) {
  if (full === start) {
    return value >= full ? 1 : 0;
  }
  return clamp((value - start) / (full - start), 0, 1);
}

function temperaturePenalty(features?: MetricFeatures) {
  if (!features) {
    return 0;
  }
  const config = analyzerConfiguration.metrics.temperature;
  const max = healthModelConfiguration.maxPenalty.temperature;
  // How far the moving average sits inside (and beyond) the warning→critical band.
  const level = ramp(features.movingAverage, config.warning, config.critical);
  // A sustained upward trend predicts overheating before the level threshold trips.
  const slope = ramp(features.trendSlope, 0, config.trendSlopeWarning);
  const persistence = ramp(features.continuousIncreaseCount, 0, config.sustainedIncreaseReadings);
  const trend = slope * persistence;
  return clamp((level * 0.65 + trend * 0.35) * max, 0, max);
}

function vibrationPenalty(features?: MetricFeatures) {
  if (!features) {
    return 0;
  }
  const config = analyzerConfiguration.metrics.vibration;
  const max = healthModelConfiguration.maxPenalty.vibration;
  const level = ramp(features.movingAverage, config.warning, config.critical);
  // Rising vibration is the classic early bearing-wear signature.
  const slope = ramp(features.trendSlope, 0, config.bearingTrendSlope);
  const persistence = ramp(features.continuousIncreaseCount, 0, config.sustainedIncreaseReadings);
  const trend = slope * persistence;
  return clamp((level * 0.6 + trend * 0.4) * max, 0, max);
}

function pressurePenalty(features?: MetricFeatures) {
  if (!features) {
    return 0;
  }
  const config = analyzerConfiguration.metrics.pressure;
  const max = healthModelConfiguration.maxPenalty.pressure;
  // Low pressure is abnormal — lower moving average is worse.
  const low = ramp(config.warningLow - features.movingAverage, 0, config.warningLow - config.criticalLow);
  // A sustained downward trend flags a developing leak or blockage.
  const slope = ramp(-features.trendSlope, 0, -config.leakageTrendSlope);
  const persistence = ramp(features.continuousDecreaseCount, 0, config.sustainedDecreaseReadings);
  const trend = slope * persistence;
  // Erratic pressure (spikes beyond the ignored allowance) is also abnormal.
  const instability = ramp(
    features.spikeCount,
    analyzerConfiguration.ignoredSpikeLimit,
    analyzerConfiguration.spikeLookback,
  );
  return clamp((low * 0.55 + trend * 0.3 + instability * 0.15) * max, 0, max);
}

function repeatedAlertsPenalty(activeAlerts: ActiveAlertSummary[], recentAlertCount: number) {
  const config = healthModelConfiguration.alerts;
  const max = healthModelConfiguration.maxPenalty.repeatedAlerts;
  // Severity-weighted cost of the alerts that are currently active.
  const severityScore = activeAlerts.reduce((sum, alert) => {
    const confidence = Math.round((alert.confidenceScore ?? 0) / 25);
    return sum + config.severityPenalty[alert.severity] + confidence;
  }, 0);
  // Additional cost when alerts keep re-firing within the lookback window.
  const repeats = Math.max(0, recentAlertCount - config.repeatFreeAllowance);
  const repeatScore = repeats * config.repeatPenaltyPerAlert;
  return clamp(severityScore + repeatScore, 0, max);
}

function recentFailuresPenalty(recentCriticalCount: number) {
  const config = healthModelConfiguration.alerts;
  const max = healthModelConfiguration.maxPenalty.recentFailures;
  return clamp(recentCriticalCount * config.failurePenaltyPerCritical, 0, max);
}

/**
 * Computes the target health score a device should trend toward given its
 * current metric trends and alert activity. Returns the clamped 0..100 score
 * plus the per-signal penalty breakdown for observability.
 */
export function computeTargetHealth(input: TargetHealthInput): {
  target: number;
  breakdown: HealthPenaltyBreakdown;
} {
  const breakdown: HealthPenaltyBreakdown = {
    temperature: temperaturePenalty(input.features.temperature),
    vibration: vibrationPenalty(input.features.vibration),
    pressure: pressurePenalty(input.features.pressure),
    repeatedAlerts: repeatedAlertsPenalty(input.activeAlerts, input.recentAlertCount),
    recentFailures: recentFailuresPenalty(input.recentCriticalCount),
  };

  const totalPenalty =
    breakdown.temperature +
    breakdown.vibration +
    breakdown.pressure +
    breakdown.repeatedAlerts +
    breakdown.recentFailures;

  return {
    target: clamp(Math.round(100 - totalPenalty), 0, 100),
    breakdown,
  };
}

/**
 * Eases the stored health score toward `target`. Health recovers gradually
 * (once metrics normalize) but degrades more quickly, so a developing fault is
 * reflected promptly while recovery is smoothed over time. Rates are per-second
 * so behaviour is independent of how frequently this runs.
 */
export function applyGradualRecovery(previous: number, target: number, elapsedSeconds: number) {
  const { recoverPerSecond, degradePerSecond, maxElapsedSeconds } = healthModelConfiguration.recovery;
  const elapsed = clamp(elapsedSeconds, 0, maxElapsedSeconds);

  if (target > previous) {
    return Math.round(Math.min(target, previous + recoverPerSecond * elapsed));
  }
  if (target < previous) {
    return Math.round(Math.max(target, previous - degradePerSecond * elapsed));
  }
  return previous;
}

/** Reads the latest sliding-window features for every supported metric of a device. */
export function snapshotDeviceFeatures(deviceId: string): DeviceFeatureSnapshot {
  const snapshot: DeviceFeatureSnapshot = {};

  for (const metric of supportedAnalyzerMetrics) {
    const window = slidingWindowStore.getWindow(deviceId, metric);
    if (window.length === 0) {
      continue;
    }
    const features = calculateFeatures(window);
    if (features) {
      snapshot[metric] = features;
    }
  }

  return snapshot;
}

/** Buckets a device into a prediction-risk band from its health score. */
export function classifyRisk(healthScore: number): RiskLevel {
  const { criticalBelow, highBelow, moderateBelow } = healthModelConfiguration.risk;
  if (healthScore < criticalBelow) {
    return 'CRITICAL';
  }
  if (healthScore < highBelow) {
    return 'HIGH';
  }
  if (healthScore < moderateBelow) {
    return 'MODERATE';
  }
  return 'LOW';
}

/** Aggregates device health scores into a prediction risk distribution. */
export function buildRiskDistribution(healthScores: number[]): RiskDistribution {
  const distribution: RiskDistribution = { LOW: 0, MODERATE: 0, HIGH: 0, CRITICAL: 0, total: healthScores.length };

  for (const healthScore of healthScores) {
    distribution[classifyRisk(healthScore)] += 1;
  }

  return distribution;
}
