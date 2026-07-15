import { Prisma, TelemetryMetric } from '@prisma/client';

import { deviceRepository } from '../repositories/device.repository.js';
import { telemetryRepository } from '../repositories/telemetry.repository.js';
import {
  deviceIdParamSchema,
  deviceListQuerySchema,
  telemetryHistoryQuerySchema,
} from '../validators/query.validator.js';
import { HttpError } from '../utils/http-error.js';
import { offsetFor, paginate } from '../utils/pagination.js';
import { serializeDevice, serializeTelemetry } from '../utils/serializers.js';
import { logger } from '../utils/logger.js';

class DeviceService {
  async getFleetSummary(rawQuery: unknown) {
    const query = deviceListQuerySchema.parse(rawQuery);
    const where = this.buildDeviceWhere(query);
    const orderBy = {
      [query.sortBy]: query.sortOrder,
    } satisfies Prisma.DeviceOrderByWithRelationInput;

    const [devices, total, statusCounts, averageHealthScore] = await Promise.all([
      deviceRepository.list({
        where,
        orderBy,
        skip: offsetFor(query.page, query.pageSize),
        take: query.pageSize,
      }),
      deviceRepository.count(where),
      deviceRepository.getStatusCounts(),
      deviceRepository.getAverageHealthScore(),
    ]);

    logger.info({
      message: 'Fleet summary requested',
      total,
      page: query.page,
      pageSize: query.pageSize,
    });

    return {
      summary: {
        total,
        averageHealthScore: averageHealthScore._avg.healthScore ?? 0,
        statusCounts: statusCounts.reduce<Record<string, number>>((counts, item) => {
          counts[item.status] = item._count.status;
          return counts;
        }, {}),
      },
      ...paginate(devices.map(serializeDevice), query.page, query.pageSize, total),
    };
  }

  async getDeviceWithLatestMetrics(rawParams: unknown) {
    const { id } = deviceIdParamSchema.parse(rawParams);
    const device = await deviceRepository.findById(id);

    if (!device) {
      throw new HttpError(404, 'Device not found', { id });
    }

    const telemetry = await telemetryRepository.findLatestByDevice(id);
    const latestMetrics = new Map<TelemetryMetric, ReturnType<typeof serializeTelemetry>>();

    telemetry.forEach((reading) => {
      if (!latestMetrics.has(reading.metric)) {
        latestMetrics.set(reading.metric, serializeTelemetry(reading));
      }
    });

    return {
      device: serializeDevice(device),
      latestMetrics: Object.fromEntries(latestMetrics),
    };
  }

  async getDeviceHistory(rawParams: unknown, rawQuery: unknown) {
    const { id } = deviceIdParamSchema.parse(rawParams);
    const query = telemetryHistoryQuerySchema.parse(rawQuery);
    const device = await deviceRepository.findById(id);

    if (!device) {
      throw new HttpError(404, 'Device not found', { id });
    }

    const timestampFilter =
      query.start || query.end
        ? {
            gte: query.start,
            lte: query.end,
          }
        : undefined;
    const where: Prisma.TelemetryWhereInput = {
      deviceId: id,
      metric: query.metric,
      timestamp: timestampFilter,
    };
    const orderBy = {
      [query.sortBy]: query.sortOrder,
    } satisfies Prisma.TelemetryOrderByWithRelationInput;

    const [history, total] = await Promise.all([
      telemetryRepository.listHistory({
        where,
        orderBy,
        skip: offsetFor(query.page, query.pageSize),
        take: query.pageSize,
      }),
      telemetryRepository.countHistory(where),
    ]);

    logger.info({
      message: 'Device telemetry history requested',
      deviceId: id,
      total,
      page: query.page,
      pageSize: query.pageSize,
    });

    return paginate(history.map(serializeTelemetry), query.page, query.pageSize, total);
  }

  private buildDeviceWhere(query: ReturnType<typeof deviceListQuerySchema.parse>) {
    const where: Prisma.DeviceWhereInput = {
      status: query.status,
      type: query.type,
      location: query.location
        ? {
            contains: query.location,
            mode: 'insensitive',
          }
        : undefined,
    };

    if (query.search) {
      where.OR = [
        {
          name: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          location: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    return where;
  }
}

export const deviceService = new DeviceService();
