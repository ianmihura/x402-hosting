import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';
import { paymentMiddleware } from '@x402/express';
import { verifyMessage } from 'viem';
import { MY_WALLET_ADDRESS, x402Server } from '../config.js';

// Extend Express Request type to include wallet
declare global {
  namespace Express {
    interface Request {
      wallet?: string;
    }
  }
}

/**
 * Standard x402 payment middleware for the hosting service.
 * Enforces a $0.01 USDC payment on Base Mainnet.
 */
export const requirePayment = paymentMiddleware({
  accepts: {
    scheme: 'exact',
    payTo: MY_WALLET_ADDRESS!,
    price: '$0.01',
    network: 'eip155:8453', // Base Mainnet
  },
  // TODO add testnets
}, x402Server);

/**
 * Middleware to verify request ownership via message signature.
 * Used for non-payment actions like GET metadata or DELETE.
 */
export const requireOwnership = async (req: Request, res: Response, next: NextFunction) => {
  const signature = req.header('x-payment-signature') as `0x${string}`;
  const walletAddress = req.header('x-payment-sender') as `0x${string}`;

  // The message being signed. For simplicity in MVP, we might sign the URL or a custom message.
  // TODO should include a nonce or timestamp to prevent replay attacks.
  const message = req.header('x-payment-message') || req.originalUrl;

  if (!signature || !walletAddress) {
    return res.status(401).json({ error: "Signature and wallet address required for ownership proof" });
  }

  try {
    const isValid = await verifyMessage({
      address: walletAddress,
      message,
      signature,
    });

    if (!isValid) {
      return res.status(403).json({ error: "Invalid signature" });
    }

    req.wallet = walletAddress;
    next();
  } catch (error) {
    logger.error(error, "Signature verification error");
    res.status(403).json({ error: "Signature verification failed" });
  }
};
