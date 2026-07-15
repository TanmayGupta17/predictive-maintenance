import { calculateFeatures } from './analytics.js';
import { prismaMetricByAnalyzerMetric } from './metric-mapping.js';
import { analyzerRules } from './rules.js';
import type { RuleAlert, TelemetryWindowPoint } from './types.js';

export class RuleEngine {
  evaluate(deviceId: string, window: TelemetryWindowPoint[]): RuleAlert[] {
    const features = calculateFeatures(window);

    if (features === null) {
      return [];
    }

    const prismaMetric = prismaMetricByAnalyzerMetric[features.metric];

    return analyzerRules.flatMap((rule) => {
      if (rule.metric !== features.metric) {
        return [];
      }

      const result = rule.evaluate({
        deviceId,
        metric: features.metric,
        prismaMetric,
        window,
        features,
      });

      return result === null ? [] : [result];
    });
  }
}

export const ruleEngine = new RuleEngine();
