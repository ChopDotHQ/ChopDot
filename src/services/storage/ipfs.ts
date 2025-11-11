/**
 * IPFS Upload Service
 * 
 * Handles uploading files to IPFS via backend proxy (production) or direct upload (development).
 * 
 * Production: Uses backend API proxy to upload to Crust IPFS (no CORS issues)
 * Development: Falls back to direct upload if backend is not available
 * 
 * Automatic authentication: Signs message once per user, backend generates token automatically
 */

import { create } from 'ipfs-http-client';
import { getIPFSAuthSignature, setGlobalIPFSAuth } from './ipfsAuth';
import { getWalletAddress } from './getWalletAddress';

// Backend API URL (for production proxy)
const BACKEND_API_URL = import.meta.env.VITE_API_URL || '/api';
const USE_BACKEND_PROXY = import.meta.env.VITE_USE_IPFS_PROXY !== '0'; // Default to true

// Crust IPFS W3Auth Gateway (for direct uploads - development only)
// Using gw.crustfiles.app/api/v0 as per Crust's latest integration guide
const CRUST_IPFS_API = 'https://gw.crustfiles.app/api/v0';
// Alternative: Public IPFS gateway (fallback)
const CRUST_IPFS_API_ALT = 'https://ipfs.infura.io:5001/api/v0';
// Public IPFS Gateways (for reading files - anyone can access)
// Using multiple gateways for reliability
const IPFS_GATEWAYS = [
  'https://ipfs.io',
  'https://gateway.pinata.cloud',
  'https://dweb.link',
  'https://ipfs.filebase.io',
];
const CRUST_IPFS_GATEWAY = IPFS_GATEWAYS[0]; // Primary gateway

/**
 * Upload a file to IPFS
 * 
 * Uses backend proxy in production, falls back to direct upload in development.
 * 
 * @param file - File to upload
 * @param useCrustGateway - Whether to use Crust gateway (for direct upload fallback)
 * @returns CID (Content Identifier) of the uploaded file
 */
export async function uploadToIPFS(
  file: File,
  _useCrustGateway: boolean = true,
  walletAddress?: string
): Promise<string> {
  // Auto-detect wallet address if not provided
  const address = walletAddress || getWalletAddress();
  
  // Try backend proxy first (production)
  if (USE_BACKEND_PROXY) {
    try {
      console.log('[IPFS] Attempting file upload via backend proxy...');
      
      const formData = new FormData();
      formData.append('file', file);
      
      // Add wallet authentication if available (automatic token generation)
      if (address) {
        try {
          const signature = await getIPFSAuthSignature(address);
          formData.append('walletAddress', address);
          formData.append('signature', signature);
          
          // Also set in global scope for the fetch call
          setGlobalIPFSAuth(address, signature);
          
          console.log('[IPFS] Added user authentication for automatic token generation');
        } catch (error) {
          console.warn('[IPFS] Failed to get auth signature, continuing without it:', error);
          // Continue without auth - backend will use global token or fail gracefully
        }
      }
      
      const response = await fetch(`${BACKEND_API_URL}/ipfs/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Backend upload failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('[IPFS] File upload via backend proxy successful:', data.cid);
      
      return data.cid;
    } catch (error) {
      console.warn('[IPFS] Backend proxy failed, falling back to direct upload:', error);
      
      // Fall through to direct upload if backend is unavailable
      if (import.meta.env.PROD) {
        // In production, don't fall back - fail explicitly
        throw new Error(
          `Backend IPFS proxy unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  }
  
  // Direct upload fallback (development only) - Crust W3Auth gateway + fallback
  const endpoints = [
    { name: 'Crust W3Auth Gateway', url: CRUST_IPFS_API },
    { name: 'Public IPFS Gateway (Fallback)', url: CRUST_IPFS_API_ALT },
  ];

  let lastError: Error | null = null;

  for (const endpoint of endpoints) {
    try {
      console.log(`[IPFS] Attempting direct file upload via ${endpoint.name} (development mode)...`);
      
      const ipfs = create({
        url: endpoint.url,
      });

      // Upload file to IPFS
      const result = await ipfs.add(file, {
        pin: false,
        progress: (bytes: number) => {
          console.log(`Uploaded ${bytes} bytes via ${endpoint.name}`);
        },
      });

      // Extract CID (v0 or v1 format)
      const cid = result.cid.toString();
      console.log(`[IPFS] Direct file upload successful via ${endpoint.name}: ${cid}`);

      return cid;
    } catch (error) {
      console.warn(`[IPFS] ${endpoint.name} failed:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      // Continue to next endpoint
      continue;
    }
  }

  // All endpoints failed
  console.error('[IPFS] All direct file upload endpoints failed');
  throw new Error(
    `Failed to upload file to IPFS after trying all endpoints: ${lastError?.message || 'Unknown error'}`
  );
}

/**
 * Upload file buffer/array buffer to IPFS
 * 
 * Uses backend proxy in production, falls back to direct upload in development.
 * 
 * @param buffer - File buffer to upload
 * @param filename - Optional filename for the upload
 * @param useCrustGateway - Whether to use Crust gateway (for direct upload fallback)
 * @returns CID of the uploaded file
 */
export async function uploadBufferToIPFS(
  buffer: ArrayBuffer | Uint8Array,
  filename?: string,
  _useCrustGateway: boolean = true,
  walletAddress?: string
): Promise<string> {
  // Auto-detect wallet address if not provided
  const address = walletAddress || getWalletAddress();
  
  // Try backend proxy first (production)
  if (USE_BACKEND_PROXY) {
    try {
      console.log('[IPFS] Attempting upload via backend proxy...');
      
      const formData = new FormData();
      const blobBuffer: Uint8Array = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : (buffer as Uint8Array);
      formData.append('file', new Blob([blobBuffer as BlobPart]), filename || 'file');
      
      // Add wallet authentication if available (automatic token generation)
      if (address) {
        try {
          const signature = await getIPFSAuthSignature(address);
          formData.append('walletAddress', address);
          formData.append('signature', signature);
          
          // Also set in global scope for the fetch call
          setGlobalIPFSAuth(address, signature);
          
          console.log('[IPFS] Added user authentication for automatic token generation');
        } catch (error) {
          console.warn('[IPFS] Failed to get auth signature, continuing without it:', error);
          // Continue without auth - backend will use global token or fail gracefully
        }
      }
      
      const response = await fetch(`${BACKEND_API_URL}/ipfs/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Backend upload failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('[IPFS] Upload via backend proxy successful:', data.cid);
      
      return data.cid;
    } catch (error) {
      console.warn('[IPFS] Backend proxy failed, falling back to direct upload:', error);
      
      // Fall through to direct upload if backend is unavailable
      if (import.meta.env.PROD) {
        // In production, don't fall back - fail explicitly
        throw new Error(
          `Backend IPFS proxy unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  }
  
  // Direct upload fallback (development only) - Crust W3Auth gateway + fallback
  const endpoints = [
    { name: 'Crust W3Auth Gateway', url: CRUST_IPFS_API },
    { name: 'Public IPFS Gateway (Fallback)', url: CRUST_IPFS_API_ALT },
  ];

  let lastError: Error | null = null;

  for (const endpoint of endpoints) {
    try {
      console.log(`[IPFS] Attempting direct buffer upload via ${endpoint.name} (development mode)...`);
      
      const ipfs = create({
        url: endpoint.url,
      });

      const blobBuffer: Uint8Array = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : (buffer as Uint8Array);
      const file = new File([blobBuffer as BlobPart], filename || 'file', { type: 'application/octet-stream' });
      const result = await ipfs.add(file, {
        pin: false,
      });

      const cid = result.cid.toString();
      console.log(`[IPFS] Direct buffer upload successful via ${endpoint.name}: ${cid}`);

      return cid;
    } catch (error) {
      console.warn(`[IPFS] ${endpoint.name} failed:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      // Continue to next endpoint
      continue;
    }
  }

  // All endpoints failed
  console.error('[IPFS] All direct buffer upload endpoints failed');
  throw new Error(
    `Failed to upload buffer to IPFS after trying all endpoints: ${lastError?.message || 'Unknown error'}`
  );
}

/**
 * Get IPFS gateway URL for a CID
 * 
 * @param cid - Content Identifier
 * @param useCrustGateway - Whether to use Crust gateway (default: true)
 * @returns Full URL to access the file
 */
export function getIPFSGatewayUrl(cid: string, _useCrustGateway: boolean = true): string {
  // Always use primary gateway (fallback logic handled in fetch functions)
  return `${CRUST_IPFS_GATEWAY}/ipfs/${cid}`;
}

/**
 * Fetch from IPFS with automatic fallback across multiple gateways
 * 
 * @param cid - IPFS Content Identifier
 * @returns Response object or null if all gateways fail
 */
export async function fetchFromIPFSWithFallback(cid: string): Promise<Response | null> {
  let lastError: Error | null = null;
  
  for (const gateway of IPFS_GATEWAYS) {
    try {
      const url = `${gateway}/ipfs/${cid}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (response.ok) {
        return response;
      }
      
      // If 404, try next gateway (content might not be pinned on this gateway)
      if (response.status === 404) {
        console.warn(`[IPFS] Content not found on ${gateway}, trying next gateway...`);
        continue;
      }
      
      // For other errors, log and try next gateway
      console.warn(`[IPFS] Gateway ${gateway} returned ${response.status}, trying next...`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[IPFS] Gateway ${gateway} failed:`, lastError.message);
      // Continue to next gateway
    }
  }
  
  console.error(`[IPFS] All gateways failed for CID ${cid}:`, lastError);
  return null;
}

