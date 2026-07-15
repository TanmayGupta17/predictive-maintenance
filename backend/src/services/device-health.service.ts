import { AlertSeverity, DeviceStatus } from '@prisma/client';

import {
  applyGradualRecovery,
  computeTargetHealth,
  healthModelConfiguration,
  snapshotDeviceFeatures,
} from '../analyzer/health-scoring.js';
import { alertRepository } from '../repositories/alert.repository.js';
import { deviceRepository } from '../repositories/device.repository.js';
import { realtimeService } from '../sockets/realtime.service.js';
import { logger } from '../utils/logger.js';

class DeviceHealthService {
  /**
   * Recomputes a device's health score from its live metric trends and alert
   * activity, then eases the stored score toward that target so health recovers
   * gradually once conditions normalize. Broadcasts and persists only when the
   * rounded score or status actually changes.
   */
  async recalculate(deviceId: string) {
    const device = await deviceRepository.findById(deviceId);

    if (!device) {
      return null;
    }

    const now = new Date();
    const since = new Date(now.getTime() - healthModelConfiguration.alerts.lookbackMs);

    const [activeAlerts, recentAlertCount, recentCriticalCount] = await Promise.all([
      alertRepository.getActiveAlertsByDevice(deviceId),
      alertRepository.countRecentAlerts(deviceId, since),
      alertRepository.countRecentCriticalAlerts(deviceId, since),
    ]);

    const features = snapshotDeviceFeatures(deviceId);
    const { target, breakdown } = computeTargetHealth({
      features,
      activeAlerts,
      recentAlertCount,
      recentCriticalCount,
    });

    const elapsedSeconds = (now.getTime() - device.updatedAt.getTime()) / 1_000;
    const healthScore = applyGradualRecovery(device.healthScore, target, elapsedSeconds);
    const hasCriticalAlert = activeAlerts.some((alert) => alert.severity === AlertSeverity.CRITICAL);
    const status = this.statusFor(healthScore, hasCriticalAlert);

    const updatedDevice = await deviceRepository.updateHealthIfChanged(deviceId, healthScore, status);

    if (!updatedDevice) {
      return null;
    }

    const payload = {
      deviceId,
      healthScore: updatedDevice.healthScore,
      status: updatedDevice.status,
      updatedAt: updatedDevice.updatedAt,
    };

    realtimeService.broadcastDeviceHealthChange(payload);
    realtimeService.broadcastDashboardChange({ reason: 'device-health-changed', deviceId });

    logger.info({
      message: 'Device health changed',
      deviceId,
      healthScore: updatedDevice.healthScore,
      target,
      status: updatedDevice.status,
      breakdown,
    });

    return updatedDevice;
  }

  private statusFor(healthScore: number, hasCriticalAlert: boolean) {
    if (hasCriticalAlert || healthScore < 50) {
      return DeviceStatus.CRITICAL;
    }

    if (healthScore < 80) {
      return DeviceStatus.WARNING;
    }

    return DeviceStatus.ONLINE;
  }
}

export const deviceHealthService = new DeviceHealthService();
