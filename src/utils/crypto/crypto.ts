/**
 * WebCrypto-based encryption utilities
 * Uses PBKDF2 for key derivation and AES-GCM for encryption
 */

import { arrayBufferToBase64, base64ToArrayBuffer, utf8Encode, utf8Decode, zeroUint8Array, randomBytes } from './bytes';

const DEFAULT_PBKDF2_ITERATIONS = 150000;
const AES_GCM_IV_LENGTH = 12; // 96 bits, standard for AES-GCM
const PBKDF2_SALT_LENGTH = 16; // 128 bits

/**
 * Derive encryption key from password using PBKDF2-SHA256
 */
export async function deriveKeyPBKDF2(
  password: string,
  salt: Uint8Array,
  iterations: number = DEFAULT_PBKDF2_ITERATIONS
): Promise<CryptoKey> {
  // Encode password as UTF-8
  const passwordBuffer = utf8Encode(password);
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive key using PBKDF2
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: iterations,
      hash: 'SHA-256',
    },
    passwordKey,
    {
      name: 'AES-GCM',
      length: 256, // 256-bit key
    },
    false, // Not extractable
    ['encrypt', 'decrypt']
  );

  // Clear password from memory
  if (passwordBuffer instanceof ArrayBuffer) {
    const passwordView = new Uint8Array(passwordBuffer);
    zeroUint8Array(passwordView);
  }

  return key;
}

/**
 * Encrypt plaintext using AES-GCM
 * Returns: { iv: base64, ciphertext: base64 }
 */
export async function aesGcmEncrypt(
  plaintext: string,
  key: CryptoKey
): Promise<{ iv: string; ciphertext: string }> {
  // Generate random IV
  const iv = await randomBytes(AES_GCM_IV_LENGTH);
  
  // Encode plaintext
  const plaintextBuffer = utf8Encode(plaintext);
  
  // Encrypt
  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
    },
    key,
    plaintextBuffer
  );

  // Convert to base64
  const ivBase64 = arrayBufferToBase64(iv.buffer as ArrayBuffer);
  const ciphertextBase64 = arrayBufferToBase64(ciphertextBuffer);

  // Zero out sensitive data
  zeroUint8Array(iv);
  if (plaintextBuffer instanceof ArrayBuffer) {
    const plaintextView = new Uint8Array(plaintextBuffer);
    zeroUint8Array(plaintextView);
  }

  return {
    iv: ivBase64,
    ciphertext: ciphertextBase64,
  };
}

/**
 * Decrypt ciphertext using AES-GCM
 * Returns: plaintext string
 */
export async function aesGcmDecrypt(
  ciphertextBase64: string,
  ivBase64: string,
  key: CryptoKey
): Promise<string> {
  // Decode base64
  const iv = new Uint8Array(base64ToArrayBuffer(ivBase64));
  const ciphertextBuffer = base64ToArrayBuffer(ciphertextBase64);

  // Decrypt
  let plaintextBuffer: ArrayBuffer;
  try {
    plaintextBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as BufferSource,
      },
      key,
      ciphertextBuffer
    );
  } catch (error) {
    // Zero IV before throwing
    zeroUint8Array(iv);
    throw new Error('Decryption failed - incorrect password or corrupted file');
  }

  // Decode to string
  const plaintext = utf8Decode(plaintextBuffer);

  // Zero out sensitive data
  zeroUint8Array(iv);
  if (plaintextBuffer instanceof ArrayBuffer) {
    const plaintextView = new Uint8Array(plaintextBuffer);
    zeroUint8Array(plaintextView);
  }

  return plaintext;
}

/**
 * Generate random salt for PBKDF2
 */
export async function generateSalt(): Promise<Uint8Array> {
  return randomBytes(PBKDF2_SALT_LENGTH);
}

