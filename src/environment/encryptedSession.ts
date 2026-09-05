const encoder = new TextEncoder();
const decoder = new TextDecoder();

export interface EncryptedSessionPacket {
  v: 1;
  kid: string;
  iv: string;
  ct: string;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

async function sha256(value: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', value));
}

export function createSessionSecret(): string {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function sessionRoutingKey(groupId: string, secret: string): Promise<Uint8Array> {
  return sha256(encoder.encode(`${groupId}:${secret}`));
}

export async function sessionRoutingName(groupId: string, secret: string): Promise<string> {
  return `group-${bytesToBase64Url(await sessionRoutingKey(groupId, secret))}`;
}

async function importSessionKey(secret: string): Promise<CryptoKey> {
  const keyBytes = base64UrlToBytes(secret);
  if (keyBytes.byteLength !== 32) throw new Error('Session secret must be 32 bytes.');
  return crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptSessionValue<T>(secret: string, value: T): Promise<EncryptedSessionPacket> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await importSessionKey(secret);
  const ciphertext = await crypto.subtle.encrypt({name: 'AES-GCM', iv}, key, encoder.encode(JSON.stringify(value)));
  const keyId = (await sha256(base64UrlToBytes(secret))).slice(0, 8);
  return {v: 1, kid: bytesToBase64Url(keyId), iv: bytesToBase64Url(iv), ct: bytesToBase64Url(new Uint8Array(ciphertext))};
}

export async function decryptSessionValue<T>(secret: string, packet: EncryptedSessionPacket): Promise<T> {
  assertEncryptedSessionPacket(packet);
  const key = await importSessionKey(secret);
  const plaintext = await crypto.subtle.decrypt(
    {name: 'AES-GCM', iv: base64UrlToBytes(packet.iv)},
    key,
    base64UrlToBytes(packet.ct),
  );
  return JSON.parse(decoder.decode(plaintext)) as T;
}

export function assertEncryptedSessionPacket(value: unknown): asserts value is EncryptedSessionPacket {
  if (!value || typeof value !== 'object') throw new Error('Encrypted session packet required.');
  const packet = value as Partial<EncryptedSessionPacket>;
  if (packet.v !== 1 || !packet.kid || !packet.iv || !packet.ct) {
    throw new Error('Encrypted session packet required.');
  }
}
