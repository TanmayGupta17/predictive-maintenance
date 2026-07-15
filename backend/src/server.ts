import { createServer } from 'node:http';

import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { registerSockets } from './sockets/index.js';
import { startTelemetrySimulator } from './simulator/index.js';

const app = createApp();
const httpServer = createServer(app);

registerSockets(httpServer);

httpServer.listen(env.PORT, () => {
  logger.info(`Backend listening on port ${env.PORT}`);
  startTelemetrySimulator();
});
