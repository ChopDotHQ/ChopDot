import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MODE_POLICIES_V1,
  canonicalBytes,
  canonicalEventSigningBytes,
  canonicalFrontierHash,
  canonicalHash,
  modePolicyV1,
  type ChopEventInputV1,
  type ChopEventV1,
  type MoneyV1,
  type ModePolicyV1,
} from '../src/core/contracts.ts';
import {allocateMoneyEvenly, moneyFromMinorUnits} from '../src/core/money.ts';
import {createCanonicalEvent, projectCanonicalEvents, type CanonicalSigner} from '../src/core/moneyEventKernel.ts';

const minaKey = `0x${'11'.repeat(32)}`;
const leoKey = `0x${'22'.repeat(32)}`;
const signer: CanonicalSigner = {
  sign: async bytes => new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
};
const verify = async (bytes: Uint8Array, signature: Uint8Array) => {
  const expected = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Buffer.from(expected).equals(Buffer.from(signature));
};

test('MoneyV1 canonical bytes and hash are stable across property order', async () => {
  const left = {z: 1, a: ['CHF', 10000]};
  const right = {a: ['CHF', 10000], z: 1};
  const expectedJson = '{"a":["CHF",10000],"z":1}';
  const expectedHash = '0x3ccbf68c15001e4573ef50a72066193734fb58761a7de71d051a7ce5a1ef9e98';
  assert.equal(Buffer.from(canonicalBytes(left)).toString('utf8'), expectedJson);
  assert.deepEqual(canonicalBytes(left), canonicalBytes(right));
  assert.equal(await canonicalHash(left), expectedHash);
  assert.equal(await canonicalHash(right), expectedHash);
});

test('exact money split properties conserve every tested total deterministically', () => {
  for (let totalMinor = 0n; totalMinor <= 500n; totalMinor += 1n) {
    for (let count = 1; count <= 7; count += 1) {
      const total: MoneyV1 = moneyFromMinorUnits(totalMinor, 'CHF');
      const participants = Array.from({length: count}, (_, index) => `person-${count - index}`);
      const first = allocateMoneyEvenly(total, participants);
      const second = allocateMoneyEvenly(total, [...participants].reverse());
      const amounts = first.map(row => BigInt(row.amount.minorUnits));
      assert.deepEqual(first, second);
      assert.equal(amounts.reduce((sum, amount) => sum + amount, 0n), totalMinor);
      assert.ok((amounts.at(0) ?? 0n) - (amounts.at(-1) ?? 0n) <= 1n);
    }
  }
});

test('ModePolicyV1 keeps every product mode on the same non-custodial authority contract', () => {
  assert.deepEqual(Object.keys(MODE_POLICIES_V1).sort(), [
    'community_fund',
    'couple',
    'emergency_pot',
    'normal_pot',
    'savings_circle',
    'spend_card',
    'trip',
  ]);
  for (const value of Object.values(MODE_POLICIES_V1)) {
    const policy: Readonly<ModePolicyV1> = value;
    assert.equal(policy.authority, 'participant_signed_events');
    assert.equal(policy.money, 'exact_minor_units');
    assert.equal(policy.custody, 'none');
    assert.equal(policy.confirmation, 'receiver_confirmed');
    assert.equal(policy.close, 'all_required_items_resolved');
    assert.equal(Object.isFrozen(policy), true);
  }
  assert.equal(modePolicyV1('emergency_pot').privacy, 'minimum_disclosure');
  assert.equal(modePolicyV1('normal_pot').privacy, 'group_encrypted');
});

test('ChopEventV1 signing, state hash, and frontier hash converge independent of delivery order', async () => {
  const events = await fixture();
  const forward = await projectCanonicalEvents(events, verify);
  const reversed = await projectCanonicalEvents([...events].reverse(), verify);
  assert.equal(forward.stateHash, reversed.stateHash);
  assert.equal(forward.frontierHash, reversed.frontierHash);
  assert.equal(forward.frontierHash, await canonicalFrontierHash(forward.state));
  assert.equal(forward.state.currentEventId, '02-expense');
  assert.deepEqual(forward.rejected, []);
  const unsigned = (({signatureHex: _signatureHex, ...value}) => value)(events[0]);
  assert.equal(
    Buffer.from(canonicalEventSigningBytes(unsigned)).toString('utf8').startsWith('["chopdot:money-event:v1",'),
    true,
  );
});

test('exact retries are idempotent and conflicting command reuse fails closed independent of arrival', async () => {
  const [created, expense] = await fixture();
  const exactRetry = await projectCanonicalEvents([created, created, expense], verify);
  assert.equal(exactRetry.state.version, 2);
  assert.deepEqual(exactRetry.duplicates.map(issue => issue.eventId), ['01-create']);

  const conflictingCreate = await create({
    ...inputFor(created),
    eventId: '01-create-conflict',
    commandId: created.commandId,
    payload: {
      name: 'Conflicting Dinner',
      organizerId: 'mina',
      members: [
        {participantId: 'mina', accountPublicKeyHex: minaKey, role: 'organizer'},
        {participantId: 'leo', accountPublicKeyHex: leoKey, role: 'member'},
      ],
    },
  });
  const left = await projectCanonicalEvents([created, conflictingCreate], verify);
  const right = await projectCanonicalEvents([conflictingCreate, created], verify);
  assert.equal(left.stateHash, right.stateHash);
  assert.equal(left.frontierHash, right.frontierHash);
  assert.equal(left.state.version, 0);
  assert.deepEqual(left.rejected.map(issue => issue.eventId).sort(), ['01-create', '01-create-conflict']);
  assert.deepEqual(right.rejected.map(issue => issue.eventId).sort(), ['01-create', '01-create-conflict']);
});

async function fixture(): Promise<ChopEventV1[]> {
  const created = await create({
    eventId: '01-create',
    commandId: 'command-create',
    groupId: 'group-dinner',
    eventType: 'GROUP_CREATED',
    expectedVersion: 0,
    parentEventId: null,
    actorId: 'mina',
    actorAccountPublicKeyHex: minaKey,
    actorRole: 'organizer',
    occurredAt: '2026-08-23T12:00:00.000Z',
    payload: {
      name: 'Dinner',
      organizerId: 'mina',
      members: [
        {participantId: 'mina', accountPublicKeyHex: minaKey, role: 'organizer'},
        {participantId: 'leo', accountPublicKeyHex: leoKey, role: 'member'},
      ],
    },
  });
  const expense = await create({
    eventId: '02-expense',
    commandId: 'command-expense',
    groupId: 'group-dinner',
    eventType: 'EXPENSE_ADDED',
    expectedVersion: 1,
    parentEventId: '01-create',
    actorId: 'mina',
    actorAccountPublicKeyHex: minaKey,
    actorRole: 'organizer',
    occurredAt: '2026-08-23T12:01:00.000Z',
    payload: {
      expenseId: 'expense-dinner',
      description: 'Dinner',
      paidBy: 'mina',
      total: moneyFromMinorUnits(10000n, 'CHF'),
      allocations: [
        {participantId: 'mina', amount: moneyFromMinorUnits(5000n, 'CHF')},
        {participantId: 'leo', amount: moneyFromMinorUnits(5000n, 'CHF')},
      ],
    },
  });
  return [created, expense];
}

function create(input: ChopEventInputV1): Promise<ChopEventV1> {
  return createCanonicalEvent(input, signer);
}

function inputFor(event: ChopEventV1): ChopEventInputV1 {
  return {
    eventId: event.eventId,
    commandId: event.commandId,
    groupId: event.groupId,
    eventType: event.eventType,
    expectedVersion: event.expectedVersion,
    parentEventId: event.parentEventId,
    actorId: event.actorId,
    actorAccountPublicKeyHex: event.actorAccountPublicKeyHex,
    actorRole: event.actorRole,
    occurredAt: event.occurredAt,
    acceptedAt: event.acceptedAt,
    eventVersion: event.eventVersion,
    keyVersion: event.keyVersion,
    visibility: event.visibility,
    payload: event.payload,
  };
}
