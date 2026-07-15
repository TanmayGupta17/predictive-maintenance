import type { TelemetryReading } from '../types/telemetry.js';
import { logger } from '../utils/logger.js';
import { analyzerConfiguration } from './configuration.js';
import { prismaMetricByAnalyzerMetric } from './metric-mapping.js';
import { alertManager } from './alert-manager.js';
import { ruleEngine } from './rule-engine.js';
import { slidingWindowStore } from './sliding-window.js';

class TelemetryAnalyzer {
  async analyze(reading: TelemetryReading) {
    const window = slidingWindowStore.add(reading);
    const prismaMetric = prismaMetricByAnalyzerMetric[reading.metric];

    if (window.length < analyzerConfiguration.minimumSamples) {
      return [];
    }

    const alerts = ruleEngine.evaluate(reading.deviceId, window);

    await alertManager.reconcile(reading.deviceId, prismaMetric, alerts);

    if (alerts.length > 0) {
      logger.warn({
        message: 'Telemetry analyzer produced rule alerts',
        deviceId: reading.deviceId,
        metric: reading.metric,
        alertCount: alerts.length,
      });
    }

    return alerts;
  }
}

export const telemetryAnalyzer = new TelemetryAnalyzer();
