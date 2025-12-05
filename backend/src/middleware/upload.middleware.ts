/**
 * Upload Middleware
 * 
 * Handles file uploads with Multer.
 */

import multer from 'multer';

// Configure multer to store files in memory
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept all file types for IPFS uploads
    cb(null, true);
  },
});









