/**
 * IPFS Controller
 * 
 * Handles IPFS upload requests with automatic user authentication.
 */

import { Request, Response } from 'express';
import { uploadToIPFS } from '../services/ipfs.service';
import { generateCrustWeb3AuthToken } from '../utils/crustAuth';

/**
 * Upload file to IPFS
 * 
 * POST /api/ipfs/upload
 * Content-Type: multipart/form-data
 * Body: { file: File }
 */
export async function uploadFile(req: Request, res: Response): Promise<void> {
  try {
    // Log request details for debugging
    console.log('[IPFS Controller] Received upload request', {
      hasFile: !!req.file,
      bodyKeys: Object.keys(req.body || {}),
      contentType: req.headers['content-type'],
    });

    if (!req.file) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'No file provided',
        },
      });
      return;
    }

    const { buffer, originalname } = req.file;

    // Get user authentication (if provided)
    // Frontend sends: walletAddress and signature for automatic token generation
    // Note: Multer puts form fields in req.body
    const walletAddress = req.body?.walletAddress as string | undefined;
    const signature = req.body?.signature as string | undefined;
    
    console.log('[IPFS Controller] Auth details', {
      hasWalletAddress: !!walletAddress,
      hasSignature: !!signature,
      walletAddressPreview: walletAddress ? walletAddress.slice(0, 10) + '...' : 'none',
    });

    let userAuthToken: string | undefined;

    // Generate user-specific token if wallet address and signature provided
    if (walletAddress && signature) {
      try {
        userAuthToken = generateCrustWeb3AuthToken(walletAddress, signature);
        console.log('[IPFS Controller] Generated user auth token', {
          walletAddress: walletAddress.slice(0, 10) + '...',
        });
      } catch (error) {
        console.warn('[IPFS Controller] Failed to generate user token, continuing without it:', error);
        // Continue without user token - will use global token or fail
      }
    }

    // Upload to IPFS (with user token if available)
    const result = await uploadToIPFS(buffer, originalname, userAuthToken);

    res.json({
      cid: result.cid,
      gatewayUrl: result.gatewayUrl,
      filename: originalname,
      size: buffer.length,
    });
  } catch (error) {
    console.error('[IPFS Controller] Upload failed:', error);
    console.error('[IPFS Controller] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('[IPFS Controller] Request body keys:', Object.keys(req.body || {}));
    console.error('[IPFS Controller] Has file:', !!req.file);
    console.error('[IPFS Controller] Has walletAddress:', !!req.body?.walletAddress);
    console.error('[IPFS Controller] Has signature:', !!req.body?.signature);
    
    // Check if it's an authentication error
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
    const isAuthError = errorMessage.includes('403') || errorMessage.includes('Forbidden') || errorMessage.includes('Unauthorized') || errorMessage.includes('project id');
    
    const statusCode = isAuthError ? 401 : 500;
    const errorResponse: any = {
      error: {
        code: isAuthError ? 'AUTH_REQUIRED' : 'UPLOAD_FAILED',
        message: isAuthError 
          ? 'IPFS authentication required. Please sign a message with your wallet.'
          : (process.env.NODE_ENV === 'development' ? errorMessage : 'Failed to upload file to IPFS'),
      },
    };
    
    // Always include error details for debugging
    errorResponse.error.details = {
      errorMessage,
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorType: error?.constructor?.name || 'Unknown',
      ...(error instanceof Error && error.stack && {
        stack: error.stack.split('\n').slice(0, 15),
      }),
    };
    
    res.status(statusCode).json(errorResponse);
  }
}

