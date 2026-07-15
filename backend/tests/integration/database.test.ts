import { AlertStatus, DeviceStatus, DeviceType, TelemetryMetric, type PrismaClient } from '@prisma/client';
import { mockReset, type DeepMockProxy } from 'vitest-mock-extended';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEVICE_ID, makeDevice, makeTelemetry } from '../helpers/fixtures.js';

vi.mock('../../src/config/prisma.js', async () => {
  const { mockDeep } = await import('vitest-mock-extended');
  return { prisma: mockDeep<PrismaClient>() };
});

import { prisma } from '../../src/config/prisma.js';
import { alertRepository } from '../../src/repositories/alert.repository.js';
import { deviceRepository } from '../../src/repositories/device.repository.js';
import { telemetryRepository } from '../../src/repositories/telemetry.repository.js';
import { serializeTelemetry } from '../../src/utils/serializers.js';

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

beforeEach(() => mockReset(prismaMock));

describe('data-access layer (query construction)', () => {
  it('lists devices with the supplied filters, ordering and pagination', async () => {
    prismaMock.device.findMany.mockResolvedValue([makeDevice()] as never);

    await deviceRepository.list({
      where: { status: DeviceStatus.ONLINE },
      orderBy: { healthScore: 'asc' },
      skip: 20,
      take: 10,
    });

    expect(prismaMock.device.findMany).toHaveBeenCalledWith({
      where: { status: DeviceStatus.ONLINE },
      orderBy: { healthScore: 'asc' },
      skip: 20,
      take: 10,
    });
  });

  it('groups devices by status', async () => {
    prismaMock.device.groupBy.mockResolvedValue([] as never);
    await deviceRepository.getStatusCounts();
    expect(prismaMock.device.groupBy).toHaveBeenCalledWith(expect.objectContaining({ by: ['status'] }));
  });

  it('selects only health scores for the risk distribution', async () => {
    prismaMock.device.findMany.mockResolvedValue([] as never);
    await deviceRepository.getAllHealthScores();
    expect(prismaMock.device.findMany).toHaveBeenCalledWith({ select: { healthScore: true } });
  });

  it('does not write when health and status are unchanged', async () => {
    prismaMock.device.findUnique.mockResolvedValue(
      makeDevice({ healthScore: 95, status: DeviceStatus.ONLINE }) as never,
    );

    const result = await deviceRepository.updateHealthIfChanged(DEVICE_ID, 95, DeviceStatus.ONLINE);

    expect(result).toBeNull();
    expect(prismaMock.device.update).not.toHaveBeenCalled();
  });

  it('writes when health or status changed', async () => {
    prismaMock.device.findUnique.mockResolvedValue(
      makeDevice({ healthScore: 95, status: DeviceStatus.ONLINE }) as never,
    );
    prismaMock.device.update.mockResolvedValue(
      makeDevice({ healthScore: 80, status: DeviceStatus.WARNING }) as never,
    );

    await deviceRepository.updateHealthIfChanged(DEVICE_ID, 80, DeviceStatus.WARNING);

    expect(prismaMock.device.update).toHaveBeenCalledWith({
      where: { id: DEVICE_ID },
      data: { healthScore: 80, status: DeviceStatus.WARNING },
    });
  });

  it('counts active alerts by OPEN/ACKNOWLEDGED status', async () => {
    prismaMock.alert.count.mockResolvedValue(5 as never);

    const total = await alertRepository.countActiveAlerts();

    expect(total).toBe(5);
    const where = prismaMock.alert.count.mock.calls[0]?.[0]?.where as { status?: { in?: string[] } };
    expect(where?.status?.in).toEqual([AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED]);
  });

  it('counts recent critical alerts within the lookback window', async () => {
    prismaMock.alert.count.mockResolvedValue(2 as never);
    const since = new Date('2026-01-01T00:00:00.000Z');

    await alertRepository.countRecentCriticalAlerts(DEVICE_ID, since);

    expect(prismaMock.alert.count).toHaveBeenCalledWith({
      where: { deviceId: DEVICE_ID, severity: 'CRITICAL', createdAt: { gte: since } },
    });
  });

  it('maps API metric names to persistence enums', () => {
    expect(telemetryRepository.toPersistenceMetric('temperature')).toBe(TelemetryMetric.TEMPERATURE);
    expect(telemetryRepository.toPersistenceMetric('vibration')).toBe(TelemetryMetric.VIBRATION);
  });

  it('serializes a Decimal telemetry value to a number', () => {
    const serialized = serializeTelemetry(makeTelemetry({ value: '72.5' }) as never);
    expect(serialized.value).toBe(72.5);
    expect(typeof serialized.value).toBe('number');
  });
});

/**
 * Real-database round trip. Skipped unless TEST_DATABASE_URL points at a
 * migrated Postgres instance (CI runs `prisma migrate deploy` first). This
 * exercises the actual driver, schema constraints and enum handling that the
 * mocked suites above cannot.
 */
describe.skipIf(!process.env.TEST_DATABASE_URL)('database round trip (real Postgres)', () => {
  let db: PrismaClient;
  const deviceId = '99999999-9999-4999-8999-999999999999';

  beforeAll(async () => {
    const { PrismaClient } = await import('@prisma/client');
    db = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL } } });
    await db.$connect();
    await db.telemetry.deleteMany({ where: { deviceId } });
    await db.alert.deleteMany({ where: { deviceId } });
    await db.device.deleteMany({ where: { id: deviceId } });
  });

  afterAll(async () => {
    if (!db) return;
    await db.telemetry.deleteMany({ where: { deviceId } });
    await db.alert.deleteMany({ where: { deviceId } });
    await db.device.deleteMany({ where: { id: deviceId } });
    await db.$disconnect();
  });

  it('persists and reads back a device, telemetry and an alert', async () => {
    await db.device.create({
      data: { id: deviceId, name: 'E2E Pump', type: DeviceType.PUMP, location: 'Test Bay', healthScore: 90 },
    });

    await db.telemetry.create({
      data: { deviceId, metric: TelemetryMetric.TEMPERATURE, value: 73.5, timestamp: new Date() },
    });

    const alert = await db.alert.create({
      data: {
        deviceId,
        metric: TelemetryMetric.TEMPERATURE,
        severity: 'WARNING',
        title: 'E2E alert',
        description: 'round trip',
        status: AlertStatus.OPEN,
      },
    });

    const latest = await db.telemetry.findFirst({ where: { deviceId }, orderBy: { timestamp: 'desc' } });
    expect(Number(latest?.value)).toBeCloseTo(73.5, 3);

    const resolved = await db.alert.update({
      where: { id: alert.id },
      data: { status: AlertStatus.RESOLVED, resolvedAt: new Date() },
    });
    expect(resolved.status).toBe(AlertStatus.RESOLVED);

    const activeCount = await db.alert.count({
      where: { deviceId, status: { in: [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED] } },
    });
    expect(activeCount).toBe(0);
  });
});
