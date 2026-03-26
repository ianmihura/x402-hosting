import { Router, Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2, BUCKET_NAME, upload } from '../config.js';
import { getWalletAddress } from '../utils/wallet.js';
import { requirePayment } from '../middleware/payment.js';

const router = Router();

/**
 * CREATE / UPDATE Endpoint
 * An agent sends files + payment -> gets back a live URL.
 */
router.post('/deploy', requirePayment, upload.array('files[]', 50), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // TODO upload array what is?
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No files provided' });
      return;
    }

    // Check total site size (though multer helps, we verify sum)
    const totalSize = files.reduce((acc, file) => acc + file.size, 0);
    if (totalSize > 10 * 1024 * 1024) { // TODO why are we doing this again (multer did this already)
      res.status(400).json({ error: 'Site size exceeds 10 MB limit' });
      return;
    }

    // Determine deployment expiry (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const walletAddress = getWalletAddress(req);

    // Upload files to R2
    // TODO batch upload
    const uploadPromises = files.map(file => {
      const key = `${walletAddress}/latest/${file.originalname}`;
      // TODO manually test that overwrite works

      const uploadParams = {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Expires: expiresAt // TODO define what expired looks like
      };

      return r2.send(new PutObjectCommand(uploadParams));
    });

    await Promise.all(uploadPromises);

    res.status(200).json({
      success: true,
      // TODO make sure we answer the correct endpoint
      url: `https://deploy.your-service.com/${walletAddress}/latest/index.html`,
      message: 'Site deployed successfully'
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'File type not allowed.') {
      res.status(400).json({ error: error.message });
    } else {
      logger.error(error, 'Deployment error');
      next(error);
    }
  }
});

export default router;
