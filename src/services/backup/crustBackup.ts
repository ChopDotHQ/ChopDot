/**
 * Crust/IPFS Backup Service - Placeholder
 * 
 * Placeholder for future Crust integration.
 * Do NOT upload yet — simply logs fake CID for development.
 * 
 * When Crust credentials are ready, this will:
 * 1. Upload pot snapshot to Crust/IPFS
 * 2. Return { cid, gatewayUrl }
 * 3. Append cid to remark for on-chain anchoring
 */

export interface CrustUploadResult {
  cid: string;
  gatewayUrl?: string;
}

/**
 * Placeholder upload function
 * Returns a fake CID for development/testing
 */
export async function savePotSnapshotCrust(snapshot: string): Promise<CrustUploadResult> {
  console.log('[Crust] Placeholder upload (not actually uploading)', {
    snapshotLength: snapshot.length,
    preview: snapshot.slice(0, 50),
  });
  
  // Simulate upload delay
  await new Promise((r) => setTimeout(r, 500));
  
  // Generate fake CID for testing
  const fakeCid = `bafybeifakecid${Math.random().toString(36).slice(2, 8)}`;
  
  return {
    cid: fakeCid,
    gatewayUrl: `https://ipfs.io/ipfs/${fakeCid}`,
  };
}

