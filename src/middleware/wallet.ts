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
  let walletAddress = req.header('x-payment-sender') || (res.getHeader('x-payment-sender') as string) || (req as any).auth?.payer || (req as any).x402?.payer;

  // Fallback to extracting from the SIWX header if not already settled/extracted by x402
  if (!walletAddress && req.header('sign-in-with-x')) {
    try {
      const rawSiwx = req.header('sign-in-with-x')!;
      const b64 = rawSiwx.includes(' ') ? rawSiwx.split(' ')[1] : rawSiwx;
      const siwx = JSON.parse(Buffer.from(b64, 'base64').toString());
      walletAddress = siwx.address;
    } catch {
      // Silently fail if formatting doesn't match
    }
  }

  if (!walletAddress) {
    // If we've reached here but have no wallet, we return 400.
    // In a properly structured app, this shouldn't happen for protected routes because x402Middleware
    // would have already handled the missing payment/auth (returning 402).
    return res.status(400).json({
      error: 'No wallet provided',
      instruction: 'This endpoint requires an x402 payment or SIWX proof. Please include a valid x402 payment payload in your request headers.'
    });
  } else {
    req.wallet = walletAddress;
    next();
  }
};
