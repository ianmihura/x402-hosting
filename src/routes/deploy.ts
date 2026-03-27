import { Router, Request, Response, NextFunction } from 'express';
import { flexibleUpload } from '../middleware/flexibleUpload.js';
import { validateFilesToDeploy } from '../middleware/filesValid.js';
import { deploySite } from '../services/main.js';

const router = Router();

/**
 * CREATE / UPDATE Endpoint
 * An agent sends files (Multipart or JSON Base64) + payment -> gets back a live URL.
 */
router.post('/deploy', flexibleUpload, validateFilesToDeploy, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const files = req.files as Express.Multer.File[];
  const result = await deploySite(req.wallet!, files);

  res.status(200).json({
    success: true,
    ...result,
  });
});

export default router;
