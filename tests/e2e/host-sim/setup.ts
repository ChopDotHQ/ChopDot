import { test as base, expect } from '@playwright/test';
import { createTestHostFixture, PASEO_ASSET_HUB } from '@parity/host-api-test-sdk/playwright';

const productUrl = process.env.DOT_HOST_PREVIEW_URL ?? 'http://127.0.0.1:4174/?chopdot-dot-lab=1&mode=savings_circle';

const { testHost } = createTestHostFixture({
  productUrl,
  accounts: ['alice', 'bob'],
  chain: PASEO_ASSET_HUB,
});

export const test = base.extend({ testHost });
export { expect };
