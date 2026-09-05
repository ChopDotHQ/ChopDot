import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {expect, test, type Page} from '@playwright/test';
import {releaseEvidencePath} from './support/releaseEvidencePath.ts';

const baseUrl = 'http://127.0.0.1:4177/membership-invitation-preview.html';
const proofDir = releaseEvidencePath('membership-invitation-ui');

test.beforeAll(async () => mkdir(proofDir, {recursive: true}));

test('real coordinator ceremony keeps acceptance pending until Mina grants membership', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 720});
  await openReadyCeremony(page);
  await page.screenshot({path: path.join(proofDir, '05-invitation-ready-desktop-1280x720.png')});

  await page.getByRole('button', {name: 'Invite Leo'}).click();
  await expect(page.getByRole('heading', {name: 'Join Zurich Dinner?'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Accept invite'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Leo joined'})).toHaveCount(0);
  await expectPreviewHeaderAtTop(page, 'Join Zurich Dinner?');
  await page.screenshot({path: path.join(proofDir, '05-invitation-pending-desktop-1280x720.png')});

  await page.getByRole('button', {name: 'Accept invite'}).click();
  await expect(page.getByRole('heading', {name: 'Leo accepted'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Add Leo'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Leo joined'})).toHaveCount(0);
  await page.getByRole('button', {name: 'Add Leo'}).click();
  await expect(page.getByRole('heading', {name: 'Leo joined'})).toBeVisible();
  await expectPreviewHeaderAtTop(page, 'Leo joined');
  await page.screenshot({path: path.join(proofDir, '09-invitation-joined-desktop-1280x720.png')});
});

test('mobile coordinator ceremony shows Leo acceptance as pending before Mina grants', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await openReadyCeremony(page);
  await page.getByRole('button', {name: 'Invite Leo'}).click();
  await expect(page.getByRole('heading', {name: 'Join Zurich Dinner?'})).toBeVisible();
  await page.screenshot({path: path.join(proofDir, '06-invitation-decision-mobile-390x844.png')});

  await page.getByRole('button', {name: 'Accept invite'}).click();
  await expect(page.getByRole('heading', {name: 'Leo accepted'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Add Leo'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Leo joined'})).toHaveCount(0);
  await expectPreviewHeaderAtTop(page, 'Leo accepted');
  await page.screenshot({path: path.join(proofDir, '07-invitation-accepted-mobile-390x844.png')});

  await page.getByRole('button', {name: 'Add Leo'}).click();
  await expect(page.getByRole('heading', {name: 'Leo joined'})).toBeVisible();
  await expectPreviewHeaderAtTop(page, 'Leo joined');
  await page.screenshot({path: path.join(proofDir, '09-invitation-joined-mobile-390x844.png')});
});

test('coordinator grant failure is explicit and retry completes the same ceremony', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto(`${baseUrl}?failGrant=1`);
  await page.getByRole('heading', {name: 'Invite Leo'}).waitFor();
  await page.getByRole('button', {name: 'Invite Leo'}).click();
  await page.getByRole('button', {name: 'Accept invite'}).click();
  await page.getByRole('button', {name: 'Add Leo'}).click();
  await expect(page.getByRole('heading', {name: 'Leo wasn’t added'})).toBeVisible();
  await expect(page.getByText('Nothing changed.')).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Leo joined'})).toHaveCount(0);
  await expectPreviewHeaderAtTop(page, 'Leo wasn’t added');
  await page.screenshot({path: path.join(proofDir, '08-invitation-grant-failed-mobile-390x844.png')});

  await page.getByRole('button', {name: 'Try again'}).click();
  await expect(page.getByRole('heading', {name: 'Leo joined'})).toBeVisible();
});

test('Leo may explicitly decline without membership', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await openReadyCeremony(page);
  await page.getByRole('button', {name: 'Invite Leo'}).click();
  await page.getByRole('button', {name: 'Decline'}).click();
  await expect(page.getByRole('heading', {name: 'Invite declined'})).toBeVisible();
  await expect(page.getByText('You were not added to Zurich Dinner.')).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Leo joined'})).toHaveCount(0);
});

test('normal invitation UI contains no infrastructure language', async ({page}) => {
  await openReadyCeremony(page);
  await page.getByRole('button', {name: 'Invite Leo'}).click();
  await expect(page.locator('body')).not.toContainText(/\b(?:protocol|native|host|adapter|kernel|state machine|group key|signature)\b/iu);
});

async function openReadyCeremony(page: Page) {
  await page.goto(baseUrl);
  await expect(page.getByText('Local preview', {exact: true})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Invite Leo'})).toBeVisible();
  await expect(page.getByRole('checkbox', {name: 'Select Leo'})).toHaveAttribute('aria-checked', 'true');
}

async function expectPreviewHeaderAtTop(page: Page, headingName: string) {
  const brand = page.getByText('ChopDot', {exact: true});
  const previewLabel = page.getByText('Local preview', {exact: true});
  const heading = page.getByRole('heading', {name: headingName});
  await expect(brand).toBeVisible();
  await expect(previewLabel).toBeVisible();
  await expect(heading).toBeVisible();
  const [brandBox, previewBox, headingBox] = await Promise.all([
    brand.boundingBox(),
    previewLabel.boundingBox(),
    heading.boundingBox(),
  ]);
  expect(brandBox?.y).toBeGreaterThanOrEqual(0);
  expect(previewBox?.y).toBeGreaterThanOrEqual(0);
  expect(headingBox?.y).toBeGreaterThanOrEqual(0);
  expect(brandBox?.y).toBeLessThan(80);
  expect(previewBox?.y).toBeLessThan(80);
  expect((headingBox?.y ?? 0) + (headingBox?.height ?? 0)).toBeLessThanOrEqual(page.viewportSize()?.height ?? 0);
}
