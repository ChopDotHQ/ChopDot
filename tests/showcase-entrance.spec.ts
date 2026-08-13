import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {expect, test, type Page} from '@playwright/test';

const proofDir = path.resolve('proof/chopdot-candidate-2026-08-12/screenshots');
const appUrl = 'http://127.0.0.1:4177';

async function expectEntrance(page: Page) {
  await expect(page.getByText('Preview', {exact: true})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Zurich Dinner'})).toBeVisible();
  await expect(page.getByText('CHF 120', {exact: true})).toBeVisible();
  await expect(page.getByText('Mina', {exact: true})).toBeVisible();
  await expect(page.getByText('Leo', {exact: true})).toBeVisible();
  await expect(page.getByText('Nina', {exact: true})).toBeVisible();

  const action = page.getByRole('button', {name: /Review this spend/u});
  await expect(action).toBeVisible();
  await expect(action).toBeEnabled();

  const box = await action.boundingBox();
  const shell = await page.locator('.app-shell-frame').boundingBox();
  expect(box).not.toBeNull();
  expect(shell).not.toBeNull();
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual((shell?.y ?? 0) + (shell?.height ?? 0));

  await expect(page.getByRole('button', {name: 'Create account'})).toHaveCount(0);
  await expect(page.getByRole('button', {name: 'Log in'})).toHaveCount(0);
  await expect(page.getByRole('button', {name: 'Connect wallet'})).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(/\b(?:protocol|native|host|adapter|state machine|settlement)\b/iu);
}

test.beforeAll(async () => {
  await mkdir(proofDir, {recursive: true});
});

test('desktop entrance shows one honest preview and action above the fold', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 720});
  await page.goto(appUrl);
  await expectEntrance(page);
  await page.screenshot({path: path.join(proofDir, '01-entrance-desktop-1280x720.png'), fullPage: false});
});

test('mobile entrance routes through the existing guest action without creating money state', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto(appUrl);
  await expectEntrance(page);
  await page.screenshot({path: path.join(proofDir, '02-entrance-mobile-390x844.png'), fullPage: false});

  await page.getByRole('button', {name: /Review this spend/u}).click();
  await expect(page.getByRole('heading', {name: 'What should we call you?'})).toBeVisible();
  await expect(page.getByText('Zurich Dinner')).toHaveCount(0);
  await page.screenshot({path: path.join(proofDir, '03-existing-guest-action-mobile.png'), fullPage: false});

  await page.getByPlaceholder('Display name').fill('Mina');
  await page.getByRole('button', {name: 'Continue as Mina'}).click();
  await expect(page.getByText('Hey, Mina')).toBeVisible();
  await expect(page.getByText('No group spending yet')).toBeVisible();
  await page.screenshot({path: path.join(proofDir, '04-guest-home-no-fake-state-mobile.png'), fullPage: false});
});
