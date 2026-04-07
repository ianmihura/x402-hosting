import { Request, Response, NextFunction } from 'express';
import { getRequestId } from '../lib/store.js';
import { logger } from '../lib/logger.js';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const requestId = getRequestId();
  const statusCode = err.status || err.statusCode || 500;

  // useful for tracing and debugging
  logger.error({ err, requestId }, `Unhandled Error: ${err.message}`);

  // In non-dev, we only show the message for client errors (4xx)
  const isClientError = statusCode >= 400 && statusCode < 500;

  if (process.env.NODE_ENV === 'production') {
    // sanitized response in prod
    res.status(statusCode).json({
      status: 'error',
      message: isClientError ? err.message : 'Internal Server Error',
      requestId,
    });
  } else {
    // useful info
    res.status(statusCode).json({
      status: 'error',
      message: err.message,
      stack: err.stack,
      requestId,
    });
  }
};
