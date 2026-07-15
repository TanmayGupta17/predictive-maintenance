import type { Request, Response } from 'express';

import { telemetryIngestionService } from '../services/telemetry-ingestion.service.js';

export async function ingestTelemetry(req: Request, res: Response) {
  const result = await telemetryIngestionService.ingest(req.body);
  const statusCode = result.duplicate ? 200 : 201;

  res.status(statusCode).json(result);
}
