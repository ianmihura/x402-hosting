import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to validate a site deployment uploadMulter.
 * It checks:
 * 1. That at least one file is provided.
 * 2. That the total size of all files does not exceed the 10 MB limit.
 * 
 * Must run AFTER multer middleware (e.g. uploadMulter.array()).
 */
export const validateFilesToDeploy = (req: Request, res: Response, next: NextFunction) => {
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No files provided' });
  }

  const MAX_TOTAL_SIZE = 10 * 1024 * 1024; // 10 MB
  const totalSize = files.reduce((acc, file) => acc + file.size, 0);

  if (totalSize > MAX_TOTAL_SIZE) {
    return res.status(400).json({ error: 'Site size exceeds 10 MB limit' });
  }

  // TODO: Content moderation?
  // TODO: index.html exists?

  next();
};
