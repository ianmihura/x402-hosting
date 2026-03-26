import { Request, Response, NextFunction } from 'express';

// Extend Express Request type to include wallet
declare global {
  namespace Express {
    interface Request {
      wallet?: string;
    }
  }
}

/**
 * Middleware to extract the verified wallet from x402 headers.
 * Assigns the address to `req.wallet` for downstream use.
 * 
 * Should be used AFTER the x402Middleware.
 */
export const walletMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const walletAddress = req.header('x-payment-sender');

  // if (!walletAddress) {
  //   // If we've reached here but have no wallet, we return 400.
  //   // In a properly structured app, this shouldn't happen for protected routes because x402Middleware
  //   // would have already handled the missing payment/auth (returning 402).
  //   return res.status(400).json({ 
  //     error: 'No wallet provided', 
  //     instruction: 'This endpoint requires an x402 payment or SIWX proof. Please include a valid x402 payment payload in your request headers.'
  //   });
  // }

  req.wallet = walletAddress;
  next();
};
