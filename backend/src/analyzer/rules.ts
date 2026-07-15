import { AlertSeverity } from '@prisma/client';

import { analyzerConfiguration } from './configuration.js';
import { isSustained } from './analytics.js';
import type { AnalyzerRule, RuleAlert, RuleContext } from './types.js';

export const analyzerRules: AnalyzerRule[] = [
  {
    key: 'temperature-sustained-rise',
    metric: 'temperature',
    evaluate: (context) => {
      const config = analyzerConfiguration.metrics.temperature;
      const { features } = context;
      const sustainedIncrease =
        features.continuousIncreaseCount >= config.sustainedIncreaseReadings ||
        (features.trendSlope >= config.trendSlopeWarning &&
          features.rateOfChange >= config.rateOfChangeWarning);

      if (
        !sustainedIncrease ||
        !isSustained(features, config.sustainedIncreaseReadings) ||
        features.movingAverage < config.warning
      ) {
        return null;
      }

      const critical = features.movingAverage >= config.critical;
      return alert({
        context,
        ruleKey: 'temperature-sustained-rise',
        severity: critical ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
        confidenceScore: critical ? 94 : 88,
        title: critical ? 'Critical temperature rise detected' : 'Sustained temperature rise detected',
        reason: `Temperature has increased continuously for the last ${features.continuousIncreaseCount} readings.`,
        recommendation: 'Inspect cooling systems, airflow, coolant levels, and thermal load immediately.',
        description: 'Possible cooling failure or excessive thermal load.',
      });
    },
  },
  {
    key: 'vibration-bearing-failure-pattern',
    metric: 'vibration',
    evaluate: (context) => {
      const config = analyzerConfiguration.metrics.vibration;
      const { features } = context;
      const bearingPattern =
        features.movingAverage >= config.warning &&
        features.continuousIncreaseCount >= config.sustainedIncreaseReadings &&
        features.trendSlope >= config.bearingTrendSlope &&
        features.rateOfChange >= config.rateOfChangeWarning;

      if (!bearingPattern || !isSustained(features, config.sustainedIncreaseReadings)) {
        return null;
      }

      const critical = features.movingAverage >= config.critical;
      return alert({
        context,
        ruleKey: 'vibration-bearing-failure-pattern',
        severity: critical ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
        confidenceScore: critical ? 92 : 84,
        title: critical ? 'Critical vibration pattern detected' : 'Bearing failure pattern detected',
        reason: `Vibration is rising over ${features.continuousIncreaseCount} consecutive readings with sustained trend slope.`,
        recommendation: 'Schedule bearing inspection, lubrication check, alignment validation, and vibration analysis.',
        description: 'Possible bearing wear, imbalance, misalignment, or looseness.',
      });
    },
  },
  {
    key: 'pressure-leakage-pattern',
    metric: 'pressure',
    evaluate: (context) => {
      const config = analyzerConfiguration.metrics.pressure;
      const { features } = context;
      const leakagePattern =
        features.movingAverage <= config.warningLow &&
        features.continuousDecreaseCount >= config.sustainedDecreaseReadings &&
        features.trendSlope <= config.leakageTrendSlope;

      if (!leakagePattern || !isSustained(features, config.sustainedDecreaseReadings)) {
        return null;
      }

      const critical = features.movingAverage <= config.criticalLow;
      return alert({
        context,
        ruleKey: 'pressure-leakage-pattern',
        severity: critical ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
        confidenceScore: critical ? 91 : 83,
        title: critical ? 'Critical pressure loss detected' : 'Sustained pressure drop detected',
        reason: `Pressure has decreased continuously for the last ${features.continuousDecreaseCount} readings.`,
        recommendation: 'Inspect valves, seals, fittings, lines, and downstream demand changes.',
        description: 'Possible leakage, blockage, valve fault, or process loss.',
      });
    },
  },
  {
    key: 'power-overload-pattern',
    metric: 'power',
    evaluate: (context) => {
      const config = analyzerConfiguration.metrics.power;
      const { features } = context;
      const overload =
        features.movingAverage >= config.warning &&
        features.sampleCount >= config.overloadSamples &&
        features.spikeCount <= analyzerConfiguration.ignoredSpikeLimit;

      if (!overload) {
        return null;
      }

      const critical = features.movingAverage >= config.critical;
      return alert({
        context,
        ruleKey: 'power-overload-pattern',
        severity: critical ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
        confidenceScore: critical ? 90 : 81,
        title: critical ? 'Critical power overload detected' : 'Sustained power overload detected',
        reason: `Power moving average is ${features.movingAverage.toFixed(2)}, above the configured overload threshold.`,
        recommendation: 'Check load conditions, electrical supply quality, motor current draw, and mechanical drag.',
        description: 'Possible overload, jam, electrical fault, or abnormal process demand.',
      });
    },
  },
  {
    key: 'humidity-environment-risk',
    metric: 'humidity',
    evaluate: (context) => {
      const config = analyzerConfiguration.metrics.humidity;
      const { features } = context;
      const risk =
        features.movingAverage >= config.warning &&
        isSustained(features, config.sustainedSamples);

      if (!risk) {
        return null;
      }

      const critical = features.movingAverage >= config.critical;
      return alert({
        context,
        ruleKey: 'humidity-environment-risk',
        severity: critical ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
        confidenceScore: critical ? 89 : 79,
        title: critical ? 'Critical humidity exposure detected' : 'Environmental humidity risk detected',
        reason: `Humidity moving average has remained elevated across ${features.sampleCount} readings.`,
        recommendation: 'Inspect enclosure sealing, ventilation, condensation risk, and dehumidification controls.',
        description: 'Possible corrosion, condensation, or electronics reliability risk.',
      });
    },
  },
];

function alert(input: {
  context: RuleContext;
  ruleKey: string;
  severity: AlertSeverity;
  confidenceScore: number;
  title: string;
  description: string;
  reason: string;
  recommendation: string;
}): RuleAlert {
  return {
    ruleKey: input.ruleKey,
    metric: input.context.prismaMetric,
    severity: input.severity,
    confidenceScore: input.confidenceScore,
    title: input.title,
    description: input.description,
    reason: input.reason,
    recommendation: input.recommendation,
  };
}
