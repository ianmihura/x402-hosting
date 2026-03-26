import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { logger } from './lib/logger.js';
import { PORT } from './config.js';
import deployRouter from './routes/deploy.js';
import siteRouter from './routes/site.js';
import healthRouter from './routes/health.js';
import { contextMiddleware } from './middleware/context.js';
import { errorHandler } from './middleware/errorHandler.js';
import { x402Middleware } from './middleware/payment.js';

const app = express();

// Security and Rate Limiting
// app.use(helmet()); // TODO why this does not work?
const limiter = rateLimit({ // roughly 1 request per second
  windowMs: 1000, // 1 sec
  max: 1,         // requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);
// TODO limit 1 request per second per wallet

// Traceability Context
app.use(contextMiddleware);

// Middleware
app.use(express.json());
app.use(x402Middleware);

// Routes
app.use(deployRouter);
app.use(siteRouter);
app.use(healthRouter);

// Global Error Handler
app.use(errorHandler);

// Start the server
app.listen(PORT, () => {
  logger.info(`x402 Hosting Service running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});
