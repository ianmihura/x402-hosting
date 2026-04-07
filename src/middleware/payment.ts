import {
  paymentMiddlewareFromHTTPServer,
  x402HTTPResourceServer,
} from '@x402/express';
import { RouteConfig } from '@x402/core/server'
import {
  declareSIWxExtension,
  createSIWxRequestHook
} from '@x402/extensions/sign-in-with-x';
import { declareDiscoveryExtension } from '@x402/extensions/bazaar';
import { RECEIVE_WALLET_ADDRESS, x402Server } from '../config.js';
import { siwxStorage } from '../lib/siwx.js';

function unpaidResponseBody(context: any) {
  return {
    contentType: "application/json",
    body: {
      message: 'Welcome to x402-hosting, an automated static site hosting service that you can pay via x402 protocol.',
      endpoints: [
        { method: 'POST', path: '/deploy', description: 'Deploy a new site' },
        { method: 'GET', path: '/site', description: 'Get site metadata' },
        { method: 'DELETE', path: '/site', description: 'Delete a site' },
      ],
    },
  };
}

/**
 * Route configurations for protected endpoints using x402 + SIWX.
 */
export const routes: Record<string, RouteConfig> = {
  'POST /deploy': {
    accepts: [{
      scheme: 'exact',
      payTo: RECEIVE_WALLET_ADDRESS!,
      price: '$0.01',
      network: 'eip155:8453' as const, // Base Mainnet
    }],
    extensions: {
      ...declareSIWxExtension({
        statement: 'Sign-in to deploy your AI agent site and prove ownership.',
      }),
      ...declareDiscoveryExtension({
        bodyType: 'form-data',
        input: {
          'files[]': 'File content here'
        },
        inputSchema: {
          type: 'object',
          properties: {
            'files[]': {
              type: 'array',
              items: { type: 'string', format: 'binary' },
              description: 'Array of files to deploy'
            }
          },
          required: ['files[]']
        },
        output: {
          example: {
            success: true,
            url: 'https://user-wallet.x402.site',
            message: 'Site deployed successfully'
          }
        }
      })
    },
  },
  'GET /site': {
    accepts: [], // Auth-only: no payment required if previously proven
    extensions: {
      ...declareSIWxExtension({
        network: 'eip155:8453', // Required for auth-only
        statement: 'Sign-in to manage your deployed site.',
        expirationSeconds: 300,
      }),
      ...declareDiscoveryExtension({
        output: {
          example: {
            wallet: '0x...',
            totalSize: 1024,
            fileCount: 2,
            files: [
              { name: 'index.html', size: 512, type: 'text/html' }
            ]
          }
        }
      })
    },
  },
  'DELETE /site': {
    accepts: [], // Auth-only
    extensions: {
      ...declareSIWxExtension({
        network: 'eip155:8453',
        statement: 'Sign-in to delete your deployed site.',
        expirationSeconds: 300,
      }),
      ...declareDiscoveryExtension({
        output: {
          example: {
            message: 'Site deleted successfully'
          }
        }
      })
    },
  },
  '*': {
    accepts: [], // Auth-only
    unpaidResponseBody: unpaidResponseBody,
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

/**
 * Global x402 middleware for the Express application.
 */
export const x402Middleware = paymentMiddlewareFromHTTPServer(httpServer);
