import type { TelemetryMetric } from '@prisma/client';

import { alertRepository } from '../repositories/alert.repository.js';
import { deviceHealthService } from '../services/device-health.service.js';
import { realtimeService } from '../sockets/realtime.service.js';
import { logger } from '../utils/logger.js';
import type { RuleAlert } from './types.js';

export class AlertManager {
  async reconcile(deviceId: string, metric: TelemetryMetric, ruleAlerts: RuleAlert[]) {
    const activeRuleKeys = new Set(ruleAlerts.map((alert) => alert.ruleKey));

    await Promise.all(ruleAlerts.map((alert) => this.raiseOrUpdate(deviceId, alert)));
    await this.resolveNormalizedAlerts(deviceId, metric, activeRuleKeys);
    await deviceHealthService.recalculate(deviceId);
  }

  private async raiseOrUpdate(deviceId: string, alert: RuleAlert) {
    const existingAlert = await alertRepository.findActiveRuleAlert({
      deviceId,
      metric: alert.metric,
      ruleKey: alert.ruleKey,
    });

    const input = {
      deviceId,
      metric: alert.metric,
      ruleKey: alert.ruleKey,
      severity: alert.severity,
      confidenceScore: alert.confidenceScore,
      title: alert.title,
      description: alert.description,
      reason: alert.reason,
      recommendation: alert.recommendation,
    };

    if (existingAlert) {
      if (!this.hasAlertChanged(existingAlert, alert)) {
        return;
      }

      const updatedAlert = await alertRepository.updateRuleAlert(existingAlert.id, input);
      realtimeService.broadcastAlertChange({
        action: 'updated',
        deviceId,
        alert: updatedAlert,
      });

      logger.info({
        message: 'Predictive maintenance alert updated',
        deviceId,
        metric: alert.metric,
        ruleKey: alert.ruleKey,
        severity: alert.severity,
        confidenceScore: alert.confidenceScore,
      });
      return;
    }

    const createdAlert = await alertRepository.createRuleAlert(input);
    realtimeService.broadcastAlertChange({
      action: 'created',
      deviceId,
      alert: createdAlert,
    });

    logger.warn({
      message: 'Predictive maintenance alert raised',
      deviceId,
      metric: alert.metric,
      ruleKey: alert.ruleKey,
      severity: alert.severity,
      confidenceScore: alert.confidenceScore,
      reason: alert.reason,
    });
  }

  private async resolveNormalizedAlerts(
    deviceId: string,
    metric: TelemetryMetric,
    activeRuleKeys: Set<string>,
  ) {
    const activeAlerts = await alertRepository.findActiveRuleAlertsForMetric(deviceId, metric);
    const resolvedAlerts = activeAlerts.filter(
      (alert) => alert.ruleKey !== null && !activeRuleKeys.has(alert.ruleKey),
    );

    await Promise.all(
      resolvedAlerts.map(async (alert) => {
        const resolvedAlert = await alertRepository.resolveAlert(
          alert.id,
          alert.status,
          'Metric normalized below sustained alert conditions.',
        );

        realtimeService.broadcastAlertChange({
          action: 'resolved',
          deviceId,
          alert: resolvedAlert,
        });
      }),
    );

    resolvedAlerts.forEach((alert) => {
      logger.info({
        message: 'Predictive maintenance alert resolved',
        deviceId,
        metric,
        ruleKey: alert.ruleKey,
      });
    });
  }

  private hasAlertChanged(
    existingAlert: NonNullable<Awaited<ReturnType<typeof alertRepository.findActiveRuleAlert>>>,
    nextAlert: RuleAlert,
  ) {
    return (
      existingAlert.severity !== nextAlert.severity ||
      existingAlert.confidenceScore !== nextAlert.confidenceScore ||
      existingAlert.title !== nextAlert.title ||
      existingAlert.description !== nextAlert.description ||
      existingAlert.reason !== nextAlert.reason ||
      existingAlert.recommendation !== nextAlert.recommendation
    );
  }
}

export const alertManager = new AlertManager();
