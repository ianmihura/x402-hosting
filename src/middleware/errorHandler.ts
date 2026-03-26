import { Request, Response, NextFunction } from 'express';
import { getRequestId } from '../lib/store.js';
import { logger } from '../lib/logger.js';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const requestId = getRequestId();

  // useful for tracing and debugging
  logger.error({ err, requestId }, "Unhandled Error");

  if (process.env.NODE_ENV === 'development') {
    // useful info
    res.status(500).json({
      status: 'error',
      message: err.message,
      stack: err.stack,
      requestId,
    });
  } else {
    // sanitized response in prod
    res.status(500).json({
      status: 'error',
      message: 'Internal Server Error',
      requestId,
    });
  }
};
