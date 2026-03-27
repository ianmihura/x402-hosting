import { Request, Response, NextFunction } from 'express';
import { uploadMulter } from '../config.js';
import { logger } from '../lib/logger.js';

/**
 * Flexible middleware supporting both multipart/form-data and application/json file uploads.
 * 
 * - Multipart: Standard Multer flow (using 'files[]' field).
 * - JSON: Base64 formatted JSON payload:
 *   { "files": [{ "name": "index.html", "content": "base64...", "type": "text/html" }] }
 */
export const flexibleUpload = (req: Request, res: Response, next: NextFunction) => {
  const contentType = req.header('content-type') || '';

  // 1. Handle Multipart (already standard)
  if (contentType.includes('multipart/form-data')) {
    return uploadMulter.array('files[]', 50)(req, res, next);
  }

  // 2. Handle JSON with Base64 content
  if (contentType.includes('application/json')) {
    try {
      const jsonBody = req.body;
      if (!jsonBody.files || !Array.isArray(jsonBody.files)) {
        return next(); // Downstream validators will handle missing files
      }

      // Convert JSON objects back into Express.Multer.File format
      const mappedFiles: Express.Multer.File[] = jsonBody.files.map((f: any) => {
        const buffer = Buffer.from(f.content, 'base64');
        return {
          buffer,
          originalname: f.name,
          mimetype: f.type || 'application/octet-stream',
          size: buffer.length,
          fieldname: 'files[]',
          encoding: '7bit',
          filename: f.name,
          path: '', // Not used for memory storage
          destination: '',
          stream: null as any
        };
      });

      // Populate req.files for compatibility with existing business logic
      req.files = mappedFiles;
      return next();
    } catch (err: any) {
      logger.error({ err }, 'Failed to parse JSON Base64 metadata');
      return res.status(400).json({ error: 'Invalid JSON file payload or Base64 encoding error' });
    }
  }

  // 3. Fallback: continue normally (likely fails validation if needed files are missing)
  next();
};
