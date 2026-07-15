import { AlertHistoryAction, AlertSeverity, AlertStatus, TelemetryMetric } from '@prisma/client';
import type { Prisma } from '@prisma/client';

import { prisma } from '../config/prisma.js';

export type ActiveAlertLookup = {
  deviceId: string;
  metric: TelemetryMetric;
  ruleKey: string;
};

export type CreateRuleAlertInput = {
  deviceId: string;
  metric: TelemetryMetric;
  ruleKey: string;
  severity: AlertSeverity;
  confidenceScore: number;
  title: string;
  description: string;
  reason: string;
  recommendation: string;
};

class AlertRepository {
  async list(params: {
    where: Prisma.AlertWhereInput;
    orderBy: Prisma.AlertOrderByWithRelationInput;
    skip: number;
    take: number;
  }) {
    return prisma.alert.findMany({
      where: params.where,
      orderBy: params.orderBy,
      skip: params.skip,
      take: params.take,
      include: {
        device: {
          select: {
            id: true,
            name: true,
            type: true,
            location: true,
          },
        },
      },
    });
  }

  async count(where: Prisma.AlertWhereInput) {
    return prisma.alert.count({ where });
  }

  async getActiveAlertsForDashboard(limit: number) {
    return prisma.alert.findMany({
      where: {
        status: {
          in: [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED],
        },
      },
      orderBy: [
        {
          severity: 'desc',
        },
        {
          confidenceScore: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
      take: limit,
      include: {
        device: {
          select: {
            id: true,
            name: true,
            type: true,
            location: true,
            healthScore: true,
          },
        },
      },
    });
  }

  async getRecentResolvedAlerts(limit: number) {
    return prisma.alert.findMany({
      where: {
        status: AlertStatus.RESOLVED,
      },
      orderBy: {
        resolvedAt: 'desc',
      },
      take: limit,
      include: {
        device: {
          select: {
            id: true,
            name: true,
            type: true,
            location: true,
          },
        },
      },
    });
  }

  async countActiveAlerts() {
    return prisma.alert.count({
      where: {
        status: {
          in: [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED],
        },
      },
    });
  }

  async countRecentAlerts(deviceId: string, since: Date) {
    return prisma.alert.count({
      where: {
        deviceId,
        createdAt: {
          gte: since,
        },
      },
    });
  }

  async countRecentCriticalAlerts(deviceId: string, since: Date) {
    return prisma.alert.count({
      where: {
        deviceId,
        severity: AlertSeverity.CRITICAL,
        createdAt: {
          gte: since,
        },
      },
    });
  }

  async getActiveAlertsByDevice(deviceId: string) {
    return prisma.alert.findMany({
      where: {
        deviceId,
        status: {
          in: [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED],
        },
      },
      orderBy: [
        {
          severity: 'desc',
        },
        {
          confidenceScore: 'desc',
        },
      ],
    });
  }

  async findActiveRuleAlert({ deviceId, metric, ruleKey }: ActiveAlertLookup) {
    return prisma.alert.findFirst({
      where: {
        deviceId,
        metric,
        ruleKey,
        status: {
          in: [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findActiveRuleAlertsForMetric(deviceId: string, metric: TelemetryMetric) {
    return prisma.alert.findMany({
      where: {
        deviceId,
        metric,
        ruleKey: {
          not: null,
        },
        status: {
          in: [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED],
        },
      },
    });
  }

  async createRuleAlert(input: CreateRuleAlertInput) {
    return prisma.alert.create({
      data: {
        device: {
          connect: {
            id: input.deviceId,
          },
        },
        metric: input.metric,
        ruleKey: input.ruleKey,
        severity: input.severity,
        confidenceScore: input.confidenceScore,
        title: input.title,
        description: input.description,
        reason: input.reason,
        recommendation: input.recommendation,
        history: {
          create: {
            action: AlertHistoryAction.CREATED,
            toStatus: AlertStatus.OPEN,
            toSeverity: input.severity,
            note: input.reason,
          },
        },
      },
    });
  }

  async updateRuleAlert(alertId: string, input: CreateRuleAlertInput) {
    return prisma.alert.update({
      where: {
        id: alertId,
      },
      data: {
        severity: input.severity,
        confidenceScore: input.confidenceScore,
        title: input.title,
        description: input.description,
        reason: input.reason,
        recommendation: input.recommendation,
        history: {
          create: {
            action: AlertHistoryAction.UPDATED,
            toSeverity: input.severity,
            note: input.reason,
          },
        },
      },
    });
  }

  async resolveAlert(alertId: string, fromStatus: AlertStatus, reason: string) {
    return prisma.alert.update({
      where: {
        id: alertId,
      },
      data: {
        status: AlertStatus.RESOLVED,
        resolvedAt: new Date(),
        history: {
          create: {
            action: AlertHistoryAction.RESOLVED,
            fromStatus,
            toStatus: AlertStatus.RESOLVED,
            note: reason,
          },
        },
      },
    });
  }
}

export const alertRepository = new AlertRepository();
