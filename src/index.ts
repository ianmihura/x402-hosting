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

const app = express();

// Security and Rate Limiting
// app.use(helmet());
const limiter = rateLimit({ // TODO adjust this: roughly 1 request per second
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Traceability Context
app.use(contextMiddleware);

// Middleware
app.use(express.json());

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
