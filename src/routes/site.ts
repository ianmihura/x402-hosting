import { Router, Request, Response, NextFunction } from 'express';
import { getSiteMetadata, deleteSite } from '../services/main.js';

const router = Router();

/**
 * READ Endpoint
 * Check metadata about a deployed site (files, size).
 */
router.get('/site', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const metadata = await getSiteMetadata(req.wallet!);

  if (metadata) {
    res.status(200).json(metadata);
  } else {
    res.status(404).json({ error: 'Site not found' });
  }
});

/**
 * DELETE Endpoint
 * Deletes the site completely.
 */
router.delete('/site', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const deleted = await deleteSite(req.wallet!);

  if (deleted) {
    res.status(200).json({ message: 'Site deleted successfully' });
  } else {
    res.status(404).json({ error: 'Site not found' });
  }
});

export default router;
