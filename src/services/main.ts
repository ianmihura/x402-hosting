import { ListObjectsV2Command, PutObjectCommand, DeleteObjectsCommand, ObjectIdentifier } from '@aws-sdk/client-s3';
import { r2, BUCKET_NAME, R2_BUCKET_ENDPOINT } from './../lib/r2.js';

export interface SiteMetadata {
  wallet: string;
  totalSize: number;
  fileCount: number;
  files: Array<{
    name: string;
    size?: number;
    lastModified?: Date;
  }>;
}

export interface DeploymentResult {
  url: string;
  message: string;
}

/**
 * Business Logic: Deploy/Update a site.
 */
export const deploySite = async (walletAddress: string, files: Express.Multer.File[]): Promise<DeploymentResult> => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const uploadPromises = files.map(file => {
    return r2.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `${walletAddress}/latest/${file.originalname}`,
      Body: file.buffer,
      ContentType: file.mimetype,
      Expires: expiresAt,
    }));
  });

  await Promise.all(uploadPromises);

  return {
    url: `${R2_BUCKET_ENDPOINT}/${walletAddress}/latest/index.html`,
    message: 'Site deployed successfully'
  };
};

/**
 * Business Logic: Get metadata for a deployed site.
 * Returns null if the site is not found.
 */
export const getSiteMetadata = async (walletAddress: string): Promise<SiteMetadata | null> => {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: `${walletAddress}/latest/`,
  });

  const output = await r2.send(command);

  if (!output.Contents || output.Contents.length === 0) {
    return null;
  }

  const files = output.Contents.map(obj => ({
    name: obj.Key?.replace(`${walletAddress}/latest/`, '') || 'unknown',
    size: obj.Size,
    lastModified: obj.LastModified
  }));

  const totalSize = files.reduce((acc, file) => acc + (file.size || 0), 0);

  return {
    wallet: walletAddress,
    totalSize,
    fileCount: files.length,
    files
  };
};

/**
 * Business Logic: Delete a site completely.
 * Returns true on success, false if site not found.
 */
export const deleteSite = async (walletAddress: string): Promise<boolean> => {
  const listCommand = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: `${walletAddress}/latest/`,
  });

  const output = await r2.send(listCommand);

  if (!output.Contents || output.Contents.length === 0) {
    return false;
  }

  const objectsToDelete: ObjectIdentifier[] = output.Contents.map(item => ({ Key: item.Key! }));

  const deleteCommand = new DeleteObjectsCommand({
    Bucket: BUCKET_NAME,
    Delete: { Objects: objectsToDelete }
  });

  await r2.send(deleteCommand);

  return true;
};
