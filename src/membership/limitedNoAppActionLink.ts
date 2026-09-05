import {
  assertSignedLimitedNoAppAction,
  type SignedLimitedNoAppActionV1,
} from './limitedNoAppAction.ts';

export const LIMITED_NO_APP_ACTION_PARAM = 'chopdot-action';

/** URL is a signed request carrier only; service-side authority verification remains mandatory. */
export function limitedNoAppActionUrl(baseUrl: string, request: SignedLimitedNoAppActionV1): string {
  assertSignedLimitedNoAppAction(request);
  const url = new URL(baseUrl);
  url.searchParams.delete(LIMITED_NO_APP_ACTION_PARAM);
  url.hash = `${LIMITED_NO_APP_ACTION_PARAM}=${encode(request)}`;
  return url.toString();
}

export function limitedNoAppActionFromUrl(urlValue: string): SignedLimitedNoAppActionV1 {
  const url = new URL(urlValue);
  const hash = url.hash.replace(/^#/u, '');
  const params = new URLSearchParams(hash);
  const encoded = params.get(LIMITED_NO_APP_ACTION_PARAM);
  if (!encoded || params.size !== 1) throw new Error('Limited action link is invalid.');
  const request = decode(encoded);
  assertSignedLimitedNoAppAction(request);
  return request;
}

function encode(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function decode(value: string): unknown {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new Error('Limited action link is invalid.');
  try {
    const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
    const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    return JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
  } catch {
    throw new Error('Limited action link is invalid.');
  }
}
