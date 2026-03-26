import pino from 'pino';
import { getRequestId } from './store.js';

export const logger = pino({
  mixin() {
    // attach requestId to every log object
    return { requestId: getRequestId() };
  },
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
  } : undefined,
});
