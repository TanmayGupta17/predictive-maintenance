import type { Request, Response } from 'express';

import { deviceService } from '../services/device.service.js';

export async function getDevices(req: Request, res: Response) {
  const result = await deviceService.getFleetSummary(req.query);
  res.status(200).json(result);
}

export async function getDevice(req: Request, res: Response) {
  const result = await deviceService.getDeviceWithLatestMetrics(req.params);
  res.status(200).json(result);
}

export async function getDeviceHistory(req: Request, res: Response) {
  const result = await deviceService.getDeviceHistory(req.params, req.query);
  res.status(200).json(result);
}
