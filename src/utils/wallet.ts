import { Request } from 'express';

/**
 * Utility to get wallet from x402 headers.
 * Note: x402 header 'x-payment-sender' is expected to be present
 * when the paymentMiddleware has successfully verified the payment.
 */
export const getWalletAddress = (req: Request): string => {
  return req.wallet || (req.headers['x-payment-sender'] as string) || 'unknown-wallet';
};
