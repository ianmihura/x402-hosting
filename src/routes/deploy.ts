import { Router, Request, Response, NextFunction } from 'express';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2, BUCKET_NAME, upload } from '../config.js';
import { validateDeploymentUpload } from '../middleware/validation.js';

const router = Router();

/**
 * CREATE / UPDATE Endpoint
 * An agent sends files + payment -> gets back a live URL.
 */
router.post('/deploy', upload.array('files[]', 50), validateDeploymentUpload, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const walletAddress = req.header('x-payment-sender');
  if (!walletAddress) {
    res.status(400).json({ error: 'No wallet provided' });
    return;
  }

  const files = req.files as Express.Multer.File[];

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  // TODO batch upload
  const uploadPromises = files.map(file => {
    const key = `${walletAddress}/latest/${file.originalname}`;

    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      Expires: expiresAt
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
});

export default router;
