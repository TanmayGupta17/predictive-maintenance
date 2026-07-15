export const socketEvents = {
  telemetryUpdated: 'telemetry:updated',
  alertsChanged: 'alerts:changed',
  deviceHealthChanged: 'device:healthChanged',
  dashboardChanged: 'dashboard:changed',
  simulatorAnomaly: 'simulator:anomaly',
  subscribeDevice: 'device:subscribe',
  unsubscribeDevice: 'device:unsubscribe',
} as const;

export const socketRooms = {
  fleet: 'fleet',
  alerts: 'alerts',
  dashboard: 'dashboard',
  device: (deviceId: string) => `device:${deviceId}`,
} as const;
