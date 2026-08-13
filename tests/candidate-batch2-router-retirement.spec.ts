import {expect, test} from '@playwright/test';
import {cryptoWaitReady, sr25519PairFromSeed, sr25519Sign} from '@polkadot/util-crypto';
import {createRecipientBoundBootstrap, recipientBoundBootstrapUrl} from '../src/membership/recipientBoundBootstrap';
import {createSignedMembershipEvent} from '../src/membership/signedMembershipEvents';
import {createCleanState} from '../src/state/store';

const baseUrl = 'http://127.0.0.1:4177/';
const storageKey = 'chopdot-portable-shell-state-v1';

test('actual router retires legacy joinGroup snapshot auto-import', async ({page}) => {
  const state = createCleanState();
  state.currentUserId = 'nina';
  state.users.nina = {id: 'nina', name: 'Nina', accountPublicKeyHex: `0x${'33'.repeat(32)}`};
  await seedState(page, state);
  const legacy = Buffer.from(JSON.stringify({
    action: 'group_invite', groupId: 'forged-group', groupName: 'Forged', currency: 'CHF', invitedBy: 'mina',
    members: [{id: 'mina', name: 'Mina'}, {id: 'nina', name: 'Nina'}],
    expenses: [{id: 'expense', description: 'Forged spend', amount: 120, currency: 'CHF', paidByUserId: 'mina', date: '2026-08-12T12:00:00Z'}],
    splits: [{id: 'split', expenseId: 'expense', userId: 'nina', amount: 40, status: 'marked_paid'}],
    createdAt: '2026-08-12T12:00:00Z', expiresAt: '2099-08-12T12:00:00Z',
  })).toString('base64url');

  await page.goto(`${baseUrl}?joinGroup=${legacy}`);
  await expect(page.getByText('No group spending yet')).toBeVisible();
  const persisted = await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}'), storageKey);
  expect(persisted.groups).toEqual({});
  expect(persisted.expenses).toEqual({});
  expect(persisted.splits).toEqual({});
});

test('actual router recognizes only the bounded signed bootstrap and imports no group state', async ({page}) => {
  await cryptoWaitReady();
  const mina = sr25519PairFromSeed(new Uint8Array(32).fill(11));
  const ninaAccount = `0x${'33'.repeat(32)}`;
  const state = createCleanState();
  state.currentUserId = 'nina';
  state.users.nina = {id: 'nina', name: 'Nina', accountPublicKeyHex: ninaAccount};
  await seedState(page, state);
  const signer = {signBytes: async (data: Uint8Array) => sr25519Sign(data, mina)};
  const invitationEvent = await createSignedMembershipEvent({
    eventId: 'event-invite-nina', actorId: 'mina',
    actorAccountPublicKeyHex: `0x${Buffer.from(mina.publicKey).toString('hex')}`,
    occurredAt: '2026-08-12T12:00:00.000Z',
    event: {type: 'INVITATION_CREATED', invitation: {
      invitationId: 'invite-nina', groupId: 'zurich-dinner', inviterId: 'mina', inviteeId: 'nina',
      inviteeAccountPublicKeyHex: ninaAccount, role: 'member', route: 'join_link', status: 'invited',
      createdAt: '2026-08-12T12:00:00.000Z', expiresAt: '2099-08-12T12:00:00.000Z',
    }},
    signer,
  });
  const bootstrap = await createRecipientBoundBootstrap({invitationEvent, returnRoomId: 'mina-nina-room', signer});
  const url = recipientBoundBootstrapUrl(baseUrl, bootstrap);

  await page.goto(url);
  await expect(page.getByRole('heading', {name: 'This invite can’t be checked'})).toBeVisible();
  await expect(page.getByText(/Nothing has been added\./u)).toBeVisible();
  await expect(page.getByRole('button', {name: /accept/iu})).toHaveCount(0);
  const persisted = await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}'), storageKey);
  expect(persisted.groups).toEqual({});
  expect(persisted.expenses).toEqual({});
  expect(persisted.splits).toEqual({});
});

async function seedState(page: import('@playwright/test').Page, state: ReturnType<typeof createCleanState>) {
  await page.addInitScript(({key, value}) => localStorage.setItem(key, value), {
    key: storageKey,
    value: JSON.stringify(state),
  });
}
