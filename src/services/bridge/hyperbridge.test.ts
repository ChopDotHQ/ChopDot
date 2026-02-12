import { describe, expect, it } from 'vitest';
import { getHyperbridgeUrl } from './hyperbridge';

describe('getHyperbridgeUrl', () => {
  it('returns base URL when no params are provided', () => {
    expect(getHyperbridgeUrl({})).toBe('https://app.hyperbridge.network');
  });

  it('builds URL with routing params', () => {
    const url = getHyperbridgeUrl({
      src: 'polkadot',
      dest: 'assethub',
      asset: 'DOT',
      destAsset: 'USDC',
    });

    expect(url).toContain('https://app.hyperbridge.network?');
    expect(url).toContain('from=polkadot');
    expect(url).toContain('to=assethub');
    expect(url).toContain('asset=DOT');
    expect(url).toContain('destAsset=USDC');
  });
});
