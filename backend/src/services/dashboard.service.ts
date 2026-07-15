import { AlertSeverity, DeviceStatus } from '@prisma/client';

import { buildRiskDistribution, classifyRisk } from '../analyzer/health-scoring.js';
import { alertRepository } from '../repositories/alert.repository.js';
import { deviceRepository } from '../repositories/device.repository.js';
import { paginationQuerySchema } from '../validators/query.validator.js';
import { serializeAlert, serializeDevice } from '../utils/serializers.js';
import { logger } from '../utils/logger.js';

const severityRiskWeight: Record<AlertSeverity, number> = {
  INFO: 10,
  WARNING: 35,
  CRITICAL: 70,
};

class DashboardService {
  async getDashboard(rawQuery: unknown) {
    const query = paginationQuerySchema.parse(rawQuery);
    const limit = query.pageSize;

    const [
      statusCounts,
      averageHealthScore,
      recentFailures,
      activeAlerts,
      lowestHealthDevices,
      activeAlertCount,
      healthScores,
    ] = await Promise.all([
      deviceRepository.getStatusCounts(),
      deviceRepository.getAverageHealthScore(),
      alertRepository.getRecentResolvedAlerts(limit),
      alertRepository.getActiveAlertsForDashboard(100),
      deviceRepository.getLowestHealthDevices(limit),
      alertRepository.countActiveAlerts(),
      deviceRepository.getAllHealthScores(),
    ]);

    const counts = this.toStatusCounts(statusCounts);
    const dashboard = {
      healthyCount: counts[DeviceStatus.ONLINE] ?? 0,
      warningCount: counts[DeviceStatus.WARNING] ?? 0,
      criticalCount: counts[DeviceStatus.CRITICAL] ?? 0,
      averageHealthScore: averageHealthScore._avg.healthScore ?? 0,
      activeAlertCount,
      mostCriticalDevice: this.getMostCriticalDevice(lowestHealthDevices, activeAlerts),
      riskDistribution: buildRiskDistribution(healthScores.map((device) => device.healthScore)),
      recentFailures: recentFailures.map(serializeAlert),
      topRiskyDevices: this.getTopRiskyDevices(activeAlerts, lowestHealthDevices, limit),
    };

    logger.info({
      message: 'Dashboard requested',
      healthyCount: dashboard.healthyCount,
      warningCount: dashboard.warningCount,
      criticalCount: dashboard.criticalCount,
      activeAlertCount,
    });

    return dashboard;
  }

  private getMostCriticalDevice(
    lowestHealthDevices: Awaited<ReturnType<typeof deviceRepository.getLowestHealthDevices>>,
    activeAlerts: Awaited<ReturnType<typeof alertRepository.getActiveAlertsForDashboard>>,
  ) {
    const candidate = lowestHealthDevices[0];

    if (!candidate) {
      return null;
    }

    const activeAlertCount = activeAlerts.filter((alert) => alert.deviceId === candidate.id).length;

    return {
      device: serializeDevice(candidate),
      healthScore: candidate.healthScore,
      riskScore: 100 - candidate.healthScore,
      riskLevel: classifyRisk(candidate.healthScore),
      activeAlertCount,
    };
  }

  private toStatusCounts(
    statusCounts: Array<{ status: DeviceStatus; _count: { status: number } }>,
  ) {
    return statusCounts.reduce<Partial<Record<DeviceStatus, number>>>((counts, item) => {
      counts[item.status] = item._count.status;
      return counts;
    }, {});
  }

  private getTopRiskyDevices(
    activeAlerts: Awaited<ReturnType<typeof alertRepository.getActiveAlertsForDashboard>>,
    lowestHealthDevices: Awaited<ReturnType<typeof deviceRepository.getLowestHealthDevices>>,
    limit: number,
  ) {
    const risks = new Map<
      string,
      {
        device: (typeof activeAlerts)[number]['device'];
        riskScore: number;
        activeAlertCount: number;
      }
    >();

    activeAlerts.forEach((alert) => {
      const current = risks.get(alert.deviceId) ?? {
        device: alert.device,
        riskScore: 100 - alert.device.healthScore,
        activeAlertCount: 0,
      };

      current.riskScore +=
        severityRiskWeight[alert.severity] + Math.round((alert.confidenceScore ?? 0) / 10);
      current.activeAlertCount += 1;
      risks.set(alert.deviceId, current);
    });

    lowestHealthDevices.forEach((device) => {
      if (!risks.has(device.id)) {
        risks.set(device.id, {
          device: serializeDevice(device),
          riskScore: 100 - device.healthScore,
          activeAlertCount: 0,
        });
      }
    });

    return [...risks.values()]
      .sort((left, right) => right.riskScore - left.riskScore)
      .slice(0, limit);
  }
}

export const dashboardService = new DashboardService();
