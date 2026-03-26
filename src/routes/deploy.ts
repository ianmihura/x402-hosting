import { Router, Request, Response, NextFunction } from 'express';
import { upload } from '../config.js';
import { validateDeploymentUpload } from '../middleware/validation.js';
import { deploySite } from '../services/main.js';

const router = Router();

/**
 * CREATE / UPDATE Endpoint
 * An agent sends files + payment -> gets back a live URL.
 */
router.post('/deploy', upload.array('files[]', 50), validateDeploymentUpload, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const files = req.files as Express.Multer.File[];
  const result = await deploySite(req.wallet!, files);

  res.status(200).json({
    success: true,
    url: result.url,
    message: result.message
  });
});

export default router;
