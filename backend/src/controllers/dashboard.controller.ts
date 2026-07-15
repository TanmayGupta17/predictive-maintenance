import type { Request, Response } from 'express';

import { dashboardService } from '../services/dashboard.service.js';

export async function getDashboard(req: Request, res: Response) {
  const result = await dashboardService.getDashboard(req.query);
  res.status(200).json(result);
}
