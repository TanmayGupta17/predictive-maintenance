import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found-handler.js';
import { apiRouter } from './routes/index.js';

// In the single-container production image the built frontend is copied to
// ../public (relative to the compiled dist/app.js) and served by this server.
const frontendDir = fileURLToPath(new URL('../public', import.meta.url));
const serveFrontend = env.NODE_ENV === 'production' && existsSync(frontendDir);

export function createApp() {
  const app = express();

  // CSP is disabled because this server also serves a single-page app whose
  // React inline styles would otherwise be blocked. Other Helmet protections stay on.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  app.use('/api', apiRouter);

  if (serveFrontend) {
    // Serve static assets, then fall back to index.html for client-side routes
    // (anything that isn't an /api call).
    app.use(express.static(frontendDir));
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(join(frontendDir, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
