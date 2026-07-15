import { AlertStatus, DeviceStatus, DeviceType, type PrismaClient } from '@prisma/client';
import request from 'supertest';
import { mockReset, type DeepMockProxy } from 'vitest-mock-extended';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEVICE_ID, makeAlert, makeDevice, makeTelemetry } from '../helpers/fixtures.js';

vi.mock('../../src/config/prisma.js', async () => {
  const { mockDeep } = await import('vitest-mock-extended');
  return { prisma: mockDeep<PrismaClient>() };
});

import { createApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;
const app = createApp();

beforeEach(() => {
  mockReset(prismaMock);
});

describe('GET /api/health', () => {
  it('returns ok', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});

describe('GET /api/devices', () => {
  beforeEach(() => {
    prismaMock.device.findMany.mockResolvedValue([makeDevice()] as never);
    prismaMock.device.count.mockResolvedValue(1 as never);
    prismaMock.device.groupBy.mockResolvedValue([{ status: DeviceStatus.ONLINE, _count: { status: 1 } }] as never);
    prismaMock.device.aggregate.mockResolvedValue({ _avg: { healthScore: 95 } } as never);
  });

  it('returns a paginated fleet summary', async () => {
    const response = await request(app).get('/api/devices').query({ pageSize: 50 });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe(DEVICE_ID);
    expect(response.body.summary).toMatchObject({ total: 1, averageHealthScore: 95 });
    expect(response.body.pagination).toMatchObject({ page: 1, pageSize: 50, total: 1 });
  });

  it('accepts status/search filters and forwards them to the query', async () => {
    const response = await request(app).get('/api/devices').query({ status: 'online', search: 'pump' });

    expect(response.status).toBe(200);
    const passedArgs = prismaMock.device.findMany.mock.calls[0]?.[0];
    expect(passedArgs?.where).toMatchObject({ status: DeviceStatus.ONLINE });
  });

  it('rejects invalid pagination with 400', async () => {
    const response = await request(app).get('/api/devices').query({ pageSize: 0 });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid request payload');
  });
});

describe('GET /api/devices/:id', () => {
  it('returns the device with its latest metrics', async () => {
    prismaMock.device.findUnique.mockResolvedValue(makeDevice() as never);
    prismaMock.telemetry.findMany.mockResolvedValue([
      makeTelemetry({ metric: 'TEMPERATURE', value: 73.2 }),
    ] as never);

    const response = await request(app).get(`/api/devices/${DEVICE_ID}`);

    expect(response.status).toBe(200);
    expect(response.body.device.id).toBe(DEVICE_ID);
    expect(response.body.latestMetrics.TEMPERATURE.value).toBe(73.2);
  });

  it('returns 404 when the device does not exist', async () => {
    prismaMock.device.findUnique.mockResolvedValue(null as never);

    const response = await request(app).get(`/api/devices/${DEVICE_ID}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Device not found');
  });

  it('returns 400 for a malformed device id', async () => {
    const response = await request(app).get('/api/devices/not-a-uuid');
    expect(response.status).toBe(400);
  });
});

describe('GET /api/devices/:id/history', () => {
  it('returns paginated telemetry history', async () => {
    prismaMock.device.findUnique.mockResolvedValue(makeDevice() as never);
    prismaMock.telemetry.findMany.mockResolvedValue([makeTelemetry({ value: 71 })] as never);
    prismaMock.telemetry.count.mockResolvedValue(1 as never);

    const response = await request(app)
      .get(`/api/devices/${DEVICE_ID}/history`)
      .query({ metric: 'temperature', pageSize: 100 });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].value).toBe(71);
    expect(response.body.pagination.total).toBe(1);
  });
});

describe('GET /api/alerts', () => {
  it('returns active alerts', async () => {
    prismaMock.alert.findMany.mockResolvedValue([makeAlert()] as never);
    prismaMock.alert.count.mockResolvedValue(1 as never);

    const response = await request(app).get('/api/alerts');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].severity).toBe('WARNING');
    // Active-alert query targets OPEN/ACKNOWLEDGED records.
    const where = prismaMock.alert.findMany.mock.calls[0]?.[0]?.where as { status?: { in?: string[] } };
    expect(where?.status?.in).toEqual([AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED]);
  });

  it('returns resolved alert history', async () => {
    prismaMock.alert.findMany.mockResolvedValue([makeAlert({ status: 'RESOLVED', resolvedAt: new Date() })] as never);
    prismaMock.alert.count.mockResolvedValue(1 as never);

    const response = await request(app).get('/api/alerts/history');

    expect(response.status).toBe(200);
    expect(response.body.data[0].status).toBe('RESOLVED');
    const where = prismaMock.alert.findMany.mock.calls[0]?.[0]?.where as { status?: string };
    expect(where?.status).toBe(AlertStatus.RESOLVED);
  });
});

describe('GET /api/dashboard', () => {
  beforeEach(() => {
    prismaMock.device.groupBy.mockResolvedValue([
      { status: DeviceStatus.ONLINE, _count: { status: 3 } },
      { status: DeviceStatus.WARNING, _count: { status: 1 } },
      { status: DeviceStatus.CRITICAL, _count: { status: 1 } },
    ] as never);
    prismaMock.device.aggregate.mockResolvedValue({ _avg: { healthScore: 78.4 } } as never);
    prismaMock.alert.count.mockResolvedValue(2 as never);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prismaMock.alert.findMany as any).mockImplementation((args: any) => {
      if (args?.where?.status === AlertStatus.RESOLVED) {
        return Promise.resolve([makeAlert({ status: 'RESOLVED', resolvedAt: new Date() })]);
      }
      return Promise.resolve([
        makeAlert({
          device: { id: DEVICE_ID, name: 'Pump A1', type: DeviceType.PUMP, location: 'Plant 1', healthScore: 35 },
        }),
      ]);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prismaMock.device.findMany as any).mockImplementation((args: any) => {
      if (args?.select?.healthScore) {
        return Promise.resolve([{ healthScore: 95 }, { healthScore: 88 }, { healthScore: 72 }, { healthScore: 60 }, { healthScore: 35 }]);
      }
      return Promise.resolve([makeDevice({ id: DEVICE_ID, healthScore: 35, status: DeviceStatus.CRITICAL })]);
    });
  });

  it('aggregates fleet health, active alerts, most-critical device and risk distribution', async () => {
    const response = await request(app).get('/api/dashboard');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      healthyCount: 3,
      warningCount: 1,
      criticalCount: 1,
      averageHealthScore: 78.4,
      activeAlertCount: 2,
    });
    expect(response.body.riskDistribution).toEqual({ LOW: 2, MODERATE: 1, HIGH: 1, CRITICAL: 1, total: 5 });
    expect(response.body.mostCriticalDevice).toMatchObject({
      healthScore: 35,
      riskLevel: 'CRITICAL',
    });
    expect(response.body.mostCriticalDevice.device.id).toBe(DEVICE_ID);
    expect(Array.isArray(response.body.recentFailures)).toBe(true);
    expect(Array.isArray(response.body.topRiskyDevices)).toBe(true);
  });
});

describe('unknown routes', () => {
  it('returns 404 for an unmapped path', async () => {
    const response = await request(app).get('/api/does-not-exist');
    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Not found');
  });
});
