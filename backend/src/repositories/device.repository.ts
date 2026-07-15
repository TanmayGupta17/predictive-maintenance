import { DeviceStatus, DeviceType, Prisma } from '@prisma/client';

import { prisma } from '../config/prisma.js';
import type { SimulatedDevice } from '../simulator/types.js';

const prismaDeviceTypeBySimulatorType: Record<SimulatedDevice['type'], DeviceType> = {
  pump: DeviceType.PUMP,
  motor: DeviceType.MOTOR,
  compressor: DeviceType.COMPRESSOR,
  generator: DeviceType.GENERATOR,
  conveyor: DeviceType.CONVEYOR,
};

class DeviceRepository {
  async list(params: {
    where: Prisma.DeviceWhereInput;
    orderBy: Prisma.DeviceOrderByWithRelationInput;
    skip: number;
    take: number;
  }) {
    return prisma.device.findMany({
      where: params.where,
      orderBy: params.orderBy,
      skip: params.skip,
      take: params.take,
    });
  }

  async count(where: Prisma.DeviceWhereInput) {
    return prisma.device.count({ where });
  }

  async findById(deviceId: string) {
    return prisma.device.findUnique({
      where: {
        id: deviceId,
      },
    });
  }

  async updateHealthIfChanged(deviceId: string, healthScore: number, status: DeviceStatus) {
    const device = await this.findById(deviceId);

    if (!device) {
      return null;
    }

    if (device.healthScore === healthScore && device.status === status) {
      return null;
    }

    return prisma.device.update({
      where: {
        id: deviceId,
      },
      data: {
        healthScore,
        status,
      },
    });
  }

  async getStatusCounts() {
    return prisma.device.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    });
  }

  async getAverageHealthScore() {
    return prisma.device.aggregate({
      _avg: {
        healthScore: true,
      },
    });
  }

  async getAllHealthScores() {
    return prisma.device.findMany({
      select: {
        healthScore: true,
      },
    });
  }

  async getLowestHealthDevices(limit: number) {
    return prisma.device.findMany({
      orderBy: {
        healthScore: 'asc',
      },
      take: limit,
    });
  }

  async exists(deviceId: string) {
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      select: { id: true },
    });

    return device !== null;
  }

  async upsertSimulatedDevices(devices: SimulatedDevice[]) {
    return Promise.all(
      devices.map((device) =>
        prisma.device.upsert({
          where: { id: device.id },
          update: {
            name: device.name,
            type: prismaDeviceTypeBySimulatorType[device.type],
            location: device.location,
            status: DeviceStatus.ONLINE,
          },
          create: {
            id: device.id,
            name: device.name,
            type: prismaDeviceTypeBySimulatorType[device.type],
            location: device.location,
            healthScore: device.healthScore,
            status: DeviceStatus.ONLINE,
          },
        }),
      ),
    );
  }
}

export const deviceRepository = new DeviceRepository();
