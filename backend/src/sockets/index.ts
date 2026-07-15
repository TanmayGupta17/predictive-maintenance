import type { Server as HttpServer } from 'node:http';

import { Server } from 'socket.io';

import { env } from '../config/env.js';
import { socketEvents, socketRooms } from './events.js';
import { setRealtimeServer } from './realtime.service.js';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function registerSockets(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
    },
  });

  io.on('connection', (socket) => {
    void socket.join([socketRooms.fleet, socketRooms.alerts, socketRooms.dashboard]);

    socket.emit('connected', { socketId: socket.id });

    socket.on(socketEvents.subscribeDevice, (deviceId: unknown) => {
      if (typeof deviceId === 'string' && uuidPattern.test(deviceId)) {
        void socket.join(socketRooms.device(deviceId));
      }
    });

    socket.on(socketEvents.unsubscribeDevice, (deviceId: unknown) => {
      if (typeof deviceId === 'string' && uuidPattern.test(deviceId)) {
        void socket.leave(socketRooms.device(deviceId));
      }
    });
  });

  setRealtimeServer(io);

  return io;
}
