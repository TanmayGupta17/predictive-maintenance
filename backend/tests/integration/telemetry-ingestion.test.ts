import { type PrismaClient } from '@prisma/client';
import { mockReset, type DeepMockProxy } from 'vitest-mock-extended';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEVICE_ID, makeTelemetry } from '../helpers/fixtures.js';

vi.mock('../../src/config/prisma.js', async () => {
  const { mockDeep } = await import('vitest-mock-extended');
  return { prisma: mockDeep<PrismaClient>() };
});

import { telemetryAnalyzer } from '../../src/analyzer/index.js';
import { prisma } from '../../src/config/prisma.js';
import { telemetryIngestionService } from '../../src/services/telemetry-ingestion.service.js';
import { realtimeService } from '../../src/sockets/realtime.service.js';

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

const broadcastSpy = vi.spyOn(realtimeService, 'broadcastTelemetry');
// The analyzer has its own unit coverage; here we only assert ingestion invokes it.
const analyzeSpy = vi.spyOn(telemetryAnalyzer, 'analyze');

function payload(overrides: Record<string, unknown> = {}) {
  return {
    deviceId: DEVICE_ID,
    metric: 'temperature',
    value: 73.5,
    timestamp: '2026-01-02T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  mockReset(prismaMock);
  broadcastSpy.mockClear();
  analyzeSpy.mockReset();
  analyzeSpy.mockResolvedValue([]);
});

describe('telemetryIngestionService.ingest', () => {
  it('persists a new reading, broadcasts it, and runs the analyzer', async () => {
    prismaMock.device.findUnique.mockResolvedValue({ id: DEVICE_ID } as never); // exists
    prismaMock.telemetry.findUnique.mockResolvedValue(null as never); // no duplicate
    prismaMock.telemetry.findFirst.mockResolvedValue(null as never); // no prior reading
    prismaMock.telemetry.create.mockResolvedValue(makeTelemetry() as never);

    const result = await telemetryIngestionService.ingest(payload());

    expect(result.duplicate).toBe(false);
    expect(result.late).toBe(false);
    expect(prismaMock.telemetry.create).toHaveBeenCalledTimes(1);
    expect(broadcastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ deviceId: DEVICE_ID, metric: 'temperature', value: 73.5 }),
    );
    expect(analyzeSpy).toHaveBeenCalledTimes(1);
  });

  it('ignores a duplicate reading without persisting or broadcasting', async () => {
    prismaMock.device.findUnique.mockResolvedValue({ id: DEVICE_ID } as never);
    prismaMock.telemetry.findUnique.mockResolvedValue(makeTelemetry() as never); // duplicate exists
    prismaMock.telemetry.findFirst.mockResolvedValue(makeTelemetry() as never);

    const result = await telemetryIngestionService.ingest(payload());

    expect(result.duplicate).toBe(true);
    expect(prismaMock.telemetry.create).not.toHaveBeenCalled();
    expect(broadcastSpy).not.toHaveBeenCalled();
  });

  it('accepts and flags a late (out-of-order) reading', async () => {
    prismaMock.device.findUnique.mockResolvedValue({ id: DEVICE_ID } as never);
    prismaMock.telemetry.findUnique.mockResolvedValue(null as never);
    // Latest stored reading is newer than the incoming one => late.
    prismaMock.telemetry.findFirst.mockResolvedValue(
      makeTelemetry({ timestamp: new Date('2026-01-02T01:00:00.000Z') }) as never,
    );
    prismaMock.telemetry.create.mockResolvedValue(makeTelemetry() as never);

    const result = await telemetryIngestionService.ingest(payload());

    expect(result.late).toBe(true);
    expect(result.duplicate).toBe(false);
    expect(prismaMock.telemetry.create).toHaveBeenCalledTimes(1);
  });

  it('rejects telemetry for an unknown device with a 404', async () => {
    prismaMock.device.findUnique.mockResolvedValue(null as never); // does not exist

    await expect(telemetryIngestionService.ingest(payload())).rejects.toMatchObject({ statusCode: 404 });
    expect(prismaMock.telemetry.create).not.toHaveBeenCalled();
  });

  it('rejects a structurally invalid payload', async () => {
    await expect(
      telemetryIngestionService.ingest({ metric: 'temperature', value: 10 }),
    ).rejects.toBeInstanceOf(Error);
    expect(prismaMock.device.findUnique).not.toHaveBeenCalled();
  });
});
