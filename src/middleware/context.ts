import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '../lib/store.js';

export const contextMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.header('x-request-id') as string) || uuidv4();

  res.setHeader('x-request-id', requestId);

  storage.run({ requestId }, () => {
    next();
  });
};
