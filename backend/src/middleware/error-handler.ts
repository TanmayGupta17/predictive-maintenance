import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { logger } from '../utils/logger.js';
import { HttpError } from '../utils/http-error.js';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    logger.warn({
      message: 'Request validation failed',
      issues: error.issues,
    });

    res.status(400).json({
      message: 'Invalid request payload',
      issues: error.issues,
    });
    return;
  }

  if (error instanceof HttpError) {
    logger.warn({
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
    });

    res.status(error.statusCode).json({
      message: error.message,
      details: error.details,
    });
    return;
  }

  logger.error(error);
  res.status(500).json({ message: 'Internal server error' });
};
