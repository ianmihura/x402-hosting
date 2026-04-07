import 'dotenv/config';
import { logger } from './lib/logger.js';

import { x402ResourceServer } from '@x402/express';
import { HTTPFacilitatorClient } from '@x402/core/server';
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { siwxResourceServerExtension, createSIWxSettleHook } from '@x402/extensions/sign-in-with-x';
import { bazaarResourceServerExtension } from '@x402/extensions/bazaar';
import { siwxStorage } from './lib/siwx.js';
import multer from 'multer';
import path from 'path';

// Configurations
export const PORT = process.env.PORT || 3000;
export { BUCKET_NAME, R2_BUCKET_ENDPOINT, r2 } from './lib/r2.js';

export const RECEIVE_WALLET_ADDRESS = process.env.RECEIVE_WALLET_ADDRESS;
export const FACILITATOR_URL = process.env.FACILITATOR_URL;

if (!RECEIVE_WALLET_ADDRESS) {
  logger.error("RECEIVE_WALLET_ADDRESS missing");
  process.exit(1);
}

if (!FACILITATOR_URL) {
  logger.error("FACILITATOR_URL missing");
  process.exit(1);
}
logger.info({ FACILITATOR_URL }, "Using facilitator");

const facilitator = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
export const x402Server = new x402ResourceServer(facilitator)
  .register("eip155:8453", new ExactEvmScheme())
  .registerExtension(siwxResourceServerExtension)
  .registerExtension(bazaarResourceServerExtension)
  .onAfterSettle(createSIWxSettleHook({ storage: siwxStorage }));

export const uploadMulter = multer({
  storage: multer.memoryStorage(),
  limits: { files: 50 },
  fileFilter: (req, file, cb) => {
    const allowedExts = /\.(html|css|js|json|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|txt|md)$/i;
    const extname = allowedExts.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
      return cb(null, true);
    } else {
      const error: any = new Error('File type not allowed. Only web formats (html, css, js, etc.) are permitted.');
      error.status = 400;
      return cb(error);
    }
  }
});
