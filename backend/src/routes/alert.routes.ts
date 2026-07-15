import { Router } from 'express';

import { getActiveAlerts, getResolvedAlerts } from '../controllers/alert.controller.js';
import { asyncHandler } from '../middleware/async-handler.js';

export const alertRouter = Router();

alertRouter.get('/', asyncHandler(getActiveAlerts));
alertRouter.get('/history', asyncHandler(getResolvedAlerts));
