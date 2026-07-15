import type { AlertSeverity, TelemetryMetric } from '@prisma/client';

import type { TelemetryMetricName, TelemetryReading } from '../types/telemetry.js';

export interface TelemetryWindowPoint extends TelemetryReading {
  smoothedValue: number;
}

export interface MetricFeatures {
  metric: TelemetryMetricName;
  latest: number;
  latestSmoothed: number;
  movingAverage: number;
  previousMovingAverage: number;
  rateOfChange: number;
  trendSlope: number;
  continuousIncreaseCount: number;
  continuousDecreaseCount: number;
  spikeCount: number;
  sampleCount: number;
}

export interface RuleContext {
  deviceId: string;
  metric: TelemetryMetricName;
  prismaMetric: TelemetryMetric;
  window: TelemetryWindowPoint[];
  features: MetricFeatures;
}

export interface RuleAlert {
  ruleKey: string;
  metric: TelemetryMetric;
  severity: AlertSeverity;
  confidenceScore: number;
  title: string;
  description: string;
  reason: string;
  recommendation: string;
}

export interface AnalyzerRule {
  key: string;
  metric: TelemetryMetricName;
  evaluate(context: RuleContext): RuleAlert | null;
}
