const encoder = new TextEncoder();

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isSafeInteger(value)) {
      throw new Error('Canonical data may contain only safe integer numbers.');
    }
    return String(value);
  }
  if (Array.isArray(value)) return `[${value.map(item => canonicalJson(item)).join(',')}]`;
  if (isRecord(value)) {
    const entries = Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(',')}}`;
  }
  throw new Error('Canonical data must be JSON-compatible.');
}

/** Byte-stable UTF-8 encoding for values accepted by {@link canonicalJson}. */
export function canonicalBytes(value: unknown): Uint8Array {
  return encoder.encode(canonicalJson(value));
}

/**
 * Canonical bytes with an explicit protocol domain. Keeping the domain inside
 * the encoded value prevents one signed/hashable record type being replayed as
 * another while preserving the v1 JSON codec.
 */
export function domainSeparatedCanonicalBytes(domain: string, value: unknown): Uint8Array {
  if (!domain.trim()) throw new Error('Canonical domain is invalid.');
  return canonicalBytes([domain, value]);
}

export function canonicalHash(value: unknown): Promise<string> {
  return sha256Hex(canonicalBytes(value));
}

export async function sha256Hex(value: string | Uint8Array): Promise<string> {
  const bytes = typeof value === 'string' ? encoder.encode(value) : value;
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return bytesToHex(digest);
}

export function bytesToHex(bytes: Uint8Array): string {
  return `0x${Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

export function hexToBytes(value: string): Uint8Array {
  const normalized = value.toLowerCase().replace(/^0x/u, '');
  if (!normalized || normalized.length % 2 !== 0 || !/^[0-9a-f]+$/u.test(normalized)) {
    throw new Error('Hex value is invalid.');
  }
  return Uint8Array.from(normalized.match(/.{2}/gu) ?? [], pair => Number.parseInt(pair, 16));
}

export function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
