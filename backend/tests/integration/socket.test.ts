import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import type { Server as IoServer } from 'socket.io';
import { io as ioClient, type Socket } from 'socket.io-client';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { registerSockets } from '../../src/sockets/index.js';
import { realtimeService } from '../../src/sockets/realtime.service.js';
import { DEVICE_ID } from '../helpers/fixtures.js';

let httpServer: HttpServer;
let io: IoServer;
let url: string;
let client: Socket;
let handshake: { socketId?: string };

function waitFor<T = unknown>(socket: Socket, event: string, timeoutMs = 4_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for "${event}"`)), timeoutMs);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

beforeAll(async () => {
  httpServer = createServer();
  io = registerSockets(httpServer);
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  url = `http://localhost:${(httpServer.address() as AddressInfo).port}`;
});

afterAll(async () => {
  io.close();
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
});

beforeEach(async () => {
  const socket = ioClient(url, { transports: ['websocket'], forceNew: true });
  handshake = await new Promise((resolve, reject) => {
    socket.once('connected', resolve);
    socket.once('connect_error', reject);
  });
  client = socket;
});

afterEach(() => {
  client?.disconnect();
});

describe('Socket.IO realtime gateway', () => {
  it('sends a connected handshake with the socket id', () => {
    expect(client.connected).toBe(true);
    expect(handshake.socketId).toBeTruthy();
  });

  it('delivers dashboard broadcasts to connected clients', async () => {
    const received = waitFor<{ reason: string }>(client, 'dashboard:changed');
    realtimeService.broadcastDashboardChange({ reason: 'device-health-changed', deviceId: DEVICE_ID });
    expect(await received).toMatchObject({ reason: 'device-health-changed' });
  });

  it('delivers telemetry and alert broadcasts', async () => {
    const telemetry = waitFor<{ deviceId: string; value: number }>(client, 'telemetry:updated');
    realtimeService.broadcastTelemetry({
      deviceId: DEVICE_ID,
      metric: 'temperature',
      value: 74.1,
      timestamp: new Date('2026-01-02T00:00:00.000Z').toISOString(),
      telemetryId: 'telemetry-1',
    });
    expect(await telemetry).toMatchObject({ deviceId: DEVICE_ID, value: 74.1 });

    const alert = waitFor<{ action: string; deviceId: string }>(client, 'alerts:changed');
    realtimeService.broadcastAlertChange({ action: 'created', deviceId: DEVICE_ID, alert: { id: 'a1' } });
    expect(await alert).toMatchObject({ action: 'created', deviceId: DEVICE_ID });
  });

  it('lets a client subscribe to a device stream and receive its telemetry', async () => {
    client.emit('device:subscribe', DEVICE_ID);
    // Allow the server to process the room join before broadcasting.
    await new Promise((resolve) => setTimeout(resolve, 50));

    const received = waitFor<{ deviceId: string }>(client, 'device:healthChanged');
    realtimeService.broadcastDeviceHealthChange({
      deviceId: DEVICE_ID,
      healthScore: 62,
      status: 'WARNING',
      updatedAt: new Date('2026-01-02T00:00:00.000Z').toISOString(),
    });
    expect(await received).toMatchObject({ deviceId: DEVICE_ID, healthScore: 62 });
  });

  it('ignores subscription requests with an invalid device id without erroring', async () => {
    client.emit('device:subscribe', 'not-a-uuid');
    // The connection stays healthy and still receives fleet-wide broadcasts.
    const received = waitFor<{ reason: string }>(client, 'dashboard:changed');
    realtimeService.broadcastDashboardChange({ reason: 'still-connected' });
    expect(await received).toMatchObject({ reason: 'still-connected' });
    expect(client.connected).toBe(true);
  });
});
