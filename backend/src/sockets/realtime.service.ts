import type { Server } from 'socket.io';

import { logger } from '../utils/logger.js';
import { socketEvents, socketRooms } from './events.js';

let io: Server | null = null;

type DeviceScopedPayload = {
  deviceId: string;
  [key: string]: unknown;
};

export function setRealtimeServer(server: Server) {
  io = server;
}

export const realtimeService = {
  broadcastTelemetry(payload: DeviceScopedPayload) {
    if (!io) {
      return;
    }

    io.to(socketRooms.fleet)
      .to(socketRooms.device(payload.deviceId))
      .emit(socketEvents.telemetryUpdated, payload);
  },

  broadcastAlertChange(payload: DeviceScopedPayload) {
    if (!io) {
      return;
    }

    io.to(socketRooms.alerts)
      .to(socketRooms.device(payload.deviceId))
      .emit(socketEvents.alertsChanged, payload);
  },

  broadcastDeviceHealthChange(payload: DeviceScopedPayload) {
    if (!io) {
      return;
    }

    io.to(socketRooms.fleet)
      .to(socketRooms.device(payload.deviceId))
      .emit(socketEvents.deviceHealthChanged, payload);
  },

  broadcastDashboardChange(payload: unknown) {
    if (!io) {
      return;
    }

    io.to(socketRooms.dashboard).emit(socketEvents.dashboardChanged, payload);
  },

  emitSimulatorAnomaly(payload: unknown) {
    if (!io) {
      logger.debug('Simulator anomaly skipped because realtime server is not ready');
      return;
    }

    io.to(socketRooms.dashboard).emit(socketEvents.simulatorAnomaly, payload);
  },
};
