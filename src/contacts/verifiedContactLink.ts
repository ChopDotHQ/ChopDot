import {
  assertSignedContactCarrierMessage,
  type SignedContactCarrierMessageV1,
} from './verifiedContact.ts';

export const VERIFIED_CONTACT_PARAM = 'chopdot-contact';

export function verifiedContactUrl(baseUrl: string, message: SignedContactCarrierMessageV1): string {
  assertSignedContactCarrierMessage(message);
  const url = new URL(baseUrl);
  url.hash = `${VERIFIED_CONTACT_PARAM}=${encode(message)}`;
  return url.toString();
}

export function verifiedContactFromUrl(input: string): SignedContactCarrierMessageV1 | null {
  try {
    const url = new URL(input);
    const fragment = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
    const params = new URLSearchParams(fragment);
    if ([...params.keys()].length !== 1 || !params.has(VERIFIED_CONTACT_PARAM)) return null;
    const encoded = params.get(VERIFIED_CONTACT_PARAM);
    if (!encoded) return null;
    const value = JSON.parse(new TextDecoder().decode(fromBase64Url(encoded))) as unknown;
    assertSignedContactCarrierMessage(value);
    return value;
  } catch {
    return null;
  }
}

function encode(value: unknown): string {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}

function toBase64Url(value: Uint8Array): string {
  let binary = '';
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/gu, '');
}

function fromBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new Error('Invalid contact carrier.');
  const base64 = value.replace(/-/gu, '+').replace(/_/gu, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

