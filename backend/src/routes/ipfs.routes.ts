/**
 * IPFS Routes
 * 
 * Routes for IPFS upload operations.
 */

import { Router } from 'express';
import { uploadFile } from '../controllers/ipfs.controller';
import { upload } from '../middleware/upload.middleware';

export const ipfsRouter = Router();

/**
 * POST /api/ipfs/upload
 * 
 * Upload a file to IPFS via Crust Network.
 * 
 * Request:
 * - Content-Type: multipart/form-data
 * - Body: { file: File }
 * 
 * Response:
 * {
 *   "cid": "Qm...",
 *   "gatewayUrl": "https://gw.crustfiles.app/ipfs/Qm...",
 *   "filename": "example.json",
 *   "size": 1234
 * }
 */
ipfsRouter.post('/upload', upload.single('file'), uploadFile);

/**
 * GET /api/ipfs/test
 * 
 * Test endpoint to verify backend is working
 */
ipfsRouter.get('/test', (req, res) => {
  res.json({
    status: 'ok',
    message: 'IPFS backend is running',
    timestamp: new Date().toISOString(),
  });
});

