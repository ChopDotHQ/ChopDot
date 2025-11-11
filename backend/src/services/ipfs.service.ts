/**
 * IPFS Service
 * 
 * Handles uploading files to IPFS via Crust Network.
 * Production-ready with proper error handling and logging.
 */

// Use dynamic import to avoid ESM/CJS issues
let ipfsClient: any = null;

async function getIPFSClient(endpoint?: string, headers?: Record<string, string>) {
  try {
    console.log('[IPFS Service] Importing ipfs-http-client...');
    const { create } = await import('ipfs-http-client');
    console.log('[IPFS Service] Successfully imported ipfs-http-client');
    
    const url = endpoint || CRUST_IPFS_API;
    
    // Configure IPFS client
    // Note: ipfs-http-client v60+ uses Node's native fetch (Node 18+)
    const config: any = {
      url: url,
      timeout: 30000, // 30 seconds
    };
    
    // Node.js 18+ has native fetch, no need to configure explicitly
    // The library will use it automatically
    
    // Add authentication headers if provided
    if (headers && Object.keys(headers).length > 0) {
      config.headers = headers;
      console.log('[IPFS Service] Client config with auth:', {
        url,
        hasAuth: true,
        authHeader: Object.keys(headers)[0],
        headerKeys: Object.keys(headers),
      });
    } else {
      console.log('[IPFS Service] Client config without auth:', { url });
    }
    
    console.log('[IPFS Service] Creating IPFS client with config:', {
      url: config.url,
      hasHeaders: !!config.headers,
      timeout: config.timeout,
    });
    
    try {
      const client = create(config);
      console.log('[IPFS Service] IPFS client created successfully');
      
      // Test the client by calling a simple method
      try {
        const version = await client.version();
        console.log('[IPFS Service] Client test successful, IPFS version:', version);
      } catch (testError) {
        console.warn('[IPFS Service] Client test failed (non-critical):', testError instanceof Error ? testError.message : String(testError));
        // Continue anyway - the client might still work for uploads
      }
      
      return client;
    } catch (createError) {
      console.error('[IPFS Service] Failed to create client:', createError);
      throw createError;
    }
  } catch (error) {
    console.error('[IPFS Service] Failed to create IPFS client:', error);
    console.error('[IPFS Service] Error type:', error?.constructor?.name);
    console.error('[IPFS Service] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[IPFS Service] Error stack:', error instanceof Error ? error.stack : 'No stack');
    throw new Error(`Failed to create IPFS client: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Crust IPFS W3Auth Gateway (for uploads) - RECOMMENDED by Crust docs
// Using gw.crustfiles.app/api/v0 as per Crust's latest integration guide
const CRUST_IPFS_API = process.env.CRUST_IPFS_API || 'https://gw.crustfiles.app/api/v0';
// Alternative: Public IPFS gateway (fallback if Crust gateway fails)
const CRUST_IPFS_API_ALT = process.env.CRUST_IPFS_API_ALT || 'https://ipfs.infura.io:5001/api/v0';
// Public IPFS Gateway (for reading files - anyone can access)
// Using ipfs.io as primary gateway (most reliable)
const CRUST_IPFS_GATEWAY = process.env.CRUST_IPFS_GATEWAY || 'https://ipfs.io';
// Crust Pinning Service API (for storage orders - separate from upload)
const CRUST_PINNING_API = process.env.CRUST_PINNING_API || 'https://pin.crustcode.com/psa';

// Authentication (if required)
const CRUST_API_KEY = process.env.CRUST_API_KEY;
const CRUST_W3AUTH_TOKEN = process.env.CRUST_W3AUTH_TOKEN;

export interface IPFSUploadResult {
  cid: string;
  gatewayUrl: string;
}

/**
 * Upload a buffer to IPFS via Crust
 * 
 * @param buffer - File buffer to upload
 * @param filename - Optional filename
 * @param userAuthToken - Optional user-specific Web3Auth token (for automatic auth)
 * @returns CID and gateway URL
 */
export async function uploadToIPFS(
  buffer: Buffer,
  filename?: string,
  userAuthToken?: string
): Promise<IPFSUploadResult> {
  // Use Crust W3Auth gateway (recommended) and fallback to public IPFS gateway
  const endpoints = [
    { name: 'Crust W3Auth Gateway', url: CRUST_IPFS_API },
    { name: 'Public IPFS Gateway (Fallback)', url: CRUST_IPFS_API_ALT },
  ];

  let lastError: Error | null = null;

  // Prepare authentication headers
  // Priority: user token > global token > API key
  const authHeaders: Record<string, string> = {};
  if (userAuthToken) {
    // User-specific token (automatic generation)
    authHeaders['Authorization'] = `Basic ${userAuthToken}`;
    console.log('[IPFS Service] Using user-specific Web3Auth token');
  } else if (CRUST_W3AUTH_TOKEN) {
    // Global token (fallback for admin/system uploads)
    authHeaders['Authorization'] = `Basic ${CRUST_W3AUTH_TOKEN}`;
    console.log('[IPFS Service] Using global Web3Auth token');
  } else if (CRUST_API_KEY) {
    // API key (if available)
    authHeaders['Authorization'] = `Bearer ${CRUST_API_KEY}`;
    console.log('[IPFS Service] Using API key');
  } else {
    console.warn('[IPFS Service] No authentication configured - uploads may fail');
  }

  for (const endpoint of endpoints) {
    try {
      console.log(`[IPFS Service] Attempting upload via ${endpoint.name}`, {
        size: buffer.length,
        filename: filename || 'unnamed',
        endpoint: endpoint.url,
        hasAuth: Object.keys(authHeaders).length > 0,
      });

      const client = await getIPFSClient(endpoint.url, Object.keys(authHeaders).length > 0 ? authHeaders : undefined);

      // Upload buffer directly
      // Note: ipfs-http-client expects Uint8Array or File/Blob
      const bufferToUpload = Buffer.isBuffer(buffer) 
        ? new Uint8Array(buffer) 
        : buffer instanceof Uint8Array 
        ? buffer 
        : new Uint8Array(buffer);

      console.log(`[IPFS Service] Uploading buffer via ${endpoint.name}`, {
        size: bufferToUpload.length,
        filename: filename || 'unnamed',
        bufferType: buffer.constructor.name,
      });

      // Try uploading with the IPFS client
      // Note: In newer versions, add() might return an async iterable
      console.log(`[IPFS Service] Calling client.add()...`, {
        bufferSize: bufferToUpload.length,
        filename: filename || 'unnamed',
        endpoint: endpoint.url,
      });
      
      let result: any;
      let addResult: any;
      
      try {
        addResult = await client.add(bufferToUpload, {
          pin: false,
          ...(filename && { wrapWithDirectory: false }),
        });
        console.log('[IPFS Service] client.add() completed, processing result...');
      } catch (addError) {
        console.error('[IPFS Service] client.add() threw error:', addError);
        console.error('[IPFS Service] add() error type:', addError?.constructor?.name);
        console.error('[IPFS Service] add() error message:', addError instanceof Error ? addError.message : String(addError));
        console.error('[IPFS Service] add() error stack:', addError instanceof Error ? addError.stack : 'No stack');
        throw addError; // Re-throw to be caught by outer catch
      }
      
      // Handle both single result and async iterable
      if (addResult && typeof addResult[Symbol.asyncIterator] === 'function') {
        // It's an async iterable - get the first result
        console.log('[IPFS Service] add() returned async iterable, getting first result...');
        for await (const item of addResult) {
          result = item;
          break;
        }
      } else {
        // It's a single result
        result = addResult;
      }
      
      if (!result || !result.cid) {
        throw new Error('IPFS add() did not return a valid result with CID');
      }
      
      console.log(`[IPFS Service] Got result from add():`, {
        hasCid: !!result.cid,
        cidType: result.cid?.constructor?.name,
      });

      const cid = result.cid.toString();
      const gatewayUrl = `${CRUST_IPFS_GATEWAY}/ipfs/${cid}`;

      console.log(`[IPFS Service] Upload successful via ${endpoint.name}`, {
        cid,
        gatewayUrl,
        size: result.size,
        endpoint: endpoint.url,
      });

      return {
        cid,
        gatewayUrl,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorDetails = error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 10),
        cause: (error as any).cause,
      } : { raw: String(error) };
      
      console.error(`[IPFS Service] ${endpoint.name} failed:`, errorMsg);
      console.error(`[IPFS Service] ${endpoint.name} error details:`, JSON.stringify(errorDetails, null, 2));
      console.error(`[IPFS Service] ${endpoint.name} endpoint URL:`, endpoint.url);
      console.error(`[IPFS Service] ${endpoint.name} had auth headers:`, Object.keys(authHeaders).length > 0);
      
      // Check if it's a network/fetch error
      if (errorMsg.includes('fetch') || errorMsg.includes('network') || errorMsg.includes('ECONNREFUSED') || errorMsg.includes('ENOTFOUND')) {
        console.error(`[IPFS Service] ${endpoint.name} - Network error detected. This might be:`, {
          endpointReachable: 'Unknown - check network connectivity',
          possibleCauses: [
            'Endpoint is down',
            'DNS resolution failed',
            'Firewall blocking request',
            'SSL/TLS certificate issue',
          ],
        });
      }
      
      lastError = error instanceof Error ? error : new Error(String(error));
      // Continue to next endpoint
      continue;
    }
  }

  // All endpoints failed
  console.error('[IPFS Service] All IPFS endpoints failed');
  console.error('[IPFS Service] Last error:', lastError);
  console.error('[IPFS Service] Last error details:', {
    name: lastError?.name,
    message: lastError?.message,
    stack: lastError?.stack,
    cause: (lastError as any)?.cause,
  });
  
  // Try direct HTTP upload as fallback
  console.log('[IPFS Service] Attempting direct HTTP upload as final fallback...');
  try {
    return await uploadViaDirectHTTP(buffer, filename, userAuthToken);
  } catch (directError) {
    console.error('[IPFS Service] Direct HTTP upload also failed:', directError);
    const errorMessage = lastError?.message || 'Unknown error';
    throw new Error(
      `Failed to upload to IPFS after trying all endpoints: ${errorMessage}`
    );
  }
}

/**
 * Upload via direct HTTP fetch (fallback method)
 * This bypasses the IPFS client library and uses native fetch with FormData
 */
async function uploadViaDirectHTTP(
  buffer: Buffer,
  filename?: string,
  userAuthToken?: string
): Promise<IPFSUploadResult> {
  const endpoint = CRUST_IPFS_API;
  const url = `${endpoint}/add?stream-channels=true&pin=false&progress=false`;
  
  console.log('[IPFS Service] Direct HTTP upload to:', url);
  
  // Use form-data package for Node.js
  const FormData = (await import('form-data')).default;
  const formData = new FormData();
  formData.append('file', buffer, filename || 'file');
  
  // Prepare headers
  const headers: Record<string, string> = {};
  
  // Add authentication if available
  if (userAuthToken) {
    headers['Authorization'] = `Basic ${userAuthToken}`;
    console.log('[IPFS Service] Direct HTTP upload with auth token');
  }
  
  // FormData will set Content-Type with boundary, so don't set it manually
  // But we need to get the headers from FormData
  const formHeaders = formData.getHeaders ? formData.getHeaders() : {};
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...formHeaders,
        ...headers,
      },
      body: formData as any,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    const cid = result.Hash || result.hash || result.cid;
    
    if (!cid) {
      throw new Error('No CID returned from IPFS');
    }
    
    const gatewayUrl = `${CRUST_IPFS_GATEWAY}/ipfs/${cid}`;
    
    console.log('[IPFS Service] Direct HTTP upload successful:', { cid, gatewayUrl });
    
    return {
      cid,
      gatewayUrl,
    };
  } catch (error) {
    console.error('[IPFS Service] Direct HTTP upload failed:', error);
    throw error;
  }
}

/**
 * Get IPFS gateway URL for a CID
 */
export function getIPFSGatewayUrl(cid: string): string {
  return `${CRUST_IPFS_GATEWAY}/ipfs/${cid}`;
}

