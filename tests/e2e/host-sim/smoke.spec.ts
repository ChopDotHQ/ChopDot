import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from './setup';

test.describe('host-api-test-sdk smoke', () => {
  test.setTimeout(90_000);

  test('embeds dist-dot-host savings circle in simulated host iframe', async ({ testHost }) => {
    const frame = testHost.productFrame();

    await expect(frame.getByTestId('dot-lab')).toBeVisible({ timeout: 60_000 });
    await expect(frame.getByTestId('summit-banner')).toContainText('Spend Cards next');

    const report = {
      gate: 'TransportGate',
      status: 'host-sim-partial',
      verified_at: new Date().toISOString(),
      product_url: process.env.DOT_HOST_PREVIEW_URL ?? 'http://127.0.0.1:4174/?chopdot-dot-lab=1&mode=savings_circle',
      notes:
        'Iframe embed smoke only — dot-lab entry does not call host-api-wrapper yet; waitForConnection not asserted',
    };

    const artifactsDir = path.join(process.cwd(), 'artifacts/polkadot-native');
    mkdirSync(artifactsDir, { recursive: true });
    const artifactPath = path.join(
      artifactsDir,
      `host-sim-smoke-${new Date().toISOString().slice(0, 10)}.json`,
    );
    writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`);
  });
});
