import { Prisma, TelemetryMetric } from '@prisma/client';

import { prisma } from '../config/prisma.js';
import type { TelemetryReading } from '../types/telemetry.js';

const prismaMetricByApiMetric: Record<TelemetryReading['metric'], TelemetryMetric> = {
  temperature: TelemetryMetric.TEMPERATURE,
  vibration: TelemetryMetric.VIBRATION,
  power: TelemetryMetric.POWER,
  pressure: TelemetryMetric.PRESSURE,
  humidity: TelemetryMetric.HUMIDITY,
};

class TelemetryRepository {
  toPersistenceMetric(metric: TelemetryReading['metric']) {
    return prismaMetricByApiMetric[metric];
  }

  async create(reading: TelemetryReading) {
    return prisma.telemetry.create({
      data: {
        deviceId: reading.deviceId,
        metric: this.toPersistenceMetric(reading.metric),
        value: reading.value,
        timestamp: reading.timestamp,
      },
    });
  }

  async findDuplicate(reading: TelemetryReading) {
    return prisma.telemetry.findUnique({
      where: {
        deviceId_metric_timestamp: {
          deviceId: reading.deviceId,
          metric: this.toPersistenceMetric(reading.metric),
          timestamp: reading.timestamp,
        },
      },
    });
  }

  async findLatestForDeviceMetric(deviceId: string, metric: TelemetryReading['metric']) {
    return prisma.telemetry.findFirst({
      where: {
        deviceId,
        metric: this.toPersistenceMetric(metric),
      },
      orderBy: {
        timestamp: 'desc',
      },
    });
  }

  async findLatestByDevice(deviceId: string) {
    return prisma.telemetry.findMany({
      where: {
        deviceId,
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 50,
    });
  }

  async listHistory(params: {
    where: Prisma.TelemetryWhereInput;
    orderBy: Prisma.TelemetryOrderByWithRelationInput;
    skip: number;
    take: number;
  }) {
    return prisma.telemetry.findMany({
      where: params.where,
      orderBy: params.orderBy,
      skip: params.skip,
      take: params.take,
    });
  }

  async countHistory(where: Prisma.TelemetryWhereInput) {
    return prisma.telemetry.count({ where });
  }

  isUniqueConstraintError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}

export const telemetryRepository = new TelemetryRepository();
