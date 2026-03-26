import {
  paymentMiddlewareFromHTTPServer,
  x402HTTPResourceServer
} from '@x402/express';
import {
  declareSIWxExtension,
  createSIWxRequestHook
} from '@x402/extensions/sign-in-with-x';
import { MY_WALLET_ADDRESS, x402Server } from '../config.js';
import { siwxStorage } from '../lib/siwx.js';

/**
 * Route configurations for protected endpoints using x402 + SIWX.
 */
const routes = {
  '/deploy': {
    methods: ['POST'],
    accepts: [{
      scheme: 'exact',
      payTo: MY_WALLET_ADDRESS!,
      price: '$0.01',
      network: 'eip155:8453' as const, // Base Mainnet
    }],
    extensions: declareSIWxExtension({
      statement: 'Sign-in to deploy your AI agent site and prove ownership.',
    }),
  },
  '/site': {
    methods: ['GET', 'DELETE'],
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
const httpServer = new x402HTTPResourceServer(x402Server, routes as any)
  .onProtectedRequest(createSIWxRequestHook({
    storage: siwxStorage,
  }));

/**
 * Global x402 middleware for the Express application.
 */
export const x402Middleware = paymentMiddlewareFromHTTPServer(httpServer);
