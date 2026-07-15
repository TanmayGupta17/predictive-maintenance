import { Router } from 'express';

import { alertRouter } from './alert.routes.js';
import { dashboardRouter } from './dashboard.routes.js';
import { deviceRouter } from './device.routes.js';
import { healthRouter } from './health.routes.js';
import { telemetryRouter } from './telemetry.routes.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/telemetry', telemetryRouter);
apiRouter.use('/devices', deviceRouter);
apiRouter.use('/alerts', alertRouter);
apiRouter.use('/dashboard', dashboardRouter);
