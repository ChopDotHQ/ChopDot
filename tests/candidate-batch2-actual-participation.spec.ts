import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {expect, test, type Browser, type BrowserContext, type Page} from '@playwright/test';
import jsQR from 'jsqr';
import {PNG} from 'pngjs';
import {cryptoWaitReady, sr25519PairFromSeed, sr25519Sign} from '@polkadot/util-crypto';
import type {MembershipGrant} from '../src/membership/membershipLifecycle.ts';
import type {SignedMembershipEventV1} from '../src/membership/signedMembershipEvents.ts';
import {releaseEvidencePath} from './support/releaseEvidencePath.ts';

const baseUrl = 'http://127.0.0.1:4177';
const ninaEntry = `${baseUrl}/tests/fixtures/candidate-batch2-nina-actual-app.html`;
const minaEntry = `${baseUrl}/tests/fixtures/candidate-batch2-mina-actor.html`;
const screenshotDir = releaseEvidencePath('candidate-batch2-actual-participation', 'screenshots');

test.beforeAll(async () => mkdir(screenshotDir, {recursive: true}));

test('actual App keeps Nina waiting across restart and joins only after Mina delivers access', async ({browser}) => {
  const actors = await openActors(browser, {width: 1280, height: 720}, 'join_link');
  try {
    await actors.mina.screenshot({path: path.join(screenshotDir, '00-organizer-share-link-desktop-1280x720.png')});
    await expectDecision(actors.nina, 'Opened from link');
    await actors.nina.screenshot({path: path.join(screenshotDir, '01-link-decision-desktop-1280x720.png')});

    await actors.nina.getByRole('button', {name: 'Accept invite'}).click();
    await expectWaiting(actors.nina);
    await expect(actors.mina.getByRole('button', {name: 'Add this person'})).toBeVisible();

    await actors.nina.reload();
    await expectWaiting(actors.nina);
    await actors.nina.screenshot({path: path.join(screenshotDir, '02-accepted-after-restart-desktop-1280x720.png')});

    await actors.mina.screenshot({path: path.join(screenshotDir, '03-organizer-ready-desktop-1280x720.png')});
    await actors.mina.getByRole('button', {name: 'Add this person'}).click();
    await expect(actors.nina.getByRole('heading', {name: 'You joined'})).toBeVisible();
    await expect(actors.nina.getByText('You can now take part in this group.')).toBeVisible();
    await expectInsideViewport(actors.nina, 'You joined');
    await actors.nina.screenshot({path: path.join(screenshotDir, '04-joined-after-external-grant-desktop-1280x720.png')});
  } finally {
    await actors.close();
  }
});

test('actual App QR decision remains explicit on mobile and signed decline never joins', async ({browser}) => {
  const actors = await openActors(browser, {width: 390, height: 844}, 'qr');
  try {
    expect(actors.invitation.qrText).toBe(actors.invitation.url);
    await actors.mina.screenshot({path: path.join(screenshotDir, '05a-organizer-qr-mobile-390x844.png')});
    await expectDecision(actors.nina, 'Scanned QR');
    await expectInsideViewport(actors.nina, 'Join this group?');
    await actors.nina.screenshot({path: path.join(screenshotDir, '05-qr-decision-mobile-390x844.png')});

    await actors.nina.getByRole('button', {name: 'Decline'}).click();
    await expect(actors.nina.getByRole('heading', {name: 'Invite declined'})).toBeVisible();
    await expect(actors.nina.getByText('You were not added to this group.')).toBeVisible();
    await expect(actors.nina.getByRole('heading', {name: /joined/iu})).toHaveCount(0);
    await expect.poll(() => actors.mina.evaluate(() => window.__B2_MINA__!.lastInboundType())).toBe('INVITATION_DECLINED');
    await actors.nina.screenshot({path: path.join(screenshotDir, '06-declined-mobile-390x844.png')});
  } finally {
    await actors.close();
  }
});

test('actual App invitation surfaces contain no internal language', async ({browser}) => {
  const actors = await openActors(browser, {width: 390, height: 844}, 'join_link');
  try {
    await expectDecision(actors.nina, 'Opened from link');
    await expect(actors.nina.locator('body')).not.toContainText(/\b(?:SDK|host|Product Account|protocol|proof|key|grant|adapter|native|state machine)\b/iu);
  } finally {
    await actors.close();
  }
});

test('organizer link has a selectable fallback when copying is unavailable', async ({browser}) => {
  const context = await browser.newContext({viewport: {width: 390, height: 844}, permissions: []});
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {configurable: true, value: undefined});
  });
  const actors = await openActors(browser, {width: 390, height: 844}, 'join_link', context);
  try {
    await actors.mina.getByRole('button', {name: 'Copy invitation'}).click();
    await expect(actors.mina.getByText('Copy unavailable')).toBeVisible();
    const fallback = actors.mina.getByLabel('Select and copy this invitation');
    await expect(fallback).toHaveValue(actors.invitation.url);
  } finally {
    await actors.close();
  }
});

test('actual App shows malformed invitation and request links as unavailable', async ({browser}) => {
  const context = await browser.newContext({viewport: {width: 390, height: 844}});
  const page = await context.newPage();
  const state = {mode: 'clean', theme: 'light', currency: 'CHF', preferredPaymentMethod: null, currentUserId: 'nina', users: {nina: {id: 'nina', name: 'Nina'}}, groups: {}, expenses: {}, splits: {}, paymentMethods: {}, activityEvents: {}, savedRecords: {}};
  await context.addInitScript(value => localStorage.setItem('chopdot-portable-shell-state-v1', JSON.stringify(value)), state);
  try {
    await page.goto(`${baseUrl}/#chopdot-invite=damaged`);
    await expect(page.getByRole('heading', {name: 'This invitation can’t be opened'})).toBeVisible();
    await expect(page.getByText('The link may be incomplete or damaged. Ask the organizer to send a new one.')).toBeVisible();
    await page.screenshot({path: path.join(screenshotDir, '07-malformed-invitation-mobile-390x844.png')});

    await page.goto(`${baseUrl}/#chopdot-action=damaged`);
    await expect(page.getByRole('heading', {name: 'This request can’t be opened'})).toBeVisible();
    await expect(page.getByText('The link may be incomplete or damaged. Ask the organizer to send a new one.')).toBeVisible();
    await page.screenshot({path: path.join(screenshotDir, '08-malformed-request-mobile-390x844.png')});
  } finally {
    await context.close();
  }
});

async function openActors(browser: Browser, viewport: {width: number; height: number}, route: 'join_link' | 'qr', suppliedMinaContext?: BrowserContext) {
  await cryptoWaitReady();
  const minaPair = sr25519PairFromSeed(new Uint8Array(32).fill(11));
  const ninaPair = sr25519PairFromSeed(new Uint8Array(32).fill(33));
  const minaAccountPublicKeyHex = `0x${bytesToHex(minaPair.publicKey)}`;
  const ninaAccountPublicKeyHex = `0x${bytesToHex(ninaPair.publicKey)}`;
  const organizer: MembershipGrant = {
    groupId: 'zurich-dinner', participantId: 'mina', accountPublicKeyHex: minaAccountPublicKeyHex,
    role: 'organizer', acceptedAt: '2026-08-13T00:00:00.000Z', invitationId: 'group-created',
    keyVersion: 1, groupKeyEnvelopeId: 'mina-envelope-v1',
  };
  const minaInbox: SignedMembershipEventV1[] = [];
  const ninaInbox: SignedMembershipEventV1[] = [];
  const minaContext = suppliedMinaContext ?? await browser.newContext({viewport});
  const ninaContext = await browser.newContext({viewport});
  if (!suppliedMinaContext) await minaContext.grantPermissions(['clipboard-read', 'clipboard-write'], {origin: baseUrl});
  const capabilities = {minaAccountPublicKeyHex, ninaAccountPublicKeyHex, organizer};
  await Promise.all([
    minaContext.addInitScript(value => { window.__B2_HOST_CAPABILITIES__ = value; }, capabilities),
    ninaContext.addInitScript(value => { window.__B2_HOST_CAPABILITIES__ = value; }, capabilities),
    minaContext.exposeFunction('__b2SignMina', (bytes: number[]) => Array.from(sr25519Sign(Uint8Array.from(bytes), minaPair))),
    ninaContext.exposeFunction('__b2SignNina', (bytes: number[]) => Array.from(sr25519Sign(Uint8Array.from(bytes), ninaPair))),
    minaContext.exposeFunction('__b2SendFromMina', (event: SignedMembershipEventV1) => { ninaInbox.push(event); }),
    ninaContext.exposeFunction('__b2SendFromNina', (event: SignedMembershipEventV1) => { minaInbox.push(event); }),
    minaContext.exposeFunction('__b2ReceiveForMina', () => minaInbox.splice(0)),
    ninaContext.exposeFunction('__b2ReceiveForNina', () => ninaInbox.splice(0)),
  ]);
  const mina = await minaContext.newPage();
  const nina = await ninaContext.newPage();
  await mina.goto(minaEntry);
  await expect(mina.getByRole('heading', {name: 'Invite this person'})).toBeVisible();
  await mina.getByRole('button', {name: 'Invite this person'}).click();
  await expect(mina.getByRole('heading', {name: 'How should they join?'})).toBeVisible();
  const invitation = route === 'join_link'
    ? await createVisibleLinkInvitation(mina, !suppliedMinaContext)
    : await createVisibleQrInvitation(mina);
  const shared = mina.getByRole('button', {name: 'I’ve shared it'});
  if (!suppliedMinaContext && await shared.count()) await shared.click();
  await nina.goto(invitation.url);
  return {
    mina,
    nina,
    invitation,
    async close() {
      await Promise.all([minaContext.close(), ninaContext.close()]);
    },
  };
}

async function createVisibleLinkInvitation(page: Page, copyNow = true) {
  await page.getByRole('button', {name: 'Share invitation'}).click();
  await expect(page.getByRole('heading', {name: 'Send this invitation'})).toBeVisible();
  const url = await page.locator('[data-invitation-url]').getAttribute('data-invitation-url');
  expect(url).toBeTruthy();
  expect(new URL(url!).hash).toContain('chopdot-invite=');
  if (copyNow) {
    await page.getByRole('button', {name: 'Copy invitation'}).click();
    await expect(page.getByRole('button', {name: 'Invitation copied'})).toBeVisible();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(url);
  }
  return {url: url!, qrText: url!};
}

async function createVisibleQrInvitation(page: Page) {
  await page.getByRole('button', {name: 'Show QR'}).click();
  await expect(page.getByRole('heading', {name: 'Scan to open the invitation'})).toBeVisible();
  const dataUrl = await page.getByRole('img', {name: 'Invitation QR code'}).getAttribute('src');
  expect(dataUrl).toMatch(/^data:image\/png;base64,/u);
  const png = PNG.sync.read(Buffer.from(dataUrl!.split(',')[1], 'base64'));
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  expect(decoded?.data).toBeTruthy();
  expect(new URL(decoded!.data).hash).toContain('chopdot-invite=');
  return {url: decoded!.data, qrText: decoded!.data};
}

async function expectDecision(page: Page, entry: string) {
  await expect(page.getByText(new RegExp(entry, 'u'))).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Join this group?'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Accept invite'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Decline'})).toBeVisible();
  await expect(page.getByText('Local preview', {exact: true})).toHaveCount(0);
}

async function expectWaiting(page: Page) {
  await expect(page.getByRole('heading', {name: 'Waiting for the organizer'})).toBeVisible();
  await expect(page.getByText('You are not in this group until the organizer finishes adding you.')).toBeVisible();
  await expect(page.getByRole('heading', {name: /joined/iu})).toHaveCount(0);
}

async function expectInsideViewport(page: Page, title: string) {
  const viewport = page.viewportSize();
  for (const target of [page.getByText('ChopDot', {exact: true}), page.getByRole('heading', {name: title})]) {
    const box = await target.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);
  }
}

function bytesToHex(value: Uint8Array): string {
  return Array.from(value, byte => byte.toString(16).padStart(2, '0')).join('');
}
