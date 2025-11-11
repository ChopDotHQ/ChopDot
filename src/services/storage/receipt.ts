/**
 * Receipt Upload Service
 * 
 * Handles uploading receipt images/files to IPFS/Crust for expense receipts.
 */

import { uploadToIPFS } from './ipfsWithOnboarding';
import { getIPFSGatewayUrl } from './ipfs';

export interface ReceiptUploadResult {
  cid: string;
  gatewayUrl: string;
}

/**
 * Upload a receipt file to IPFS/Crust
 * 
 * @param file - Receipt file (image or PDF)
 * @returns CID and gateway URL
 */
export async function uploadReceipt(file: File): Promise<ReceiptUploadResult> {
  try {
    console.log('[Receipt] Uploading receipt to IPFS...', {
      name: file.name,
      size: file.size,
      type: file.type,
    });
    
    // Upload to IPFS via Crust gateway
    const cid = await uploadToIPFS(file, true);
    const gatewayUrl = getIPFSGatewayUrl(cid, true);
    
    console.log('[Receipt] Receipt uploaded successfully', { cid, gatewayUrl });
    
    return {
      cid,
      gatewayUrl,
    };
  } catch (error) {
    console.error('[Receipt] Failed to upload receipt:', error);
    throw new Error(`Failed to upload receipt: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get receipt URL from CID
 * 
 * @param cid - Content Identifier
 * @returns Gateway URL for the receipt
 */
export function getReceiptUrl(cid: string): string {
  return getIPFSGatewayUrl(cid, true);
}

