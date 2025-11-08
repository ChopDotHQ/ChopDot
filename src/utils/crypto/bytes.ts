/**
 * Byte array utilities for crypto operations
 * Handles base64 encoding/decoding and UTF-8 string conversion
 */

/**
 * Convert ArrayBuffer to base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      binary += String.fromCharCode(byte);
    }
  }
  return btoa(binary);
}

/**
 * Convert base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Encode UTF-8 string to ArrayBuffer
 */
export function utf8Encode(str: string): ArrayBuffer {
  return new TextEncoder().encode(str).buffer;
}

/**
 * Decode ArrayBuffer to UTF-8 string
 */
export function utf8Decode(buffer: ArrayBuffer): string {
  return new TextDecoder().decode(buffer);
}

/**
 * Zero out a Uint8Array (security: clear sensitive data from memory)
 */
export function zeroUint8Array(arr: Uint8Array): void {
  arr.fill(0);
}

/**
 * Generate random bytes using WebCrypto
 */
export async function randomBytes(length: number): Promise<Uint8Array> {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return arr;
}

