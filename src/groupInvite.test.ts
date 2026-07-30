import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildGroupInviteUrl,
  parseGroupInvite,
  type GroupInviteSource,
} from './requestLinks';

const HREF = 'https://chopdot.example/?foo=1';

function source(overrides: Partial<GroupInviteSource> = {}): GroupInviteSource {
  return {
    group: { id: 'g1', name: 'Friday Crew', memberIds: ['mina', 'leo', 'nina'] },
    users: {
      mina: { id: 'mina', name: 'Mina' },
      leo: { id: 'leo', name: 'Leo' },
      nina: { id: 'nina', name: 'Nina' },
    },
    expenses: {
      e1: {
        id: 'e1', groupId: 'g1', description: 'Dinner at La Cabrera',
        amount: 184.5, currency: 'USD', paidByUserId: 'mina', date: '2099-07-15T10:00:00.000Z',
      },
    },
    splits: {
      s1: { id: 's1', expenseId: 'e1', userId: 'leo', amount: 61.5, status: 'open' },
      s2: { id: 's2', expenseId: 'e1', userId: 'nina', amount: 61.5, status: 'marked_paid' },
    },
    currency: 'USD',
    ...overrides,
  };
}

function roundTrip(src: GroupInviteSource, invitedBy = 'mina') {
  const built = buildGroupInviteUrl(src, invitedBy, HREF);
  assert.equal(built.ok, true);
  if (!built.ok) throw new Error('unreachable');
  return { built, parsed: parseGroupInvite(new URL(built.url).search) };
}

test('an invite round-trips the group, roster, expenses and splits', () => {
  const { parsed } = roundTrip(source());
  assert.ok(parsed);
  assert.equal(parsed.groupId, 'g1');
  assert.equal(parsed.groupName, 'Friday Crew');
  assert.equal(parsed.invitedBy, 'mina');
  assert.deepEqual(parsed.members.map(m => m.name).sort(), ['Leo', 'Mina', 'Nina']);
  assert.equal(parsed.expenses.length, 1);
  assert.equal(parsed.expenses[0].description, 'Dinner at La Cabrera');
  assert.equal(parsed.splits.length, 2);
});

test('a link can never assert that a receiver confirmed someone else\'s payment', () => {
  const src = source();
  src.splits.s2.status = 'confirmed'; // Nina owes Mina — not a self-split
  const { parsed } = roundTrip(src);
  assert.ok(parsed);
  const s2 = parsed.splits.find(s => s.id === 's2');
  assert.equal(s2?.status, 'marked_paid', 'confirmed must be downgraded in transit');
});

test('a self-split keeps confirmed — the payer owes themselves nothing', () => {
  const src = source();
  // Mina paid e1, so a split owed by Mina on e1 is settled by construction.
  src.splits.s3 = { id: 's3', expenseId: 'e1', userId: 'mina', amount: 61.5, status: 'confirmed' };
  const { parsed } = roundTrip(src);
  assert.ok(parsed);
  assert.equal(parsed.splits.find(s => s.id === 's3')?.status, 'confirmed');
});

test('a forged confirmed self-split for the wrong member is rejected', () => {
  const src = source();
  src.splits.s3 = { id: 's3', expenseId: 'e1', userId: 'mina', amount: 61.5, status: 'confirmed' };
  const built = buildGroupInviteUrl(src, 'mina', HREF);
  if (!built.ok) throw new Error('unreachable');
  const packet = new URL(built.url).searchParams.get('joinGroup')!;
  const decoded = JSON.parse(Buffer.from(packet, 'base64url').toString('utf8'));
  // reassign the confirmed split to Leo, who did not pay
  decoded.splits.find((x: {id: string}) => x.id === 's3').userId = 'leo';
  const tampered = Buffer.from(JSON.stringify(decoded), 'utf8').toString('base64url');
  assert.equal(parseGroupInvite(`?joinGroup=${tampered}`), null);
});

test('a hand-forged confirmed status is rejected outright', () => {
  const forged = {
    action: 'group_invite',
    groupId: 'g1',
    groupName: 'Friday Crew',
    invitedBy: 'mina',
    members: [{ id: 'mina', name: 'Mina' }, { id: 'leo', name: 'Leo' }],
    expenses: [{
      id: 'e1', description: 'Dinner', amount: 100, currency: 'USD',
      paidByUserId: 'mina', date: '2099-07-15T10:00:00.000Z',
    }],
    splits: [{ id: 's1', expenseId: 'e1', userId: 'leo', amount: 50, status: 'confirmed' }],
    createdAt: '2099-07-15T10:00:00.000Z',
    expiresAt: '2099-07-22T10:00:00.000Z',
  };
  const packet = Buffer.from(JSON.stringify(forged), 'utf8').toString('base64url');
  assert.equal(parseGroupInvite(`?joinGroup=${packet}`), null);
});

test('expired invites are rejected', () => {
  const built = buildGroupInviteUrl(source(), 'mina', HREF);
  assert.equal(built.ok, true);
  if (!built.ok) throw new Error('unreachable');
  const packet = new URL(built.url).searchParams.get('joinGroup')!;
  const decoded = JSON.parse(Buffer.from(packet, 'base64url').toString('utf8'));
  decoded.expiresAt = '2000-01-01T00:00:00.000Z';
  const stale = Buffer.from(JSON.stringify(decoded), 'utf8').toString('base64url');
  assert.equal(parseGroupInvite(`?joinGroup=${stale}`), null);
});

test('splits referencing an unknown member or expense are rejected', () => {
  const built = buildGroupInviteUrl(source(), 'mina', HREF);
  if (!built.ok) throw new Error('unreachable');
  const packet = new URL(built.url).searchParams.get('joinGroup')!;
  const decoded = JSON.parse(Buffer.from(packet, 'base64url').toString('utf8'));
  decoded.splits[0].userId = 'stranger';
  const tampered = Buffer.from(JSON.stringify(decoded), 'utf8').toString('base64url');
  assert.equal(parseGroupInvite(`?joinGroup=${tampered}`), null);
});

test('the inviter must be inside the roster', () => {
  const built = buildGroupInviteUrl(source(), 'ghost', HREF);
  assert.equal(built.ok, true);
  if (!built.ok) throw new Error('unreachable');
  assert.equal(parseGroupInvite(new URL(built.url).search), null);
});

test('a group too large for a URL fails honestly instead of truncating', () => {
  const src = source();
  src.group.memberIds = Array.from({ length: 40 }, (_, i) => `u${i}`);
  src.users = Object.fromEntries(
    src.group.memberIds.map(id => [id, { id, name: `Member ${id}` }]),
  );
  const built = buildGroupInviteUrl(src, 'u0', HREF);
  assert.equal(built.ok, false);
  if (built.ok) throw new Error('unreachable');
  assert.equal(built.reason, 'too_many_members');
});

test('invite links do not carry a previous invite param forward', () => {
  const { built } = roundTrip(source());
  const first = new URL(built.url);
  const again = buildGroupInviteUrl(source(), 'mina', first.toString());
  assert.equal(again.ok, true);
  if (!again.ok) throw new Error('unreachable');
  assert.equal(new URL(again.url).searchParams.getAll('joinGroup').length, 1);
});

test('dot-host invites use the public host, not the sandbox origin', () => {
  const built = buildGroupInviteUrl(
    source(),
    'mina',
    'https://chopdot-shell-proof.app.paseo.li/?chainBackend=rpc-gateway',
  );
  assert.equal(built.ok, true);
  if (!built.ok) throw new Error('unreachable');
  const url = new URL(built.url);
  assert.equal(url.hostname, 'chopdot-shell-proof.paseo.li');
  assert.equal(url.searchParams.get('chainBackend'), 'rpc-gateway');
});

test('the invite carries the group currency so amounts are not relabelled', () => {
  // Regression: a joining device showed "$0.61" for what the inviter recorded as
  // "PAS 0.61", and the wallet payment path (PAS-only) became unreachable.
  // Found by running the full loop, not by unit tests.
  const src = source({ currency: 'PAS' });
  const { parsed } = roundTrip(src);
  assert.ok(parsed);
  assert.equal(parsed.currency, 'PAS');
});

test('an invite with a nonsense currency is rejected', () => {
  const built = buildGroupInviteUrl(source(), 'mina', HREF);
  if (!built.ok) throw new Error('unreachable');
  const packet = new URL(built.url).searchParams.get('joinGroup')!;
  const decoded = JSON.parse(Buffer.from(packet, 'base64url').toString('utf8'));
  decoded.currency = 'DOLLARS';
  const tampered = Buffer.from(JSON.stringify(decoded), 'utf8').toString('base64url');
  assert.equal(parseGroupInvite(`?joinGroup=${tampered}`), null);
});

test('the invite carries public wallet addresses so a joiner can pay by wallet', () => {
  // Regression: Leo joined, tapped Pay, and got "Mina needs to connect a wallet
  // first" — she had, but his copy of her had no address. RECORD_MATCHED_PAYMENT
  // also checks receiver.walletAddress, so confirmation was impossible.
  const src = source();
  src.users.mina.walletAddress = '0x7f7Ce4722c61C6616f5C47E905f42A1D02f18b3A';
  const { parsed } = roundTrip(src);
  assert.ok(parsed);
  const mina = parsed.members.find(m => m.id === 'mina');
  assert.equal(mina?.walletAddress, '0x7f7ce4722c61c6616f5c47e905f42a1d02f18b3a');
});

test('members without a wallet stay wallet-less rather than gaining a blank one', () => {
  const { parsed } = roundTrip(source());
  assert.ok(parsed);
  assert.equal(parsed.members.every(m => m.walletAddress === undefined), true);
});

test('a malformed wallet address rejects the whole invite', () => {
  const src = source();
  src.users.mina.walletAddress = '0x7f7Ce4722c61C6616f5C47E905f42A1D02f18b3A';
  const built = buildGroupInviteUrl(src, 'mina', HREF);
  if (!built.ok) throw new Error('unreachable');
  const packet = new URL(built.url).searchParams.get('joinGroup')!;
  const decoded = JSON.parse(Buffer.from(packet, 'base64url').toString('utf8'));
  decoded.members.find((m: {id: string}) => m.id === 'mina').walletAddress = '0xnope';
  const tampered = Buffer.from(JSON.stringify(decoded), 'utf8').toString('base64url');
  assert.equal(parseGroupInvite(`?joinGroup=${tampered}`), null);
});
