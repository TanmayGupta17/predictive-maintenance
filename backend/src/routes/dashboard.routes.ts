import { Router } from 'express';

import { getDashboard } from '../controllers/dashboard.controller.js';
import { asyncHandler } from '../middleware/async-handler.js';

export const dashboardRouter = Router();

dashboardRouter.get('/', asyncHandler(getDashboard));
