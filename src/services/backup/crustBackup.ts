/**
 * Crust/IPFS Backup Service
 * 
 * Uploads pot snapshots to IPFS via Crust gateway and pins them on Crust chain.
 * 
 * Automatic authentication: Uses wallet address if available (signs once, caches signature)
 */

import { uploadBufferToIPFS } from '../storage/ipfsWithOnboarding';
import { getIPFSGatewayUrl } from '../storage/ipfs';
import { getWalletAddress } from '../storage/getWalletAddress';

export interface CrustUploadResult {
  cid: string;
  gatewayUrl: string;
}

/**
 * Upload pot snapshot to IPFS via Crust gateway
 * 
 * @param snapshot - JSON string of the pot snapshot
 * @returns CID and gateway URL
 */
export async function savePotSnapshotCrust(snapshot: string): Promise<CrustUploadResult> {
  try {
    console.log('[Crust] Uploading pot snapshot to IPFS...', {
      snapshotLength: snapshot.length,
      preview: snapshot.slice(0, 50),
    });
    
    // Convert snapshot string to buffer
    const buffer = new TextEncoder().encode(snapshot);
    
    // Get wallet address for automatic authentication
    const walletAddress = getWalletAddress();
    
    // Upload to IPFS via Crust gateway (with automatic auth if wallet connected)
    const cid = await uploadBufferToIPFS(buffer, 'pot-snapshot.json', true, walletAddress || undefined);
    
    const gatewayUrl = getIPFSGatewayUrl(cid, true);
    
    console.log('[Crust] Pot snapshot uploaded successfully', { cid, gatewayUrl });
    
    return {
      cid,
      gatewayUrl,
    };
  } catch (error) {
    console.error('[Crust] Failed to upload pot snapshot:', error);
    throw new Error(`Failed to upload pot snapshot to IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

