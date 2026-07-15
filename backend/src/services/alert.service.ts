import { AlertStatus, Prisma } from '@prisma/client';

import { alertRepository } from '../repositories/alert.repository.js';
import { alertListQuerySchema } from '../validators/query.validator.js';
import { offsetFor, paginate } from '../utils/pagination.js';
import { serializeAlert } from '../utils/serializers.js';
import { logger } from '../utils/logger.js';

class AlertService {
  async getActiveAlerts(rawQuery: unknown) {
    const query = alertListQuerySchema.parse(rawQuery);
    return this.listAlerts(rawQuery, {
      status: {
        in: [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED],
      },
      deviceId: query.deviceId,
      severity: query.severity,
      metric: query.metric,
    });
  }

  async getResolvedAlerts(rawQuery: unknown) {
    const query = alertListQuerySchema.parse(rawQuery);
    return this.listAlerts(rawQuery, {
      status: AlertStatus.RESOLVED,
      deviceId: query.deviceId,
      severity: query.severity,
      metric: query.metric,
    });
  }

  private async listAlerts(rawQuery: unknown, where: Prisma.AlertWhereInput) {
    const query = alertListQuerySchema.parse(rawQuery);
    const orderBy = {
      [query.sortBy]: query.sortOrder,
    } satisfies Prisma.AlertOrderByWithRelationInput;

    const [alerts, total] = await Promise.all([
      alertRepository.list({
        where,
        orderBy,
        skip: offsetFor(query.page, query.pageSize),
        take: query.pageSize,
      }),
      alertRepository.count(where),
    ]);

    logger.info({
      message: 'Alerts requested',
      total,
      page: query.page,
      pageSize: query.pageSize,
      status: where.status,
    });

    return paginate(alerts.map(serializeAlert), query.page, query.pageSize, total);
  }
}

export const alertService = new AlertService();
