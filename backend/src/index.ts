/**
 * ChopDot Backend API Server
 * 
 * Production-ready Express server with IPFS upload proxy.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { ipfsRouter } from './routes/ipfs.routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Rate limit IPFS uploads (15 requests per minute per IP)
const ipfsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.IPFS_RATE_LIMIT_MAX || '15', 10),
  message: { error: { code: 'RATE_LIMIT', message: 'Too many upload requests. Try again later.' } },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: CORS_ORIGIN.split(',').map(origin => origin.trim()),
  credentials: true,
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes (rate limit IPFS uploads)
app.use('/api/ipfs', ipfsLimiter, ipfsRouter);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[API] Unhandled error:', err);
  console.error('[API] Error stack:', err.stack);
  console.error('[API] Request path:', req.path);
  console.error('[API] Request method:', req.method);
  
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`[API] Server running on port ${PORT}`);
  console.log(`[API] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[API] CORS origin: ${CORS_ORIGIN}`);
});
