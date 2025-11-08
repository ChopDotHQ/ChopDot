// Hyperbridge bridge application URL
// Use app.hyperbridge.network for the user-facing bridge interface
const HYPERBRIDGE_BASE_URL = 'https://app.hyperbridge.network';

type HyperbridgeParams = {
  src?: string;
  dest?: string;
  asset: string;
  destAsset?: string;
};

/**
 * Build a Hyperbridge deep link with the provided routing parameters.
 * 
 * Note: Hyperbridge's URL parameter format is not publicly documented.
 * This function attempts common parameter formats, but if Hyperbridge uses
 * different keys/casing, users will land on the default bridge interface
 * where they can manually configure the transfer.
 * 
 * TODO: Verify actual parameter format with Hyperbridge documentation or API.
 */
export function getHyperbridgeUrl({ src, dest, asset, destAsset }: HyperbridgeParams): string {
  // If no destination/asset specified, return base URL
  if (!dest && !asset) {
    return HYPERBRIDGE_BASE_URL;
  }

  const search = new URLSearchParams();
  
  // Using common parameter format (from/to/asset)
  // NOTE: Hyperbridge's actual parameter format is undocumented.
  // If these parameters don't work, users will land on the default bridge interface.
  // TODO: Verify with Hyperbridge docs/API and adjust if needed.
  if (src) search.set('from', src);
  if (dest) search.set('to', dest);
  if (asset) search.set('asset', asset);
  if (destAsset) search.set('destAsset', destAsset);

  const query = search.toString();
  return query.length ? `${HYPERBRIDGE_BASE_URL}?${query}` : HYPERBRIDGE_BASE_URL;
}
