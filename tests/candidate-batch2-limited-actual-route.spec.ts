import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {expect, test} from '@playwright/test';
import {cryptoWaitReady, sr25519PairFromSeed, sr25519Sign} from '@polkadot/util-crypto';
import {createSignedLimitedNoAppAction, type SignedLimitedNoAppResponseV1} from '../src/membership/limitedNoAppAction.ts';
import {limitedNoAppActionUrl} from '../src/membership/limitedNoAppActionLink.ts';
import type {MembershipGrant} from '../src/membership/membershipLifecycle.ts';

const baseUrl = 'http://127.0.0.1:4177/tests/fixtures/candidate-batch2-limited-actual-app.html';
const screenshotDir = path.resolve('test-results/candidate-batch2-actual-participation/screenshots');

test.beforeAll(async () => mkdir(screenshotDir, {recursive: true}));

test('limited actual App route responds to one dinner without joining', async ({browser}) => {
  await cryptoWaitReady();
  const minaPair = sr25519PairFromSeed(new Uint8Array(32).fill(11));
  const omarPair = sr25519PairFromSeed(new Uint8Array(32).fill(44));
  const account = (pair: typeof minaPair) => `0x${Buffer.from(pair.publicKey).toString('hex')}`;
  const organizer: MembershipGrant = {groupId: 'zurich-dinner', participantId: 'mina', accountPublicKeyHex: account(minaPair), role: 'organizer', acceptedAt: '2026-08-13T00:00:00.000Z', invitationId: 'group-created', keyVersion: 1, groupKeyEnvelopeId: 'mina-envelope-v1'};
  const request = await createSignedLimitedNoAppAction({requestId: 'dinner-omar-1', organizerId: 'mina', organizerAccountPublicKeyHex: organizer.accountPublicKeyHex, recipientId: 'omar', recipientAccountPublicKeyHex: account(omarPair), groupId: organizer.groupId, expenseId: 'dinner-expense', action: 'MARK_PAID', amountMinor: 4000, currency: 'CHF', createdAt: '2026-08-13T00:01:00.000Z', expiresAt: '2099-08-13T00:01:00.000Z', signer: {signBytes: async data => sr25519Sign(data, minaPair)}});
  const delivered: SignedLimitedNoAppResponseV1[] = [];
  const context = await browser.newContext({viewport: {width: 390, height: 844}});
  await context.addInitScript(value => { window.__B2_LIMITED_CAPABILITIES__ = value; }, {organizer, recipientAccountPublicKeyHex: account(omarPair)});
  await context.exposeFunction('__b2SignLimitedRecipient', (bytes: number[]) => Array.from(sr25519Sign(Uint8Array.from(bytes), omarPair)));
  await context.exposeFunction('__b2DeliverLimitedResponse', (response: SignedLimitedNoAppResponseV1) => { delivered.push(response); });
  const page = await context.newPage();
  try {
    await page.goto(limitedNoAppActionUrl(baseUrl, request));
    await expectAppMoneyCollectionsEmpty(page);
    await expect(page.getByRole('heading', {name: 'Confirm this dinner payment'})).toBeVisible();
    await expect(page.getByText('This answers only this dinner request. You won’t join the group.')).toBeVisible();
    await expect(page.getByText('CHF 40.00')).toBeVisible();
    await page.screenshot({path: path.join(screenshotDir, '09-limited-dinner-action-mobile-390x844.png')});
    await page.getByRole('button', {name: 'I paid this'}).click();
    await expect(page.getByRole('heading', {name: 'Waiting for confirmation'})).toBeVisible();
    expect(delivered).toHaveLength(1);
    expect(delivered[0].decision).toBe('MARKED_PAID');
    await expect(page.getByText(/join(?:ed)? the group/iu)).toHaveCount(0);
    await expectAppMoneyCollectionsEmpty(page);
    await page.screenshot({path: path.join(screenshotDir, '10-limited-marked-mobile-390x844.png')});

    await page.reload();
    await expect(page.getByRole('heading', {name: 'Waiting for confirmation'})).toBeVisible();
    await expect.poll(() => delivered.length).toBe(1);
    await expectAppMoneyCollectionsEmpty(page);
  } finally {
    await context.close();
  }
});

test('limited actual App route explains wrong-account and expired requests without changing product state', async ({browser}) => {
  await cryptoWaitReady();
  const minaPair = sr25519PairFromSeed(new Uint8Array(32).fill(11));
  const omarPair = sr25519PairFromSeed(new Uint8Array(32).fill(44));
  const ninaPair = sr25519PairFromSeed(new Uint8Array(32).fill(33));
  const account = (pair: typeof minaPair) => `0x${Buffer.from(pair.publicKey).toString('hex')}`;
  const organizer: MembershipGrant = {groupId: 'zurich-dinner', participantId: 'mina', accountPublicKeyHex: account(minaPair), role: 'organizer', acceptedAt: '2026-08-13T00:00:00.000Z', invitationId: 'group-created', keyVersion: 1, groupKeyEnvelopeId: 'mina-envelope-v1'};
  const makeRequest = (input: {requestId: string; recipientId: string; recipientAccountPublicKeyHex: string; expiresAt: string}) => createSignedLimitedNoAppAction({
    ...input,
    organizerId: 'mina',
    organizerAccountPublicKeyHex: organizer.accountPublicKeyHex,
    groupId: organizer.groupId,
    expenseId: 'dinner-expense',
    action: 'MARK_PAID',
    amountMinor: 4000,
    currency: 'CHF',
    createdAt: '2026-08-13T00:01:00.000Z',
    signer: {signBytes: async data => sr25519Sign(data, minaPair)},
  });
  const wrongAccountRequest = await makeRequest({requestId: 'dinner-nina-only', recipientId: 'nina', recipientAccountPublicKeyHex: account(ninaPair), expiresAt: '2099-08-13T00:01:00.000Z'});
  const expiredRequest = await makeRequest({requestId: 'dinner-omar-expired', recipientId: 'omar', recipientAccountPublicKeyHex: account(omarPair), expiresAt: '2026-08-13T00:02:00.000Z'});
  const delivered: SignedLimitedNoAppResponseV1[] = [];
  const context = await browser.newContext({viewport: {width: 390, height: 844}});
  await context.addInitScript(value => { window.__B2_LIMITED_CAPABILITIES__ = value; }, {organizer, recipientAccountPublicKeyHex: account(omarPair)});
  await context.exposeFunction('__b2SignLimitedRecipient', (bytes: number[]) => Array.from(sr25519Sign(Uint8Array.from(bytes), omarPair)));
  await context.exposeFunction('__b2DeliverLimitedResponse', (response: SignedLimitedNoAppResponseV1) => { delivered.push(response); });
  const page = await context.newPage();
  try {
    await page.goto(limitedNoAppActionUrl(baseUrl, wrongAccountRequest));
    await expect(page.getByRole('heading', {name: 'This request isn’t for you'})).toBeVisible();
    await expect(page.getByText('It was made for a different account.')).toBeVisible();
    await expect(page.getByRole('button', {name: 'I paid this'})).toHaveCount(0);
    await expectAppMoneyCollectionsEmpty(page);
    await page.screenshot({path: path.join(screenshotDir, '11-limited-wrong-account-mobile-390x844.png')});

    await page.goto(limitedNoAppActionUrl(baseUrl, expiredRequest));
    await expect(page.getByRole('heading', {name: 'This request expired'})).toBeVisible();
    await expect(page.getByText('Ask the organizer to send a new one.')).toBeVisible();
    await expect(page.getByRole('button', {name: 'I paid this'})).toHaveCount(0);
    await expectAppMoneyCollectionsEmpty(page);
    expect(delivered).toHaveLength(0);
    await page.screenshot({path: path.join(screenshotDir, '12-limited-expired-mobile-390x844.png')});
  } finally {
    await context.close();
  }
});

async function expectAppMoneyCollectionsEmpty(page: import('@playwright/test').Page) {
  const collections = await page.evaluate(() => {
    const raw = localStorage.getItem('chopdot-portable-shell-state-v1');
    if (!raw) return null;
    const state = JSON.parse(raw) as {groups: object; expenses: object; splits: object; savedRecords: object};
    return {
      groups: Object.keys(state.groups),
      expenses: Object.keys(state.expenses),
      splits: Object.keys(state.splits),
      savedRecords: Object.keys(state.savedRecords),
    };
  });
  expect(collections).toEqual({groups: [], expenses: [], splits: [], savedRecords: []});
}
