import { AlertSeverity, AlertStatus, TelemetryMetric } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RuleAlert } from '../../src/analyzer/types.js';
import { ALERT_ID, DEVICE_ID, makeAlert } from '../helpers/fixtures.js';

vi.mock('../../src/repositories/alert.repository.js', () => ({
  alertRepository: {
    findActiveRuleAlert: vi.fn(),
    createRuleAlert: vi.fn(),
    updateRuleAlert: vi.fn(),
    findActiveRuleAlertsForMetric: vi.fn(),
    resolveAlert: vi.fn(),
  },
}));

vi.mock('../../src/services/device-health.service.js', () => ({
  deviceHealthService: { recalculate: vi.fn() },
}));

vi.mock('../../src/sockets/realtime.service.js', () => ({
  realtimeService: { broadcastAlertChange: vi.fn() },
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { alertManager } = await import('../../src/analyzer/alert-manager.js');
const { alertRepository } = await import('../../src/repositories/alert.repository.js');
const { deviceHealthService } = await import('../../src/services/device-health.service.js');
const { realtimeService } = await import('../../src/sockets/realtime.service.js');

const repo = vi.mocked(alertRepository);
const health = vi.mocked(deviceHealthService);
const realtime = vi.mocked(realtimeService);

const ruleAlert: RuleAlert = {
  ruleKey: 'temperature-sustained-rise',
  metric: TelemetryMetric.TEMPERATURE,
  severity: AlertSeverity.WARNING,
  confidenceScore: 88,
  title: 'Sustained temperature rise detected',
  description: 'Possible cooling failure or excessive thermal load.',
  reason: 'Temperature has increased continuously.',
  recommendation: 'Inspect cooling systems.',
};

const matchingActiveAlert = makeAlert({
  severity: ruleAlert.severity,
  confidenceScore: ruleAlert.confidenceScore,
  title: ruleAlert.title,
  description: ruleAlert.description,
  reason: ruleAlert.reason,
  recommendation: ruleAlert.recommendation,
});

beforeEach(() => {
  vi.clearAllMocks();
  repo.findActiveRuleAlertsForMetric.mockResolvedValue([]);
  health.recalculate.mockResolvedValue(null);
});

describe('AlertManager.reconcile', () => {
  it('creates a new alert and broadcasts it when none is active', async () => {
    repo.findActiveRuleAlert.mockResolvedValue(null);
    repo.createRuleAlert.mockResolvedValue(makeAlert() as never);

    await alertManager.reconcile(DEVICE_ID, TelemetryMetric.TEMPERATURE, [ruleAlert]);

    expect(repo.createRuleAlert).toHaveBeenCalledTimes(1);
    expect(repo.createRuleAlert).toHaveBeenCalledWith(
      expect.objectContaining({ deviceId: DEVICE_ID, ruleKey: ruleAlert.ruleKey, severity: ruleAlert.severity }),
    );
    expect(repo.updateRuleAlert).not.toHaveBeenCalled();
    expect(realtime.broadcastAlertChange).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'created', deviceId: DEVICE_ID }),
    );
    expect(health.recalculate).toHaveBeenCalledWith(DEVICE_ID);
  });

  it('skips the write when the active alert is unchanged', async () => {
    repo.findActiveRuleAlert.mockResolvedValue(matchingActiveAlert as never);
    repo.findActiveRuleAlertsForMetric.mockResolvedValue([matchingActiveAlert] as never);

    await alertManager.reconcile(DEVICE_ID, TelemetryMetric.TEMPERATURE, [ruleAlert]);

    expect(repo.createRuleAlert).not.toHaveBeenCalled();
    expect(repo.updateRuleAlert).not.toHaveBeenCalled();
    expect(realtime.broadcastAlertChange).not.toHaveBeenCalled();
    // Health is still recomputed on every reconcile pass.
    expect(health.recalculate).toHaveBeenCalledWith(DEVICE_ID);
  });

  it('updates and rebroadcasts when the active alert changed severity', async () => {
    const changedAlert = makeAlert({ severity: AlertSeverity.CRITICAL, confidenceScore: 94 });
    repo.findActiveRuleAlert.mockResolvedValue(changedAlert as never);
    repo.findActiveRuleAlertsForMetric.mockResolvedValue([changedAlert] as never);
    repo.updateRuleAlert.mockResolvedValue(makeAlert() as never);

    await alertManager.reconcile(DEVICE_ID, TelemetryMetric.TEMPERATURE, [ruleAlert]);

    expect(repo.updateRuleAlert).toHaveBeenCalledWith(ALERT_ID, expect.objectContaining({ ruleKey: ruleAlert.ruleKey }));
    expect(repo.createRuleAlert).not.toHaveBeenCalled();
    expect(realtime.broadcastAlertChange).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'updated', deviceId: DEVICE_ID }),
    );
  });

  it('resolves active alerts whose condition has normalized', async () => {
    const staleAlert = makeAlert({ ruleKey: 'temperature-sustained-rise', status: AlertStatus.OPEN });
    repo.findActiveRuleAlertsForMetric.mockResolvedValue([staleAlert] as never);
    repo.resolveAlert.mockResolvedValue(makeAlert({ status: AlertStatus.RESOLVED }) as never);

    // No rule alerts this pass => the previously active rule is now normalized.
    await alertManager.reconcile(DEVICE_ID, TelemetryMetric.TEMPERATURE, []);

    expect(repo.resolveAlert).toHaveBeenCalledWith(ALERT_ID, AlertStatus.OPEN, expect.any(String));
    expect(realtime.broadcastAlertChange).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'resolved', deviceId: DEVICE_ID }),
    );
    expect(health.recalculate).toHaveBeenCalledWith(DEVICE_ID);
  });
});
