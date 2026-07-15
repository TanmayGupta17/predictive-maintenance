import { Router } from 'express';

import {
  getDevice,
  getDeviceHistory,
  getDevices,
} from '../controllers/device.controller.js';
import { asyncHandler } from '../middleware/async-handler.js';

export const deviceRouter = Router();

deviceRouter.get('/', asyncHandler(getDevices));
deviceRouter.get('/:id', asyncHandler(getDevice));
deviceRouter.get('/:id/history', asyncHandler(getDeviceHistory));
