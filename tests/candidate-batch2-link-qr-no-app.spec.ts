import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {expect, test, type Page} from '@playwright/test';

const baseUrl = 'http://127.0.0.1:4177/membership-bootstrap-preview.html';
const proofDir = path.resolve('proof/chopdot-candidate-2026-08-12/screenshots');

test.beforeAll(async () => mkdir(proofDir, {recursive: true}));

test('Nina enters by link and is not joined until Mina grants', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 720});
  await page.goto(`${baseUrl}?route=link`);
  await expectDecision(page, 'Opened from link');
  await expectCanonicalLinkAndQr(page);
  await page.screenshot({path: path.join(proofDir, '10-nina-link-decision-desktop-1280x720.png')});

  await page.getByRole('button', {name: 'Accept invite'}).click();
  await expect(page.getByRole('heading', {name: 'Nina accepted'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Add Nina'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Nina joined'})).toHaveCount(0);
  await page.screenshot({path: path.join(proofDir, '11-nina-accepted-not-joined-desktop-1280x720.png')});

  await page.getByRole('button', {name: 'Add Nina'}).click();
  await expect(page.getByRole('heading', {name: 'Nina joined'})).toBeVisible();
  await expectHeaderAndTitleInsideViewport(page, 'Nina joined');
  await page.screenshot({path: path.join(proofDir, '12-nina-joined-desktop-1280x720.png')});
});

test('QR enters the same explicit Nina decision on mobile', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto(`${baseUrl}?route=qr`);
  await expectDecision(page, 'Scanned QR');
  await expectCanonicalLinkAndQr(page);
  await page.screenshot({path: path.join(proofDir, '10-nina-qr-decision-mobile-390x844.png')});
  await page.getByRole('button', {name: 'Accept invite'}).click();
  await expect(page.getByRole('heading', {name: 'Nina accepted'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Nina joined'})).toHaveCount(0);
  await expectHeaderAndTitleInsideViewport(page, 'Nina accepted');
});

test('a forwarded invite fails safely for the wrong person', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto(`${baseUrl}?route=forwarded`);
  await expect(page.getByRole('heading', {name: 'This invite isn’t for you'})).toBeVisible();
  await expect(page.getByText('It was made for Nina. Forwarding it does not add anyone to Zurich Dinner.')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Accept invite'})).toHaveCount(0);
  await expectHeaderAndTitleInsideViewport(page, 'This invite isn’t for you');
  await page.screenshot({path: path.join(proofDir, '13-forwarded-wrong-person-mobile-390x844.png')});
});

test('an expired invite names the result and offers no stale acceptance', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto(`${baseUrl}?route=expired`);
  await expect(page.getByRole('heading', {name: 'This invite expired'})).toBeVisible();
  await expect(page.getByText('Nina was not added. Ask Mina to send a new invitation.')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Accept invite'})).toHaveCount(0);
  await expectHeaderAndTitleInsideViewport(page, 'This invite expired');
  await page.screenshot({path: path.join(proofDir, '14-expired-invite-mobile-390x844.png')});
});

test('limited no-app entry opens one dinner action without membership', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto(`${baseUrl}?route=limited`);
  await expect(page.getByRole('heading', {name: 'Review your dinner share'})).toBeVisible();
  await expect(page.getByText('You won’t join Zurich Dinner.')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Review dinner share'})).toBeVisible();
  await page.screenshot({path: path.join(proofDir, '15-limited-dinner-action-mobile-390x844.png')});
  await page.getByRole('button', {name: 'Review dinner share'}).click();
  await expect(page.getByRole('heading', {name: 'Dinner share opened'})).toBeVisible();
  await expect(page.getByText('without joining Zurich Dinner')).toBeVisible();
  await expect(page.getByRole('heading', {name: /joined/u})).toHaveCount(0);
  await page.screenshot({path: path.join(proofDir, '16-limited-dinner-opened-mobile-390x844.png')});
});

test('bootstrap screens avoid infrastructure language', async ({page}) => {
  for (const route of ['link', 'qr', 'forwarded', 'expired', 'limited']) {
    await page.goto(`${baseUrl}?route=${route}`);
    await expect(page.getByText('Local preview', {exact: true})).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/\b(?:protocol|native|host|adapter|kernel|state machine|group key|signature|proof)\b/iu);
  }
});

async function expectDecision(page: Page, entryLabel: string) {
  await expect(page.getByText('Local preview', {exact: true})).toBeVisible();
  await expect(page.getByText(new RegExp(entryLabel, 'u'))).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Join Zurich Dinner?'})).toBeVisible();
  await expect(page.getByText('Mina and Leo are already here.')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Accept invite'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Decline'})).toBeVisible();
}

async function expectCanonicalLinkAndQr(page: Page) {
  const values = await page.locator('html').evaluate(element => ({
    link: (element as HTMLElement).dataset.canonicalInviteUrl,
    qr: (element as HTMLElement).dataset.qrText,
  }));
  expect(values.link).toBeTruthy();
  expect(values.qr).toBe(values.link);
}

async function expectHeaderAndTitleInsideViewport(page: Page, headingName: string) {
  const brand = page.getByText('ChopDot', {exact: true});
  const label = page.getByText('Local preview', {exact: true});
  const heading = page.getByRole('heading', {name: headingName});
  const [brandBox, labelBox, headingBox] = await Promise.all([brand.boundingBox(), label.boundingBox(), heading.boundingBox()]);
  for (const box of [brandBox, labelBox, headingBox]) {
    expect(box?.x).toBeGreaterThanOrEqual(0);
    expect(box?.y).toBeGreaterThanOrEqual(0);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(page.viewportSize()?.width ?? 0);
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(page.viewportSize()?.height ?? 0);
  }
}
