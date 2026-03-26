import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { logger } from './lib/logger.js';
import { PORT } from './config.js';
import deployRouter from './routes/deploy.js';
import siteRouter from './routes/site.js';
import healthRouter from './routes/health.js';
import { contextMiddleware } from './middleware/context.js';
import { errorHandler } from './middleware/errorHandler.js';
import { x402Middleware } from './middleware/payment.js';
import { walletMiddleware } from './middleware/wallet.js';

const app = express();

// Security and Rate Limiting
const limitIP = rateLimit({
  windowMs: 1000, // 1 sec
  max: 1,         // requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
if (process.env.NODE_ENV !== 'test') {
  app.use(limitIP);
}

// Traceability Context
app.use(contextMiddleware);

// Global Authentication
app.use(x402Middleware);

// Verified Identity Context
app.use(walletMiddleware);

const limitWallet = rateLimit({
  windowMs: 1000, // 1 sec
  max: 1,         // requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.wallet || '',
});
if (process.env.NODE_ENV !== 'test') {
  app.use(limitWallet);
}

// Middleware
app.use(express.json());

// Routes
app.use(deployRouter);
app.use(siteRouter);
app.use(healthRouter);

// Global Error Handler
app.use(errorHandler);

// Start the server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`x402 Hosting Service running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

export default app;
