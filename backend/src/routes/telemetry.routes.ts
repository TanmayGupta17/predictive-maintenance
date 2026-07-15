import { Router } from 'express';

import { ingestTelemetry } from '../controllers/telemetry.controller.js';
import { asyncHandler } from '../middleware/async-handler.js';

export const telemetryRouter = Router();

telemetryRouter.post('/', asyncHandler(ingestTelemetry));
