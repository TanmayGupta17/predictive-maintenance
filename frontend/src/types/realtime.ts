export type RealtimeTelemetryPayload = {
  deviceId: string;
  telemetryId: string;
  metric: string;
  value: number;
  timestamp: string;
};

export type RealtimeAlertPayload = {
  action: 'created' | 'updated' | 'resolved';
  deviceId: string;
  alert: unknown;
};

export type RealtimeDeviceHealthPayload = {
  deviceId: string;
  healthScore: number;
  status: string;
  updatedAt: string;
};

export type RealtimeDashboardPayload = {
  reason: string;
  deviceId?: string;
};

export const realtimeEvents = {
  telemetryUpdated: 'telemetry:updated',
  alertsChanged: 'alerts:changed',
  deviceHealthChanged: 'device:healthChanged',
  dashboardChanged: 'dashboard:changed',
  simulatorAnomaly: 'simulator:anomaly',
  subscribeDevice: 'device:subscribe',
  unsubscribeDevice: 'device:unsubscribe',
} as const;
