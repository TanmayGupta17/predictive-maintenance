import type { Request, Response } from 'express';

import { alertService } from '../services/alert.service.js';

export async function getActiveAlerts(req: Request, res: Response) {
  const result = await alertService.getActiveAlerts(req.query);
  res.status(200).json(result);
}

export async function getResolvedAlerts(req: Request, res: Response) {
  const result = await alertService.getResolvedAlerts(req.query);
  res.status(200).json(result);
}
