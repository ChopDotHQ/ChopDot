/**
 * Encrypted pot export/import utilities
 * Handles encryption/decryption of pot data using password-based encryption
 */

import { exportPotToJSON, importPotFromJSON } from '../pot-export';
import type { Pot } from '../../schema/pot';
import { deriveKeyPBKDF2, aesGcmEncrypt, aesGcmDecrypt, generateSalt } from './crypto';
import { arrayBufferToBase64, base64ToArrayBuffer, zeroUint8Array } from './bytes';

const DEFAULT_PBKDF2_ITERATIONS = 150000;

export interface EncryptedPotFile {
  ver: string;
  kdf: string;
  iter: number;
  salt: string; // base64
  algo: string;
  iv: string; // base64
  ciphertext: string; // base64
}

/**
 * Encrypt a pot and return as Blob (.chop file)
 */
export async function encryptPot(pot: Pot, password: string): Promise<Blob> {
  if (!password || password.trim().length === 0) {
    throw new Error('Password is required');
  }

  // Export pot to JSON string
  const plaintext = exportPotToJSON(pot);

  // Generate salt
  const salt = await generateSalt();

  // Derive key from password
  const key = await deriveKeyPBKDF2(password, salt, DEFAULT_PBKDF2_ITERATIONS);

  // Encrypt plaintext
  const { iv, ciphertext } = await aesGcmEncrypt(plaintext, key);

  // Build encrypted file structure
  const encryptedFile: EncryptedPotFile = {
    ver: 'v1',
    kdf: 'PBKDF2-SHA256',
    iter: DEFAULT_PBKDF2_ITERATIONS,
    salt: arrayBufferToBase64(salt.buffer as ArrayBuffer),
    algo: 'AES-GCM',
    iv: iv,
    ciphertext: ciphertext,
  };

  // Zero salt from memory
  zeroUint8Array(salt);

  // Convert to JSON and create Blob
  const jsonString = JSON.stringify(encryptedFile);
  return new Blob([jsonString], { type: 'application/json' });
}

/**
 * Decrypt a .chop file and return the pot
 */
export async function decryptPot(fileText: string, password: string): Promise<Pot> {
  if (!password || password.trim().length === 0) {
    throw new Error('Password is required');
  }

  // Parse encrypted file
  let encryptedFile: EncryptedPotFile;
  try {
    encryptedFile = JSON.parse(fileText);
  } catch (error) {
    throw new Error('Invalid file format - not a valid encrypted pot file');
  }

  // Validate file structure
  if (
    !encryptedFile.ver ||
    !encryptedFile.kdf ||
    !encryptedFile.iter ||
    !encryptedFile.salt ||
    !encryptedFile.algo ||
    !encryptedFile.iv ||
    !encryptedFile.ciphertext
  ) {
    throw new Error('Invalid encrypted file format - missing required fields');
  }

  // Validate version and algorithm
  if (encryptedFile.ver !== 'v1') {
    throw new Error(`Unsupported file version: ${encryptedFile.ver}`);
  }

  if (encryptedFile.kdf !== 'PBKDF2-SHA256' || encryptedFile.algo !== 'AES-GCM') {
    throw new Error('Unsupported encryption algorithm');
  }

  // Decode salt
  const saltBuffer = base64ToArrayBuffer(encryptedFile.salt);
  const salt = new Uint8Array(saltBuffer);

  // Derive key from password
  const key = await deriveKeyPBKDF2(password, salt, encryptedFile.iter);

  // Decrypt ciphertext
  let plaintext: string;
  try {
    plaintext = await aesGcmDecrypt(encryptedFile.ciphertext, encryptedFile.iv, key);
  } catch (error) {
    // Zero salt before throwing
    zeroUint8Array(salt);
    throw error;
  }

  // Zero salt from memory
  zeroUint8Array(salt);

  // Import pot from decrypted JSON
  const result = importPotFromJSON(plaintext);
  if (!result.success || !result.pot) {
    throw new Error(result.error || 'Failed to import decrypted pot');
  }

  return result.pot;
}

/**
 * Download encrypted pot as .chop file
 */
export function downloadEncryptedPot(blob: Blob, filename?: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `pot-encrypted-${Date.now()}.chop`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Read encrypted pot file from File object
 */
export function readEncryptedPotFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        reject(new Error('File is empty'));
        return;
      }
      resolve(text);
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

