import {classifyPolkadotHostFrame, type PolkadotHostFrameContext} from './polkadotHostEnvironment.ts';

const HEX_32 = /^0x[0-9a-f]{64}$/u;
const LEGACY_MEMBERSHIP_REGISTRY_KEY = 'chopdot-membership-key-envelope-registry-v1';

/**
 * Products Devnet required every user to create a fresh username/account in
 * September 2026. Identity-bound local state from before that reset must never
 * be silently reattached to a new Product Account. Other environments retain
 * their existing registry namespace; this is deliberately not a global data
 * migration.
 */
export const PRODUCTS_DEVNET_IDENTITY_EPOCH = '2026-09';

export function productsDevnetMembershipRegistryStorageKey(
  input: {productId: string; accountPublicKeyHex: string},
  hostContext: PolkadotHostFrameContext = currentHostContext(),
): string {
  if (classifyPolkadotHostFrame(hostContext) !== 'products-devnet') {
    return LEGACY_MEMBERSHIP_REGISTRY_KEY;
  }
  const productId = input.productId.trim().toLowerCase();
  const accountPublicKeyHex = input.accountPublicKeyHex.trim().toLowerCase();
  if (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.dot$/u.test(productId)) {
    throw new Error('Products Devnet product identity is invalid.');
  }
  if (!HEX_32.test(accountPublicKeyHex)) {
    throw new Error('Products Devnet Product Account identity is invalid.');
  }
  return [
    'chopdot-membership-key-envelope-registry-v2',
    PRODUCTS_DEVNET_IDENTITY_EPOCH,
    productId,
    accountPublicKeyHex.slice(2),
  ].join(':');
}

function currentHostContext(): PolkadotHostFrameContext {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {embedded: false, referrerHost: ''};
  }
  let referrerHost = '';
  try {
    referrerHost = document.referrer ? new URL(document.referrer).hostname : '';
  } catch {
    referrerHost = '';
  }
  return {embedded: window.parent !== window, referrerHost};
}
