export const config = {
  runtime: 'edge',
};

const DEFAULT_RATE_LIMIT_MAX = 15;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

const getEnvNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getClientIp = (request: Request): string => {
  const forwarded = request.headers.get('x-forwarded-for');
  if (!forwarded) return 'unknown';
  return forwarded.split(',')[0]?.trim() || 'unknown';
};

const isRateLimited = (key: string, now: number, max: number, windowMs: number): boolean => {
  const current = rateLimitStore.get(key);
  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  if (current.count >= max) {
    return true;
  }
  current.count += 1;
  return false;
};

const parseCidFromResponse = async (response: Response): Promise<string> => {
  const text = await response.text();
  const line = text.trim().split('\n').pop();
  if (!line) {
    throw new Error('Empty response from IPFS gateway');
  }
  const payload = JSON.parse(line) as Record<string, unknown>;
  const hash = payload.Hash ?? payload.hash ?? payload.cid;
  if (typeof hash === 'string' && hash.length > 0) {
    return hash;
  }
  const nestedCid = payload.Cid;
  if (nestedCid && typeof nestedCid === 'object' && '/' in nestedCid) {
    const cid = (nestedCid as Record<string, unknown>)['/'];
    if (typeof cid === 'string' && cid.length > 0) {
      return cid;
    }
  }
  throw new Error('Missing CID in IPFS response');
};

const buildCrustAuthHeader = (walletAddress?: string, signature?: string): string | null => {
  if (walletAddress && signature) {
    return `Basic ${btoa(`sub-${walletAddress}:${signature}`)}`;
  }
  const fallbackToken = process.env.CRUST_W3AUTH_TOKEN;
  return fallbackToken ? `Basic ${fallbackToken}` : null;
};

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const now = Date.now();
  const maxRequests = getEnvNumber(process.env.IPFS_RATE_LIMIT_MAX, DEFAULT_RATE_LIMIT_MAX);
  const windowMs = getEnvNumber(process.env.IPFS_RATE_LIMIT_WINDOW_MS, DEFAULT_RATE_LIMIT_WINDOW_MS);
  const maxBytes = getEnvNumber(process.env.IPFS_UPLOAD_MAX_BYTES, DEFAULT_MAX_UPLOAD_BYTES);
  const clientIp = getClientIp(request);

  if (isRateLimited(clientIp, now, maxRequests, windowMs)) {
    return new Response('Rate limit exceeded', { status: 429 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    console.error('[IPFS API] Failed to parse form data', error);
    return new Response('Invalid form data', { status: 400 });
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return new Response('Missing file', { status: 400 });
  }

  if (file.size > maxBytes) {
    return new Response('File too large', { status: 413 });
  }

  const walletAddress = formData.get('walletAddress');
  const signature = formData.get('signature');
  const authHeader = buildCrustAuthHeader(
    typeof walletAddress === 'string' ? walletAddress : undefined,
    typeof signature === 'string' ? signature : undefined
  );

  const uploadForm = new FormData();
  uploadForm.append('file', file, file.name);
  uploadForm.append('pin', 'false');

  const uploadUrl = process.env.CRUST_IPFS_API || 'https://gw.crustfiles.app/api/v0/add';

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: authHeader ? { Authorization: authHeader } : undefined,
    body: uploadForm,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[IPFS API] Upload failed', response.status, errorBody);
    return new Response('IPFS upload failed', { status: response.status });
  }

  try {
    const cid = await parseCidFromResponse(response);
    return Response.json({ cid }, { status: 200 });
  } catch (error) {
    console.error('[IPFS API] Failed to parse IPFS response', error);
    return new Response('Invalid IPFS response', { status: 502 });
  }
}
