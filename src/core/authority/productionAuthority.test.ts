import assert from 'node:assert/strict';
import test from 'node:test';
import {cryptoWaitReady, sr25519PairFromSeed, sr25519Sign, sr25519Verify} from '@polkadot/util-crypto';
import {createCleanState, type Action} from '../../state/store.ts';
import type {AppState, Expense, Group, Split} from '../../types.ts';
import {canonicalExpenseAccountingV1, canonicalShareId, type CanonicalGroupStateV1, type CanonicalSigner, type CanonicalVerifier} from '../moneyEventKernel.ts';
import {allocateMoneyEvenly, moneyFromDecimal, signedMoney} from '../money.ts';
import {ProductionAuthority, isProductionAuthorityAction, type AuthorityIdentityResolver, type AuthorityJournalStore, type PersistedAuthorityGroupV1} from './productionAuthority.ts';

await cryptoWaitReady();

const pairs = {
  mina: sr25519PairFromSeed(new Uint8Array(32).fill(11)),
  leo: sr25519PairFromSeed(new Uint8Array(32).fill(22)),
  nina: sr25519PairFromSeed(new Uint8Array(32).fill(33)),
};
const publicKey = (participantId: keyof typeof pairs) => `0x${Buffer.from(pairs[participantId].publicKey).toString('hex')}`;
const verify: CanonicalVerifier = async (bytes, signature, accountPublicKeyHex) => sr25519Verify(bytes, signature, Buffer.from(accountPublicKeyHex.slice(2), 'hex'));

test('production authority signs exact money before projecting two receipt spends to the real app shape', async () => {
  const journal = new MemoryJournal();
  const authority = harness(journal);
  let state = baseState();

  const group: Group = {id: 'g-zurich', name: 'Zurich weekend', memberIds: ['mina', 'leo', 'nina'], mode: 'trip'};
  state = (await authority.append(state, {type: 'CREATE_GROUP', payload: {group}}, 'mina')).state;
  state = (await authority.append(state, expenseAction('dinner', 10, state), 'mina')).state;
  state = (await authority.append(state, expenseAction('tram', 4.2, state), 'mina')).state;

  const persisted = await journal.read('g-zurich');
  assert.ok(persisted);
  assert.equal(persisted.events.length, 3);
  assert.deepEqual(persisted.events.filter(event => event.eventType === 'EXPENSE_ADDED').map(event => {
    const payload = event.payload as {total: {minorUnits: string}; allocations: Array<{amount: {minorUnits: string}}>};
    return [payload.total.minorUnits, payload.allocations.map(row => row.amount.minorUnits)];
  }), [
    ['1000', ['334', '333', '333']],
    ['420', ['140', '140', '140']],
  ]);
  assert.equal(Object.keys(state.expenses).length, 2);
  assert.equal(Object.keys(state.splits).length, 6);
  assert.equal(state.expenses.dinner.amount, 10);
  assert.equal(Object.values(state.splits).filter(split => split.expenseId === 'dinner').reduce((sum, split) => sum + split.amount, 0), 10);

  const dinnerLeo = Object.values(state.splits).find(split => split.expenseId === 'dinner' && split.userId === 'leo');
  assert.ok(dinnerLeo);
  state = (await authority.append(state, requestAction(dinnerLeo.id), 'mina')).state;
  const refreshedRequest = requestAction(dinnerLeo.id);
  refreshedRequest.payload.requestId = `refreshed-${dinnerLeo.id}`;
  refreshedRequest.payload.createdAt = '2026-08-23T12:05:00.000Z';
  refreshedRequest.payload.expiresAt = '2026-08-24T12:05:00.000Z';
  refreshedRequest.payload.capabilityHash = `refreshed-hash-${dinnerLeo.id}`;
  state = (await authority.append(state, refreshedRequest, 'mina')).state;
  assert.equal(state.splits[dinnerLeo.id].status, 'request_sent');
  assert.equal(state.splits[dinnerLeo.id].requestId, `refreshed-${dinnerLeo.id}`);
  state = (await authority.append(state, {type: 'MARK_PAID', payload: {splitId: dinnerLeo.id, userId: 'leo'}}, 'leo')).state;
  assert.equal(state.splits[dinnerLeo.id].status, 'marked_paid');
  state = (await authority.append(state, {type: 'CONFIRM_RECEIVED', payload: {splitId: dinnerLeo.id, currentUserId: 'mina'}}, 'mina')).state;
  assert.equal(state.splits[dinnerLeo.id].status, 'confirmed');
});

test('production authority rejects missing exact money and never trusts number-valued presentation fields', async () => {
  const authority = harness(new MemoryJournal());
  let state = baseState();
  state = (await authority.append(state, {type: 'CREATE_GROUP', payload: {group: {
    id: 'g-exact-boundary', name: 'Exact boundary', memberIds: ['mina', 'leo', 'nina'],
  }}}, 'mina')).state;

  const missing = expenseAction('missing-exact', 10, state);
  delete missing.payload.exact;
  await assert.rejects(authority.append(state, missing, 'mina'), /exact minor-unit money/u);
  assert.equal(state.expenses['missing-exact'], undefined);

  const forgedPresentation = expenseAction('exact-wins', 10, state);
  forgedPresentation.payload.expense.amount = 999_999.99;
  forgedPresentation.payload.splits.forEach(split => { split.amount = 333_333.33; });
  const accepted = await authority.append(state, forgedPresentation, 'mina');
  assert.equal(accepted.state.expenses['exact-wins'].amount, 10);
  assert.deepEqual(
    Object.values(accepted.state.splits).filter(split => split.expenseId === 'exact-wins').map(split => split.amount).sort((a, b) => a - b),
    [3.33, 3.33, 3.34],
  );
});

test('invalid actor and a failed durable write change neither projection nor signed frontier', async () => {
  const journal = new MemoryJournal();
  const authority = harness(journal);
  let state = baseState();
  state = (await authority.append(state, {type: 'CREATE_GROUP', payload: {group: {id: 'g-one', name: 'Dinner', memberIds: ['mina', 'leo']}}}, 'mina')).state;
  state = (await authority.append(state, expenseAction('meal', 10, state), 'mina')).state;
  const leo = Object.values(state.splits).find(split => split.userId === 'leo');
  assert.ok(leo);
  state = (await authority.append(state, requestAction(leo.id), 'mina')).state;
  const before = structuredClone(state);
  const frontier = (await journal.read('g-one'))?.frontierHash;

  await assert.rejects(
    authority.append(state, {type: 'MARK_PAID', payload: {splitId: leo.id, userId: 'leo'}}, 'mina'),
    /only their own share/u,
  );
  assert.deepEqual(state, before);
  assert.equal((await journal.read('g-one'))?.frontierHash, frontier);

  journal.failWrites = true;
  await assert.rejects(
    authority.append(state, {type: 'MARK_PAID', payload: {splitId: leo.id, userId: 'leo'}}, 'leo'),
    /durable write failed/u,
  );
  assert.deepEqual(state, before);
  assert.equal((await journal.read('g-one'))?.frontierHash, frontier);
});

test('production authority signs and durably applies typed share adjustments before projection', async () => {
  const journal = new MemoryJournal();
  const authority = harness(journal);
  let state = baseState();
  state = (await authority.append(state, {
    type: 'CREATE_GROUP',
    payload: {group: {id: 'g-adjust', name: 'Adjustments', memberIds: ['mina', 'leo']}},
  }, 'mina')).state;
  state = (await authority.append(state, expenseAction('meal-adjust', 12, state), 'mina')).state;
  const shareId = canonicalShareId('meal-adjust', 'leo');
  const before = await journal.read('g-adjust');
  assert.ok(before);

  const accepted = await authority.appendShareAdjustment(state, {
    groupId: 'g-adjust', shareId, kind: 'refund', delta: signedMoney('-100', 'CHF'), reason: 'Returned item',
  }, 'mina');
  assert.equal(accepted.event.eventType, 'SHARE_ADJUSTED');
  assert.equal(accepted.canonicalState.shares[shareId].amount.minorUnits, '500');
  assert.equal(Object.values(accepted.state.splits).find(split => split.expenseId === 'meal-adjust' && split.userId === 'leo')?.amount, 5);
  assert.deepEqual(canonicalExpenseAccountingV1(accepted.canonicalState, 'meal-adjust'), {
    expenseId: 'meal-adjust',
    reviewedTotal: moneyFromDecimal('12.00', 'CHF'),
    adjustmentTotal: signedMoney('-100', 'CHF'),
    currentShareTotal: moneyFromDecimal('11.00', 'CHF'),
  });
  const persisted = await journal.read('g-adjust');
  assert.equal(persisted?.events.at(-1)?.eventType, 'SHARE_ADJUSTED');
  assert.notEqual(persisted?.frontierHash, before.frontierHash);

  const stable = structuredClone(accepted.state);
  const stableFrontier = persisted?.frontierHash;
  await assert.rejects(authority.appendShareAdjustment(accepted.state, {
    groupId: 'g-adjust', shareId, kind: 'fee', delta: signedMoney('50', 'USD'), reason: 'Wrong partition',
  }, 'mina'), /currency/u);
  await assert.rejects(authority.appendShareAdjustment(accepted.state, {
    groupId: 'g-adjust', shareId, kind: 'fee', delta: signedMoney('50', 'CHF'), reason: 'Wrong actor',
  }, 'leo'), /authority/u);
  await assert.rejects(authority.appendShareAdjustment(accepted.state, {
    groupId: 'g-adjust', shareId, kind: 'correction', delta: signedMoney('50', 'CHF'), reason: 'Legacy injection',
  } as never, 'mina'), /replay-only/u);
  assert.deepEqual(accepted.state, stable);
  assert.equal((await journal.read('g-adjust'))?.frontierHash, stableFrontier);

  journal.failWrites = true;
  await assert.rejects(authority.appendShareAdjustment(accepted.state, {
    groupId: 'g-adjust', shareId, kind: 'fee', delta: signedMoney('50', 'CHF'), reason: 'Durability check',
  }, 'mina'), /durable write failed/u);
  assert.equal((await journal.read('g-adjust'))?.frontierHash, stableFrontier);
});

test('closed groups append signed successors without rewriting the original close', async () => {
  const journal = new MemoryJournal();
  const identityControl = {unavailable: false, resolveCount: 0};
  const authority = harness(journal, [], identityControl);
  let state = baseState();
  state = (await authority.append(state, {
    type: 'CREATE_GROUP', payload: {group: {id: 'g-successor', name: 'Closed dinner', memberIds: ['mina', 'leo']}},
  }, 'mina')).state;

  await assert.rejects(authority.appendCloseoutSuccessor(state, {
    groupId: 'g-successor', recordId: 'record-next', predecessorRecordId: 'record-original', reason: 'Late receipt',
  }, 'mina'), /closed group/u);

  state = (await authority.append(state, {
    type: 'SAVE_RECORD', payload: {groupId: 'g-successor', recordId: 'record-original'},
  }, 'mina')).state;
  const original = await authority.readCanonicalGroup('g-successor');
  assert.ok(original?.closed);
  const originalClose = structuredClone(original.closed);
  const originalSaved = structuredClone(state.savedRecords['record-original']);
  const originalFrontier = (await journal.read('g-successor'))?.frontierHash;

  await assert.rejects(authority.appendCloseoutSuccessor(state, {
    groupId: 'g-successor', recordId: 'record-next', predecessorRecordId: 'record-original', reason: 'Wrong actor',
  }, 'leo'), /current organizer/u);
  await assert.rejects(authority.appendCloseoutSuccessor(state, {
    groupId: 'g-successor', recordId: 'record-next', predecessorRecordId: 'record-other', reason: 'Wrong predecessor',
  }, 'mina'), /exact closed record/u);
  assert.equal((await journal.read('g-successor'))?.frontierHash, originalFrontier);

  journal.failCas = true;
  await assert.rejects(authority.appendCloseoutSuccessor(state, {
    groupId: 'g-successor', recordId: 'record-next', predecessorRecordId: 'record-original', reason: 'Stale write',
  }, 'mina'), /changed on another device/u);
  journal.failCas = false;
  assert.equal((await journal.read('g-successor'))?.frontierHash, originalFrontier);
  assert.deepEqual(state.savedRecords['record-original'], originalSaved);

  const accepted = await authority.appendCloseoutSuccessor(state, {
    groupId: 'g-successor', recordId: 'record-next', predecessorRecordId: 'record-original', reason: 'Late receipt',
  }, 'mina');
  assert.equal(accepted.outcome, 'applied');
  assert.equal(accepted.event.eventType, 'SUCCESSOR_RECORD_CREATED');
  assert.deepEqual(accepted.canonicalState.closed, originalClose);
  assert.deepEqual(accepted.state.savedRecords['record-original'], originalSaved);
  assert.deepEqual(accepted.canonicalState.successorRecords.map(record => ({
    recordId: record.recordId, predecessorRecordId: record.predecessorRecordId, reason: record.reason,
  })), [{recordId: 'record-next', predecessorRecordId: 'record-original', reason: 'Late receipt'}]);

  const acceptedFrontier = (await journal.read('g-successor'))?.frontierHash;
  const acceptedEventCount = (await journal.read('g-successor'))?.events.length;
  const acceptedResolveCount = identityControl.resolveCount;
  identityControl.unavailable = true;
  const retry = await authority.appendCloseoutSuccessor(state, {
    groupId: 'g-successor', recordId: 'record-next', predecessorRecordId: 'record-original', reason: 'Late receipt',
  }, 'mina');
  assert.equal(retry.outcome, 'duplicate');
  assert.equal(retry.event.eventId, accepted.event.eventId);
  assert.equal(retry.frontierHash, accepted.frontierHash);
  assert.deepEqual(retry.canonicalState, accepted.canonicalState);
  assert.equal((await journal.read('g-successor'))?.events.length, acceptedEventCount);
  assert.equal((await journal.read('g-successor'))?.frontierHash, acceptedFrontier);
  assert.equal(identityControl.resolveCount, acceptedResolveCount, 'durable duplicate catch-up does not reconnect the original signer');

  await assert.rejects(authority.appendCloseoutSuccessor(accepted.state, {
    groupId: 'g-successor', recordId: 'record-next', predecessorRecordId: 'record-original', reason: 'Duplicate',
  }, 'mina'), /different content/u);
  assert.equal((await journal.read('g-successor'))?.frontierHash, acceptedFrontier);
  assert.deepEqual((await authority.readCanonicalGroup('g-successor'))?.closed, originalClose);
});

test('hydrate replays the journal and rejects corruption instead of trusting the cached projection', async () => {
  const journal = new MemoryJournal();
  const authority = harness(journal);
  let state = baseState();
  state = (await authority.append(state, {type: 'CREATE_GROUP', payload: {group: {id: 'g-replay', name: 'Replay', memberIds: ['mina', 'leo']}}}, 'mina')).state;
  state = (await authority.append(state, expenseAction('meal', 12.34, state), 'mina')).state;

  const stale = baseState();
  stale.groups['g-replay'] = {id: 'g-replay', name: 'tampered cache', memberIds: []};
  const replayed = await authority.hydrate(stale);
  assert.equal(replayed.groups['g-replay'].name, 'Replay');
  assert.equal(replayed.expenses.meal.amount, 12.34);

  const record = await journal.read('g-replay');
  assert.ok(record);
  journal.forceWrite('g-replay', {...record, stateHash: `0x${'ff'.repeat(32)}`});
  await assert.rejects(authority.hydrate(stale), /failed its corruption check/u);
});

test('receipt capture and device preferences remain local proposals, not implicit shared mutations', () => {
  const theme: Action = {type: 'SET_THEME', payload: {theme: 'dark'}};
  assert.equal(isProductionAuthorityAction(theme), false);
  assert.equal(isProductionAuthorityAction({type: 'ADD_EXPENSE', payload: {expense: {} as Expense, splits: []}}), true);
});

test('accepted membership is added on the same signed frontier and removal rotates future access', async () => {
  const journal = new MemoryJournal();
  const authorizedStates: CanonicalGroupStateV1[] = [];
  const authority = harness(journal, authorizedStates);
  let state = baseState();
  state = (await authority.append(state, {
    type: 'CREATE_GROUP',
    payload: {group: {id: 'g-membership', name: 'Membership', memberIds: ['mina']}},
  }, 'mina')).state;
  const grant = {
    groupId: 'g-membership', participantId: 'leo', accountPublicKeyHex: publicKey('leo'), role: 'member' as const,
    acceptedAt: '2026-08-23T11:59:00.000Z', invitationId: 'accepted-leo', keyVersion: 1,
    groupKeyEnvelopeId: 'envelope-leo',
  };
  const added = await authority.appendMembership(state, {groupId: 'g-membership', type: 'add', grant}, 'mina');
  state = added.state;
  assert.deepEqual(state.groups['g-membership'].memberIds.sort(), ['leo', 'mina']);
  assert.equal(added.event.eventType, 'MEMBER_ADDED');
  const removed = await authority.appendMembership(state, {
    groupId: 'g-membership', type: 'remove', participantId: 'leo', nextKeyVersion: 2,
    groupKeyEnvelopeIds: {mina: 'envelope-mina-v2'},
  }, 'mina');
  assert.deepEqual(removed.state.groups['g-membership'].memberIds, ['mina']);
  assert.equal(removed.canonicalState.members.leo.active, false);
  assert.equal(removed.canonicalState.groupKeyVersion, 2);
  assert.deepEqual(authorizedStates.map(current => ({
    version: current.version,
    active: Object.values(current.members).filter(member => member.active !== false).map(member => member.participantId).sort(),
  })), [
    {version: 1, active: ['mina']},
    {version: 2, active: ['leo', 'mina']},
  ], 'membership authorization receives the already-verified current frontier');
  await assert.rejects(authority.appendMode(removed.state, {
    groupId: 'g-membership', eventType: 'SPEND_TRANSACTION_IMPORTED',
    payload: {transactionId: 'forbidden', transactionReferenceHash: `0x${'11'.repeat(32)}`, merchantLabel: 'No', total: {v: 1 as const, minorUnits: '1', currency: 'CHF', exponent: 2}, transactedAt: '2026-08-23T12:00:00.000Z'},
  }, 'leo'), /not a member/u);
});

test('fresh-device recovery imports one fully verified frontier atomically and is idempotent', async () => {
  const sourceJournal = new MemoryJournal();
  const source = harness(sourceJournal);
  let sourceState = baseState();
  sourceState = (await source.append(sourceState, {
    type: 'CREATE_GROUP',
    payload: {group: {id: 'g-recovered', name: 'Recovered dinner', memberIds: ['mina', 'leo']}},
  }, 'mina')).state;
  sourceState = (await source.append(sourceState, expenseAction('recovered-meal', 18.25, sourceState), 'mina')).state;
  const recoveredEvents = await source.readAcceptedEvents('g-recovered');

  const freshJournal = new MemoryJournal();
  const fresh = harness(freshJournal);
  const freshBase: AppState = {
    ...createCleanState(),
    currentUserId: 'leo',
    users: {leo: {id: 'leo', name: 'Leo', accountPublicKeyHex: publicKey('leo')}},
  };
  const imported = await fresh.importRecoveredEvents(freshBase, recoveredEvents);
  assert.equal(imported.outcome, 'applied');
  assert.equal(imported.importedEventIds.length, 2);
  assert.equal(imported.state.groups['g-recovered'].name, 'Recovered dinner');
  assert.equal(imported.state.expenses['recovered-meal'].amount, 18.25);
  assert.equal(imported.state.users.mina.accountPublicKeyHex, publicKey('mina'));
  assert.equal((await fresh.readAcceptedEvents('g-recovered')).length, 2);

  const duplicate = await fresh.importRecoveredEvents(imported.state, recoveredEvents);
  assert.equal(duplicate.outcome, 'duplicate');
  assert.deepEqual(duplicate.importedEventIds, []);

  const invalidJournal = new MemoryJournal();
  const invalid = harness(invalidJournal);
  const tampered = structuredClone(recoveredEvents);
  tampered[1] = {...tampered[1], signatureHex: '0x00'};
  await assert.rejects(invalid.importRecoveredEvents(freshBase, tampered), /signature|invalid|rejected/u);
  assert.deepEqual(await invalidJournal.listGroupIds(), []);
});

function harness(
  journal: MemoryJournal,
  authorizedStates: CanonicalGroupStateV1[] = [],
  identityControl: {unavailable: boolean; resolveCount: number} = {unavailable: false, resolveCount: 0},
): ProductionAuthority {
  const identities: AuthorityIdentityResolver = {
    async resolve(participantId, expectedPublicKeyHex) {
      identityControl.resolveCount += 1;
      if (identityControl.unavailable) throw new Error('test signer unavailable');
      const pair = pairs[participantId as keyof typeof pairs];
      if (!pair) throw new Error('test signer missing');
      const actual = publicKey(participantId as keyof typeof pairs);
      if (expectedPublicKeyHex && expectedPublicKeyHex !== actual) throw new Error('wrong key');
      const signer: CanonicalSigner = {sign: async bytes => sr25519Sign(bytes, pair)};
      return {participantId, publicKeyHex: actual, signer};
    },
  };
  let sequence = 0;
  return new ProductionAuthority({
    journal, identities, verify,
    memberships: {async resolve(groupId, participantId) {
      return {
        groupId, participantId, accountPublicKeyHex: publicKey(participantId as keyof typeof pairs), role: 'member',
        acceptedAt: '2026-08-23T11:59:00.000Z', invitationId: `accepted-${participantId}`,
        keyVersion: 1, groupKeyEnvelopeId: `envelope-${participantId}`,
      };
    }},
    membershipChanges: {async authorize(_command, _actorId, currentState) {
      if (currentState) authorizedStates.push(structuredClone(currentState));
      return true;
    }},
    now: () => '2026-08-23T12:00:00.000Z', randomId: () => `id-${++sequence}`,
  });
}

function baseState(): AppState {
  return {
    ...createCleanState(),
    currency: 'CHF',
    currentUserId: 'mina',
    users: {
      mina: {id: 'mina', name: 'Mina', accountPublicKeyHex: publicKey('mina')},
      leo: {id: 'leo', name: 'Leo', accountPublicKeyHex: publicKey('leo')},
      nina: {id: 'nina', name: 'Nina', accountPublicKeyHex: publicKey('nina')},
    },
  };
}

function expenseAction(expenseId: string, amount: number, state: AppState): Extract<Action, {type: 'ADD_EXPENSE'}> {
  const group = Object.values(state.groups)[0];
  const expense: Expense = {id: expenseId, groupId: group.id, description: expenseId, amount, currency: 'CHF', paidByUserId: 'mina', date: '2026-08-23T12:01:00.000Z'};
  const value = amount / group.memberIds.length;
  const splits: Split[] = group.memberIds.map(userId => ({id: `${expenseId}-${userId}`, expenseId, userId, amount: value, status: userId === 'mina' ? 'confirmed' : 'open'}));
  const total = moneyFromDecimal(amount.toFixed(2), 'CHF');
  return {type: 'ADD_EXPENSE', payload: {expense, splits, exact: {total, allocations: allocateMoneyEvenly(total, group.memberIds)}}};
}

function requestAction(splitId: string): Extract<Action, {type: 'SEND_REQUEST'}> {
  return {type: 'SEND_REQUEST', payload: {
    splitId, requestId: `request-${splitId}`, createdAt: '2026-08-23T12:00:00.000Z',
    expiresAt: '2026-08-24T12:00:00.000Z', capabilityHash: `hash-${splitId}`,
  }};
}

class MemoryJournal implements AuthorityJournalStore {
  private readonly records = new Map<string, PersistedAuthorityGroupV1>();
  failWrites = false;
  failCas = false;
  async listGroupIds(): Promise<string[]> { return [...this.records.keys()]; }
  async read(groupId: string): Promise<PersistedAuthorityGroupV1 | null> { return structuredClone(this.records.get(groupId) ?? null); }
  async compareAndSwap(groupId: string, expectedFrontierHash: string | null, value: PersistedAuthorityGroupV1): Promise<boolean> {
    if (this.failWrites) throw new Error('durable write failed');
    if (this.failCas) return false;
    if ((this.records.get(groupId)?.frontierHash ?? null) !== expectedFrontierHash) return false;
    this.records.set(groupId, structuredClone(value));
    return true;
  }
  async clear(): Promise<void> { this.records.clear(); }
  forceWrite(groupId: string, value: PersistedAuthorityGroupV1): void { this.records.set(groupId, structuredClone(value)); }
}
