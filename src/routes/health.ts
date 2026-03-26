import { Router } from 'express';
import { PORT } from '../config.js';

const router = Router();

router.get('/health', (req, res) => {
  if (process.env.NODE_ENV === 'development') {
    res.json({
      status: 'ok',
      r2_endpoint: process.env.R2_ENDPOINT,
      uptime: process.uptime(),
      env: process.env.NODE_ENV,
      port: PORT,
    });
  } else {
    res.json({ status: 'ok' });
  }
});

export default router;
