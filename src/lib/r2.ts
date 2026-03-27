import { S3Client } from '@aws-sdk/client-s3';
import 'dotenv/config';

export const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'pub';
export const R2_BUCKET_ENDPOINT = process.env.R2_BUCKET_ENDPOINT || 'https://pub-16f72a58e1774585bd52a4eec4cfb020.r2.dev';

export const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});
