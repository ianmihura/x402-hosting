import {
  paymentMiddlewareFromHTTPServer,
  x402HTTPResourceServer,
} from '@x402/express';
import { RouteConfig } from '@x402/core/server'
import {
  declareSIWxExtension,
  createSIWxRequestHook
} from '@x402/extensions/sign-in-with-x';
import { RECEIVE_WALLET_ADDRESS, x402Server } from '../config.js';
import { siwxStorage } from '../lib/siwx.js';

/**
 * Route configurations for protected endpoints using x402 + SIWX.
 */
export const routes: Record<string, RouteConfig> = {
  '/deploy': {
    accepts: [{
      scheme: 'exact',
      payTo: RECEIVE_WALLET_ADDRESS!,
      price: '$0.01',
      network: 'eip155:8453' as const, // Base Mainnet
    }],
    extensions: declareSIWxExtension({
      statement: 'Sign-in to deploy your AI agent site and prove ownership.',
    }),
  },
  '/site': {
    accepts: [], // Auth-only: no payment required if previously proven
    extensions: declareSIWxExtension({
      network: 'eip155:8453', // Required for auth-only
      statement: 'Sign-in to manage your deployed site.',
      expirationSeconds: 300,
    }),
  },
};

/**
 * x402 HTTP Resource Server instance.
 * Combined with createSIWxRequestHook to allow access to returning users without re-payment.
 */
const httpServer = new x402HTTPResourceServer(x402Server, routes)
  .onProtectedRequest(createSIWxRequestHook({
    storage: siwxStorage,
  }));
// .onProtectedRequest(async (req, ctx) => {
//   // 1. Run the standard SIWX request hook (verifies identity and proof)
//   const hook = createSIWxRequestHook({ storage: siwxStorage });
//   const response = await (hook as any)(req, ctx);

//   // If the hook returned a response (error/challenge), we stop here.
//   if (response) return response;

//   // 2. Identity is proven (available in req.wallet if walletMiddleware ran).
//   // If the SIWX hook is satisfied, we check if it is already paid.
//   const wallet = (req as any).wallet || (req as any).auth?.payer;
//   if (wallet) {
//     const isPaid = await siwxStorage.hasPaid(req.path, wallet);
//     if (isPaid) {
//       // Return a special grantAccess response to tell x402 to bypass "accepts"
//       return { grantAccess: true } as any;
//     }
//   }

//   return undefined;
// });

/**
 * Global x402 middleware for the Express application.
 */
export const x402Middleware = paymentMiddlewareFromHTTPServer(httpServer);
