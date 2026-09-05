import {expect, test} from '@playwright/test';
import {createTestHostServer, PASEO_ASSET_HUB, type TestHostAPI} from '@parity/host-api-test-sdk';

const productUrl = 'http://127.0.0.1:4177/?developerChecks=1';

declare global {
  interface Window {
    __TEST_HOST__: TestHostAPI;
  }
}

test('native host readiness requires allocation, publish and subscribed readback', async ({browser}) => {
  const server = await createTestHostServer({
    productUrl,
    accounts: ['alice'],
    productAccounts: {'chopdot-shell-proof.dot/0': 'alice'},
    networks: [PASEO_ASSET_HUB],
  });
  const page = await browser.newPage();

  try {
    await page.goto(server.url);
    await expect.poll(() => page.evaluate(() => window.__TEST_HOST__.getConnectionStatus())).toBe('connected');
    await expect(page.locator('iframe')).toHaveCount(1);
    const frame = page.frames().find(candidate => candidate !== page.mainFrame());
    if (!frame) throw new Error('Product frame did not attach.');
    await expect.poll(() => frame.evaluate(() => Boolean(window.__CHOPDOT_HOST_ACTIONS__))).toBe(true);

    const report = await frame.evaluate(() => window.__CHOPDOT_HOST_ACTIONS__!.checkNativeHostReadiness(2_000));

    expect(report.status).toBe('ready');
    expect(report.completedStages).toEqual([
      'container',
      'identity',
      'service',
      'allowance',
      'publish',
      'readback',
    ]);
    expect(report.canaryBytes).toBeLessThanOrEqual(512);
    await expect.poll(() => page.evaluate(() => window.__TEST_HOST__.getSubmittedStatements().length)).toBe(1);
  } finally {
    await page.close();
    await server.close();
  }
});

