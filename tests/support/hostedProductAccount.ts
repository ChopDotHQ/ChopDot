import {expect, type Browser, type Frame, type Page} from '@playwright/test';
import {
  createTestHostServer,
  PASEO_ASSET_HUB,
  type DevAccountName,
  type TestHostServer,
} from '@parity/host-api-test-sdk';

export type HostedProductAccount = {
  account: DevAccountName;
  server: TestHostServer;
  page: Page;
  frame: Frame;
};

export async function openHostedProduct(
  browser: Browser,
  input: {
    productUrl?: string;
    account?: DevAccountName;
    bindAccount?: boolean;
    viewport?: {width: number; height: number};
  } = {},
): Promise<HostedProductAccount> {
  const account = input.account ?? 'alice';
  const server = await createTestHostServer({
    productUrl: input.productUrl ?? 'http://127.0.0.1:4177/',
    accounts: [account],
    productAccounts: {'chopdot-shell-proof.dot/0': account},
    networks: [PASEO_ASSET_HUB],
  });
  const page = await browser.newPage({viewport: input.viewport ?? {width: 390, height: 844}});
  await page.goto(server.url);
  await expect.poll(
    () => page.evaluate(() => (window as typeof window & {__TEST_HOST__: {getConnectionStatus(): string}}).__TEST_HOST__.getConnectionStatus()),
    {timeout: 15_000},
  ).toBe('connected');
  let frame = currentProductFrame(page);
  if (input.bindAccount !== false) {
    await frame.getByRole('button', {name: 'Use my Product Account'}).click();
    await expect(frame.getByText(new RegExp(`Hey, ${account}`, 'iu'))).toBeVisible({timeout: 15_000});
    await page.waitForTimeout(1_000);
    frame = currentProductFrame(page);
    await expect(frame.getByText(new RegExp(`Hey, ${account}`, 'iu'))).toBeVisible({timeout: 15_000});
  }
  return {account, server, page, frame};
}

export async function closeHostedProduct(product: HostedProductAccount): Promise<void> {
  await product.page.close();
  await product.server.close();
}

export async function refreshHostedProduct(product: HostedProductAccount): Promise<Frame> {
  await product.page.reload({waitUntil: 'domcontentloaded'});
  await expect.poll(
    () => product.page.evaluate(() => (window as typeof window & {__TEST_HOST__: {getConnectionStatus(): string}}).__TEST_HOST__.getConnectionStatus()),
    {timeout: 15_000},
  ).toBe('connected');
  let frame = currentProductFrame(product.page);
  if (await frame.getByRole('button', {name: 'Use my Product Account'}).count()) {
    await frame.getByRole('button', {name: 'Use my Product Account'}).click();
  }
  await product.page.waitForTimeout(1_000);
  frame = currentProductFrame(product.page);
  await expect(frame.getByText(new RegExp(`Hey, ${product.account}`, 'iu'))).toBeVisible({timeout: 15_000});
  product.frame = frame;
  return frame;
}

export function currentProductFrame(page: Page): Frame {
  const frame = page.frames().find(candidate => candidate !== page.mainFrame());
  if (!frame) throw new Error('Product frame did not attach.');
  return frame;
}
