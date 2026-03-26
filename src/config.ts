import 'dotenv/config';
import { logger } from './lib/logger.js';
import { S3Client } from '@aws-sdk/client-s3';
import { x402ResourceServer } from '@x402/express';
import { HTTPFacilitatorClient } from '@x402/core/server';
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { siwxResourceServerExtension, createSIWxSettleHook } from '@x402/extensions/sign-in-with-x';
import { siwxStorage } from './lib/siwx.js';
import multer from 'multer';
import path from 'path';

// Configurations
export const PORT = process.env.PORT || 3000;
export const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'pub';
export const RECEIVE_WALLET_ADDRESS = process.env.RECEIVE_WALLET_ADDRESS;
export const FACILITATOR_URL = process.env.FACILITATOR_URL;
// TODO network as a global env variable

if (!RECEIVE_WALLET_ADDRESS) {
  logger.error("RECEIVE_WALLET_ADDRESS missing");
  process.exit(1);
}

if (!FACILITATOR_URL) {
  logger.error("FACILITATOR_URL missing");
  process.exit(1);
}

const facilitator = new HTTPFacilitatorClient({ url: FACILITATOR_URL });

// Initialize x402 Server with SIWX Extensions
export const x402Server = new x402ResourceServer(facilitator)
  .register("eip155:8453", new ExactEvmScheme())
  .registerExtension(siwxResourceServerExtension)
  .onAfterSettle(createSIWxSettleHook({ storage: siwxStorage })); // TODO maybe dont need this bind

export const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const storage = multer.memoryStorage();
const allowedExts = /\.(html|css|js|json|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|txt|md)$/i;

export const upload = multer({
  storage,
  limits: { files: 50 },
  fileFilter: (req, file, cb) => {
    const extname = allowedExts.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
      return cb(null, true);
    } else {
      return cb(new Error('File type not allowed.'));
    }
  }
});
