import { Router, Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';
import { ListObjectsV2Command, DeleteObjectsCommand, ObjectIdentifier } from '@aws-sdk/client-s3';
import { r2, BUCKET_NAME } from '../config.js';
import { getWalletAddress } from '../utils/wallet.js';
import { requireOwnership } from '../middleware/payment.js';

const router = Router();

/**
 * READ Endpoint
 * Check metadata about a deployed site (files, size).
 */
router.get('/site', requireOwnership, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const walletAddress = getWalletAddress(req);

  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `${walletAddress}/latest/`,
    });

    const output = await r2.send(command);

    if (!output.Contents || output.Contents.length === 0) {
      res.status(404).json({ error: 'Site not found' });
      return;
    }

    const files = output.Contents.map(obj => ({
      name: obj.Key?.replace(`${walletAddress}/latest/`, ''),
      size: obj.Size,
      lastModified: obj.LastModified
    }));

    const totalSize = files.reduce((acc, file) => acc + (file.size || 0), 0);

    res.status(200).json({
      wallet: walletAddress,
      totalSize,
      fileCount: files.length,
      files
    });
  } catch (error) {
    logger.error(error, 'Read metadata error');
    next(error);
  }
});

/**
 * DELETE Endpoint
 * Deletes the site completely.
 */
router.delete('/site', requireOwnership, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const walletAddress = getWalletAddress(req);

  try {
    // First, list all objects under this site
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `${walletAddress}/latest/`,
    });

    const output = await r2.send(listCommand);

    if (!output.Contents || output.Contents.length === 0) {
      res.status(404).json({ error: 'Site not found' });
      return;
    }

    // Prepare objects for deletion
    const objectsToDelete: ObjectIdentifier[] = output.Contents.map(item => ({ Key: item.Key! }));

    // Delete objects
    const deleteCommand = new DeleteObjectsCommand({
      Bucket: BUCKET_NAME,
      Delete: { Objects: objectsToDelete }
    });

    await r2.send(deleteCommand);

    res.status(200).json({ message: 'Site deleted successfully' });
  } catch (error) {
    logger.error(error, 'Deletion error');
    next(error);
  }
});

export default router;
