import 'dotenv/config';
import { logger } from './lib/logger.js';
import { S3Client } from '@aws-sdk/client-s3';
import { x402ResourceServer } from '@x402/express';
import { HTTPFacilitatorClient } from '@x402/core/server';
import { ExactEvmScheme } from "@x402/evm/exact/server";
import multer from 'multer';
import path from 'path';

// Configurations
export const PORT = process.env.PORT || 3000;
export const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'pub';
export const MY_WALLET_ADDRESS = process.env.MY_WALLET_ADDRESS;
export const FACILITATOR_URL = process.env.FACILITATOR_URL;

if (!MY_WALLET_ADDRESS) {
  logger.error("MY_WALLET_ADDRESS missing");
  process.exit(1);
}

if (!FACILITATOR_URL) {
  logger.error("FACILITATOR_URL missing");
  process.exit(1);
}

const facilitator = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
export const x402Server = new x402ResourceServer(facilitator);
x402Server.register("eip155:8453", new ExactEvmScheme());

export const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// TODO can we do this w/o third party lib?
const storage = multer.memoryStorage();
const allowedExts = /\.(html|css|js|json|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|txt|md)$/i;

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // TODO max size per file or total?
    files: 50
  },
  fileFilter: (req, file, cb) => {
    const extname = allowedExts.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
      return cb(null, true);
    } else {
      return cb(new Error('File type not allowed.'));
    }
  }
});
