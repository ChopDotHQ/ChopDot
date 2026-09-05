import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assessLegacyAppState,
  bootstrapLegacyAssessment,
  migrateLegacyAppState,
  migrateMainAppMoneyRows,
  persistLegacyAssessment,
  verifyLegacyMigrationAssessment,
  type LegacyMigrationAssessmentV1,
} from '../src/core/legacyMoneyMigration.ts';
import {createCleanState} from '../src/state/store.ts';
import {AUTHORITY_STORAGE_RESET_STORES} from '../src/core/authority/browserAuthority.ts';
import {canonicalJson, sha256Hex} from '../src/core/canonical.ts';

test('authority reset clears legacy assessment ciphertext before the shared encryption key', () => {
  assert.deepEqual(AUTHORITY_STORAGE_RESET_STORES, ['journals', 'authority-deliveries', 'legacy-assessments', 'keys']);
});

test('exact legacy CHF state migrates deterministically and idempotently', async () => {
  const state = createCleanState();
  state.currency = 'CHF';
  state.currentUserId = 'mina';
  state.users = {mina: {id: 'mina', name: 'Mina'}, leo: {id: 'leo', name: 'Leo'}, nina: {id: 'nina', name: 'Nina'}};
  state.groups.g1 = {id: 'g1', name: 'Zurich Dinner', memberIds: ['mina', 'leo', 'nina']};
  state.expenses.e1 = {id: 'e1', groupId: 'g1', description: 'Dinner', amount: 120, currency: 'CHF', paidByUserId: 'mina', date: '2026-08-13T12:00:00.000Z'};
  state.splits.s1 = {id: 's1', expenseId: 'e1', userId: 'mina', amount: 40, status: 'open'};
  state.splits.s2 = {id: 's2', expenseId: 'e1', userId: 'leo', amount: 40, status: 'request_sent'};
  state.splits.s3 = {id: 's3', expenseId: 'e1', userId: 'nina', amount: 40, status: 'confirmed'};

  const first = await migrateLegacyAppState(state);
  const second = await migrateLegacyAppState(JSON.parse(JSON.stringify(state)));
  assert.equal(first.quarantined.length, 0);
  assert.equal(first.groups.g1.expenses.e1.total.minorUnits, '12000');
  assert.equal(first.groups.g1.shares.s2.amount.minorUnits, '4000');
  assert.equal(first.groups.g1.shares.s3.status, 'received');
  assert.equal(first.stateHash, second.stateHash);
  assert.equal(first.groups.g1.needsAccountBinding, true);
});

test('ambiguous floats, broken conservation, and unsupported currency are quarantined without partial migration', async () => {
  const state = createCleanState();
  state.currentUserId = 'mina';
  state.users = {mina: {id: 'mina', name: 'Mina'}, leo: {id: 'leo', name: 'Leo'}};
  state.groups.ambiguous = {id: 'ambiguous', name: 'Ambiguous', memberIds: ['mina', 'leo']};
  state.expenses.e1 = {id: 'e1', groupId: 'ambiguous', description: 'Bad', amount: 0.1 + 0.2, currency: 'CHF', paidByUserId: 'mina', date: '2026-08-13T12:00:00.000Z'};
  state.splits.s1 = {id: 's1', expenseId: 'e1', userId: 'mina', amount: 0.1, status: 'open'};
  state.splits.s2 = {id: 's2', expenseId: 'e1', userId: 'leo', amount: 0.2, status: 'open'};

  const result = await migrateLegacyAppState(state);
  assert.deepEqual(result.groups, {});
  assert.equal(result.quarantined.length, 1);
  assert.equal(result.quarantined[0].groupId, 'ambiguous');
  assert.match(result.quarantined[0].reason, /exact|conserve/u);
});

test('CHF and USD remain separate during migration', async () => {
  const state = createCleanState();
  state.users = {mina: {id: 'mina', name: 'Mina'}};
  state.groups.g1 = {id: 'g1', name: 'Trip', memberIds: ['mina']};
  state.expenses.chf = {id: 'chf', groupId: 'g1', description: 'Train', amount: 10, currency: 'CHF', paidByUserId: 'mina', date: '2026-08-13T12:00:00.000Z'};
  state.expenses.usd = {id: 'usd', groupId: 'g1', description: 'Ticket', amount: 12, currency: 'USD', paidByUserId: 'mina', date: '2026-08-13T12:01:00.000Z'};
  state.splits.chf = {id: 'chf', expenseId: 'chf', userId: 'mina', amount: 10, status: 'open'};
  state.splits.usd = {id: 'usd', expenseId: 'usd', userId: 'mina', amount: 12, status: 'open'};
  const result = await migrateLegacyAppState(state);
  assert.deepEqual(Object.keys(result.groups.g1.currencyTotals).sort(), ['CHF', 'USD']);
  assert.equal(result.groups.g1.currencyTotals.CHF.minorUnits, '1000');
  assert.equal(result.groups.g1.currencyTotals.USD.minorUnits, '1200');
});

test('year-long app normalized Supabase rows adapt from bigint minor units without making the provider authority',async()=>{
  const expenses=[{id:'expense-main',pot_id:'pot-dinner',amount_minor:'12000',currency_code:'CHF',paid_by:'mina',description:'Zurich Dinner'}];
  const splits=[
    {id:'split-mina',expense_id:'expense-main',member_id:'mina',amount_minor:'4000'},
    {id:'split-leo',expense_id:'expense-main',member_id:'leo',amount_minor:'4000'},
    {id:'split-nina',expense_id:'expense-main',member_id:'nina',amount_minor:'4000'},
  ];
  const first=await migrateMainAppMoneyRows(expenses,splits);
  const second=await migrateMainAppMoneyRows(structuredClone(expenses),structuredClone(splits).reverse());
  assert.equal(first.expenses['expense-main'].total.minorUnits,'12000');
  assert.equal(first.expenses['expense-main'].total.currency,'CHF');
  assert.equal(first.stateHash,second.stateHash);
  assert.equal(first.source,'main-app-normalized-supabase');
});

test('year-long app malformed or unbalanced rows quarantine without partial expense import',async()=>{
  const result=await migrateMainAppMoneyRows(
    [{id:'expense-bad',pot_id:'pot-dinner',amount_minor:'10000',currency_code:'CHF',paid_by:'mina'}],
    [{id:'split-bad',expense_id:'expense-bad',member_id:'leo',amount_minor:'9999'}],
  );
  assert.deepEqual(result.expenses,{});
  assert.equal(result.quarantined.length,1);
  assert.match(result.quarantined[0].reason,/conserve/u);
});

test('production assessment is deterministic, read-only, and never treats stored keys or statuses as authority', async () => {
  const state = createCleanState();
  state.currentUserId = 'mina';
  state.users = {
    leo: {id: 'leo', name: 'Leo', accountPublicKeyHex: `0x${'22'.repeat(32)}`},
    mina: {id: 'mina', name: 'Mina', accountPublicKeyHex: `0x${'11'.repeat(32)}`},
  };
  state.groups.g1 = {id: 'g1', name: 'Dinner', memberIds: ['leo', 'mina'], closedRecordId: 'legacy-close'};
  state.expenses.e1 = {id: 'e1', groupId: 'g1', description: 'Dinner', amount: 12, currency: 'CHF', paidByUserId: 'mina', date: '2026-08-13T12:00:00.000Z'};
  state.splits.s2 = {id: 's2', expenseId: 'e1', userId: 'leo', amount: 6, status: 'confirmed'};
  state.splits.s1 = {id: 's1', expenseId: 'e1', userId: 'mina', amount: 6, status: 'open'};
  state.savedRecords['legacy-close'] = {
    id: 'legacy-close', groupId: 'g1', dateSaved: '2026-08-13T13:00:00.000Z', totalAmount: 12, openAmount: 6,
    splits: [structuredClone(state.splits.s2), structuredClone(state.splits.s1)],
  };
  const before = structuredClone(state);
  const first = await assessLegacyAppState(state);
  const reordered = await assessLegacyAppState({
    ...state,
    users: {mina: state.users.mina, leo: state.users.leo},
    splits: {s1: state.splits.s1, s2: state.splits.s2},
  });
  assert.equal(first.sourceDigest, reordered.sourceDigest);
  assert.equal(first.assessmentDigest, reordered.assessmentDigest);
  assert.equal(first.groups.g1.verdict, 'ready_for_review');
  assert.equal(first.groups.g1.authorityClaims, 'unproven');
  assert.equal(first.groups.g1.sourceClaims.closedRecordId, 'legacy-close');
  assert.deepEqual(first.groups.g1.sourceClaims.legacyStatuses, [{splitId: 's1', status: 'open'}, {splitId: 's2', status: 'confirmed'}]);
  assert.equal(first.createsAuthority, false);
  assert.deepEqual(state, before, 'assessment never mutates the source projection');
});

test('production assessment quarantines whole groups with stable structural reason codes and no partial observations', async () => {
  const state = createCleanState();
  state.currency = 'CHF';
  state.users = {mina: {id: 'mina', name: 'Mina'}, outsider: {id: 'outsider', name: 'Outsider'}};
  state.groups.g1 = {id: 'g1', name: 'Broken', memberIds: ['mina']};
  state.expenses.e1 = {id: 'e1', groupId: 'g1', description: 'No currency', amount: 10, paidByUserId: 'outsider', date: '2026-08-13T12:00:00.000Z'};
  state.splits.s1 = {id: 's1', expenseId: 'e1', userId: 'outsider', amount: 10, status: 'unknown' as never};
  const result = await assessLegacyAppState(state);
  assert.equal(result.groups.g1.verdict, 'quarantined');
  assert.deepEqual(result.groups.g1.reasonCodes, ['currency_missing', 'payer_not_member', 'split_participant_not_member', 'status_unknown']);
  assert.deepEqual(result.groups.g1.findings, [
    {code: 'currency_missing', path: '/expenses/e1/currency'},
    {code: 'payer_not_member', path: '/expenses/e1/paidByUserId'},
    {code: 'split_participant_not_member', path: '/splits/s1/userId'},
    {code: 'status_unknown', path: '/splits/s1/status'},
  ]);
  assert.deepEqual(result.groups.g1.observations, {expenses: {}, shares: {}, currencyTotals: {}});
});

test('production assessment uses the versioned currency registry and declared exponents', async () => {
  const supported = createCleanState();
  supported.users.mina = {id: 'mina', name: 'Mina'};
  supported.groups.g1 = {id: 'g1', name: 'PAS', memberIds: ['mina']};
  supported.expenses.e1 = {id: 'e1', groupId: 'g1', description: 'Native', amount: 0.024, currency: 'PAS', paidByUserId: 'mina', date: '2026-08-13T12:00:00.000Z'};
  supported.splits.s1 = {id: 's1', expenseId: 'e1', userId: 'mina', amount: 0.024, status: 'open'};
  const pas = await assessLegacyAppState(supported);
  assert.equal(pas.groups.g1.verdict, 'ready_for_review');
  assert.deepEqual(pas.groups.g1.observations.expenses.e1.total, {v: 1, minorUnits: '24000000000', currency: 'PAS', exponent: 12});

  const unsupported = structuredClone(supported);
  unsupported.expenses.e1.currency = 'XYZ';
  const xyz = await assessLegacyAppState(unsupported);
  assert.deepEqual(xyz.groups.g1.reasonCodes, ['currency_unsupported']);
  assert.deepEqual(xyz.groups.g1.observations, {expenses: {}, shares: {}, currencyTotals: {}});

  const tooPrecise = structuredClone(supported);
  tooPrecise.expenses.e1.currency = 'CHF';
  tooPrecise.expenses.e1.amount = 0.001;
  tooPrecise.splits.s1.amount = 0.001;
  assert.ok((await assessLegacyAppState(tooPrecise)).groups.g1.reasonCodes.includes('money_ambiguous'));
});

test('production assessment requires one exact payer allocation', async () => {
  const state = createCleanState();
  state.users = {mina: {id: 'mina', name: 'Mina'}, leo: {id: 'leo', name: 'Leo'}};
  state.groups.g1 = {id: 'g1', name: 'Dinner', memberIds: ['mina', 'leo']};
  state.expenses.e1 = {id: 'e1', groupId: 'g1', description: 'Dinner', amount: 10, currency: 'CHF', paidByUserId: 'mina', date: '2026-08-13T12:00:00.000Z'};
  state.splits.s1 = {id: 's1', expenseId: 'e1', userId: 'leo', amount: 10, status: 'open'};
  const missing = await assessLegacyAppState(state);
  assert.ok(missing.groups.g1.reasonCodes.includes('payer_allocation_missing'));
  assert.deepEqual(missing.groups.g1.observations, {expenses: {}, shares: {}, currencyTotals: {}});

  state.splits.s2 = {id: 's2', expenseId: 'e1', userId: 'leo', amount: 0, status: 'open'};
  assert.ok((await assessLegacyAppState(state)).groups.g1.reasonCodes.includes('split_participant_duplicate'));
});

test('production assessment never trims opaque identifiers into a match', async () => {
  const state = createCleanState();
  state.users.mina = {id: 'mina', name: 'Mina'};
  state.groups.g1 = {id: 'g1', name: 'Dinner', memberIds: [' mina ']};
  state.expenses.e1 = {id: 'e1', groupId: 'g1', description: 'Dinner', amount: 1, currency: 'CHF', paidByUserId: ' mina ', date: '2026-08-13T12:00:00.000Z'};
  state.splits.s1 = {id: 's1', expenseId: 'e1', userId: ' mina ', amount: 1, status: 'open'};
  const whitespace = await assessLegacyAppState(state);
  assert.equal(whitespace.groups.g1.verdict, 'quarantined');
  assert.ok(whitespace.groups.g1.reasonCodes.includes('group_member_missing'));
  assert.ok(whitespace.groups.g1.reasonCodes.includes('payer_not_member'));

  const unicode = createCleanState();
  unicode.users['miná'] = {id: 'miná', name: 'Mina'};
  unicode.groups.g1 = {id: 'g1', name: 'Dinner', memberIds: ['miná']};
  const distinct = await assessLegacyAppState(unicode);
  assert.ok(distinct.groups.g1.reasonCodes.includes('group_member_missing'), 'Unicode normalization is never inferred');
});

test('authority collisions supersede review without reading or creating a journal', async () => {
  const state = createCleanState();
  state.users = {mina: {id: 'mina', name: 'Mina'}};
  state.groups.g1 = {id: 'g1', name: 'Existing', memberIds: ['mina']};
  const withoutAuthority = await assessLegacyAppState(state, []);
  const result = await assessLegacyAppState(state, ['g1']);
  assert.equal(result.groups.g1.verdict, 'superseded_by_authority');
  assert.deepEqual(result.groups.g1.reasonCodes, ['authority_journal_exists']);
  assert.equal(result.createsAuthority, false);
  assert.equal(result.sourceDigest, withoutAuthority.sourceDigest);
  assert.notEqual(result.authorityContextDigest, withoutAuthority.authorityContextDigest);
});

test('bootstrap blocks an unstable authority-ID observation before persisting', async () => {
  const state = createCleanState();
  let reads = 0;
  let writes = 0;
  const store = {
    async listGroupIds() { reads += 1; return reads % 2 === 0 ? ['raced'] : []; },
    async readLegacyAssessment() { return null; },
    async putLegacyAssessmentIfAbsent() { writes += 1; return 'stored' as const; },
  };
  await assert.rejects(bootstrapLegacyAssessment(state, store), /unstable/u);
  assert.equal(reads, 4, 'the bounded observer retries exactly once');
  assert.equal(writes, 0, 'unstable journal identity is never persisted or exposed');
});

test('bootstrap consumes its bounded retry when the final authority recheck changes', async () => {
  const state = createCleanState();
  let reads = 0;
  let writes = 0;
  const stored = new Map<string, LegacyMigrationAssessmentV1>();
  const store = {
    async listGroupIds() {
      reads += 1;
      return reads <= 2 ? [] : ['raced'];
    },
    async readLegacyAssessment(recordId: string) { return structuredClone(stored.get(recordId) ?? null); },
    async putLegacyAssessmentIfAbsent(recordId: string, value: LegacyMigrationAssessmentV1) {
      if (stored.has(recordId)) return 'exists' as const;
      stored.set(recordId, structuredClone(value));
      writes += 1;
      return 'stored' as const;
    },
  };
  const result = await bootstrapLegacyAssessment(state, store);
  assert.deepEqual(result.authorityGroupIds, ['raced']);
  assert.equal(reads, 6);
  assert.equal(writes, 2, 'the stale-context evidence remains immutable while only the stable retry is exposed');
});

test('production bootstrap persists once, never invokes authority CAS, and corrupt readback fails visibly', async () => {
  const state = createCleanState();
  let writes = 0;
  let authorityCasCalls = 0;
  let signerCalls = 0;
  let keyCreationCalls = 0;
  let eventCreationCalls = 0;
  let journalRecordReads = 0;
  const stored = new Map<string, unknown>();
  const store = {
    async listGroupIds() { return []; },
    async readLegacyAssessment(sourceDigest: string) { return structuredClone(stored.get(sourceDigest) ?? null); },
    async putLegacyAssessmentIfAbsent(sourceDigest: string, value: LegacyMigrationAssessmentV1) {
      if (stored.has(sourceDigest)) return 'exists' as const;
      writes += 1;
      stored.set(sourceDigest, structuredClone(value));
      return 'stored' as const;
    },
    async compareAndSwap() { authorityCasCalls += 1; },
    async resolveSigner() { signerCalls += 1; },
    async createKey() { keyCreationCalls += 1; },
    async createEvent() { eventCreationCalls += 1; },
    async readJournal() { journalRecordReads += 1; },
  };
  const first = await bootstrapLegacyAssessment(state, store);
  assert.equal(first.outcome, 'persisted');
  assert.equal((await bootstrapLegacyAssessment(state, store)).outcome, 'duplicate');
  const changed = structuredClone(state);
  changed.users.mina = {id: 'mina', name: 'Changed'};
  assert.equal((await bootstrapLegacyAssessment(changed, store)).outcome, 'persisted');
  assert.equal(stored.size, 2, 'a changed source retains the prior immutable record');
  assert.equal(writes, 2);
  assert.deepEqual([authorityCasCalls, signerCalls, keyCreationCalls, eventCreationCalls, journalRecordReads], [0, 0, 0, 0, 0]);
  stored.set(`${first.assessment.sourceDigest}:${first.assessment.authorityContextDigest}`, {v: 1, kind: 'legacy-migration-assessment'});
  await assert.rejects(bootstrapLegacyAssessment(state, store), /corrupt/u);
  assert.equal(writes, 2);
  assert.deepEqual([authorityCasCalls, signerCalls, keyCreationCalls, eventCreationCalls, journalRecordReads], [0, 0, 0, 0, 0]);
});

test('a global orphan with no group produces an overall quarantine and stable redacted source evidence', async () => {
  const state = createCleanState();
  state.expenses.orphan = {id: 'orphan', groupId: 'missing', description: 'Orphan', amount: 1, currency: 'CHF', paidByUserId: 'missing', date: '2026-08-13T12:00:00.000Z'};
  const result = await assessLegacyAppState(state);
  assert.equal(result.overallVerdict, 'quarantined');
  assert.deepEqual(result.sourceReasonCodes, ['expense_orphaned']);
  assert.deepEqual(result.groups, {});
  assert.deepEqual(result.sourceEvidence, {userIds: [], groupIds: [], expenseIds: ['orphan'], splitIds: [], savedRecordIds: []});
});

test('fractional IEEE-754 values, negative zero, and insertion order have stable distinct source digests', async () => {
  const state = createCleanState();
  state.users = {a: {id: 'a', name: 'A'}, b: {id: 'b', name: 'B'}};
  const reversed = {...state, users: {b: state.users.b, a: state.users.a}};
  const first = await assessLegacyAppState(state);
  const reordered = await assessLegacyAppState(reversed);
  assert.equal(first.sourceDigest, reordered.sourceDigest);
  const negativeZero = structuredClone(state);
  negativeZero.savedRecords.r = {id: 'r', groupId: 'missing', dateSaved: 'x', totalAmount: -0, openAmount: 0.1, splits: []};
  const positiveZero = structuredClone(negativeZero);
  positiveZero.savedRecords.r.totalAmount = 0;
  assert.notEqual((await assessLegacyAppState(negativeZero)).sourceDigest, (await assessLegacyAppState(positiveZero)).sourceDigest);
});

test('source digest excludes capabilities, wallets, live sessions, payments, activity, and presentation state', async () => {
  const state = createCleanState();
  state.users.mina = {id: 'mina', name: 'Mina', accountPublicKeyHex: `0x${'11'.repeat(32)}`};
  state.groups.g1 = {id: 'g1', name: 'Dinner', memberIds: ['mina']};
  state.expenses.e1 = {id: 'e1', groupId: 'g1', description: 'Dinner', amount: 1, currency: 'CHF', paidByUserId: 'mina', date: '2026-08-13T12:00:00.000Z'};
  state.splits.s1 = {id: 's1', expenseId: 'e1', userId: 'mina', amount: 1, status: 'open'};
  const baseline = await assessLegacyAppState(state);
  const secretsChanged = structuredClone(state);
  secretsChanged.theme = 'dark';
  secretsChanged.users.mina.walletAddress = `0x${'22'.repeat(20)}`;
  secretsChanged.users.mina.statementSignerHex = `0x${'33'.repeat(32)}`;
  secretsChanged.groups.g1.liveSession = {roomId: 'private-room', secret: 'do-not-hash'};
  secretsChanged.splits.s1.requestEntryCapability = 'capability-secret';
  secretsChanged.splits.s1.requestCapabilityHash = 'capability-hash';
  secretsChanged.splits.s1.walletPayment = {txHash: '0xtx', chainId: 'chain', from: 'from', to: 'to', amountBaseUnits: '1', blockNumber: '1', confirmedAt: 'now'};
  secretsChanged.activityEvents.secret = {id: 'secret', type: 'private', timestamp: 'now', details: {secret: 'activity-secret'}};
  const changedSecretsAssessment = await assessLegacyAppState(secretsChanged);
  assert.equal(changedSecretsAssessment.sourceDigest, baseline.sourceDigest);
  assert.deepEqual(changedSecretsAssessment.sourcePacket, baseline.sourcePacket, 'the exact redacted packet is preserved independently of excluded secrets');
  const preservedPacket = JSON.stringify(baseline.sourcePacket);
  assert.match(preservedPacket, /"description":"Dinner"/u);
  assert.match(preservedPacket, /"amount":\{"number":"3ff0000000000000"\}/u);
  for (const excluded of ['do-not-hash', 'capability-secret', 'capability-hash', 'activity-secret', 'walletPayment', 'statementSignerHex']) {
    assert.equal(preservedPacket.includes(excluded), false);
  }
  const amountChanged = structuredClone(state);
  amountChanged.expenses.e1.amount = 2;
  assert.notEqual((await assessLegacyAppState(amountChanged)).sourceDigest, baseline.sourceDigest);
  const memberOrderA = structuredClone(state);
  memberOrderA.users.leo = {id: 'leo', name: 'Leo'};
  memberOrderA.groups.g1.memberIds = ['mina', 'leo'];
  const memberOrderB = structuredClone(memberOrderA);
  memberOrderB.groups.g1.memberIds = ['leo', 'mina'];
  assert.notEqual((await assessLegacyAppState(memberOrderA)).sourceDigest, (await assessLegacyAppState(memberOrderB)).sourceDigest);
});

test('strict readback validation rejects malformed nested ready observations', async () => {
  const state = createCleanState();
  state.users.mina = {id: 'mina', name: 'Mina'};
  state.groups.g1 = {id: 'g1', name: 'Dinner', memberIds: ['mina']};
  state.expenses.e1 = {id: 'e1', groupId: 'g1', description: 'Dinner', amount: 1, currency: 'CHF', paidByUserId: 'mina', date: '2026-08-13T12:00:00.000Z'};
  state.splits.s1 = {id: 's1', expenseId: 'e1', userId: 'mina', amount: 1, status: 'open'};
  const malformed = structuredClone(await assessLegacyAppState(state));
  (malformed.groups.g1.observations.expenses.e1.total as {minorUnits: string}).minorUnits = '-1';
  await assert.rejects(verifyLegacyMigrationAssessment(malformed), /corrupt/u);
  const unknownReason = structuredClone(await assessLegacyAppState(state)) as LegacyMigrationAssessmentV1;
  unknownReason.groups.g1.reasonCodes.push('unknown_reason' as never);
  await assert.rejects(verifyLegacyMigrationAssessment(unknownReason), /corrupt/u);

  const nonconserving = structuredClone(await assessLegacyAppState(state));
  nonconserving.groups.g1.observations.expenses.e1.total = {v: 1, minorUnits: '999', currency: 'CHF', exponent: 2};
  await assert.rejects(verifyLegacyMigrationAssessment(nonconserving), /corrupt/u);

  const orphanShare = structuredClone(await assessLegacyAppState(state));
  orphanShare.groups.g1.observations.shares.s1.expenseId = 'missing';
  await assert.rejects(verifyLegacyMigrationAssessment(orphanShare), /corrupt/u);

  const wrongTotals = structuredClone(await assessLegacyAppState(state));
  wrongTotals.groups.g1.observations.currencyTotals.CHF = {v: 1, minorUnits: '2', currency: 'CHF', exponent: 2};
  await assert.rejects(verifyLegacyMigrationAssessment(wrongTotals), /corrupt/u);

  const falseReady = structuredClone(await assessLegacyAppState(state));
  falseReady.groups.g1.reasonCodes.push('money_ambiguous');
  falseReady.groups.g1.findings.push({code: 'money_ambiguous', path: '/expenses/e1/amount'});
  await assert.rejects(verifyLegacyMigrationAssessment(falseReady), /corrupt/u);

  const overLimit = structuredClone(await assessLegacyAppState(state));
  overLimit.groups.g1.observations.expenses.e1.total = {v: 1, minorUnits: `${10n ** 30n + 1n}`, currency: 'CHF', exponent: 2};
  overLimit.groups.g1.observations.shares.s1.amount = structuredClone(overLimit.groups.g1.observations.expenses.e1.total);
  overLimit.groups.g1.observations.currencyTotals.CHF = structuredClone(overLimit.groups.g1.observations.expenses.e1.total);
  await assert.rejects(verifyLegacyMigrationAssessment(overLimit), /corrupt/u);
});

test('persistence rejects a digest-valid assessment whose preserved source semantics do not match observations', async () => {
  const state = createCleanState();
  state.users.mina = {id: 'mina', name: 'Mina'};
  state.groups.g1 = {id: 'g1', name: 'Dinner', memberIds: ['mina']};
  state.expenses.e1 = {id: 'e1', groupId: 'g1', description: 'Dinner', amount: 10, currency: 'CHF', paidByUserId: 'mina', date: '2026-08-13T12:00:00.000Z'};
  state.splits.s1 = {id: 's1', expenseId: 'e1', userId: 'mina', amount: 10, status: 'open'};
  const forged = structuredClone(await assessLegacyAppState(state));
  const packet = forged.sourcePacket as {expenses: Array<{amount: {number: string}}>; splits: Array<{amount: {number: string}}>};
  packet.expenses[0].amount.number = '4034000000000000';
  packet.splits[0].amount.number = '4034000000000000';
  forged.sourceDigest = await sha256Hex(canonicalJson(forged.sourcePacket));
  const {assessmentDigest: _, ...unsigned} = forged;
  forged.assessmentDigest = await sha256Hex(canonicalJson(unsigned));
  await assert.rejects(verifyLegacyMigrationAssessment(forged), /corrupt/u);
  const store = {
    async readLegacyAssessment() { return null; },
    async putLegacyAssessmentIfAbsent() { return 'stored' as const; },
  };
  await assert.rejects(persistLegacyAssessment(store, forged), /corrupt/u);
});

test('nonfinite legacy numbers are domain-hashed deterministically and fail closed as typed findings', async () => {
  const state = createCleanState();
  state.users.mina = {id: 'mina', name: 'Mina'};
  state.groups.g1 = {id: 'g1', name: 'Broken number', memberIds: ['mina']};
  state.expenses.e1 = {id: 'e1', groupId: 'g1', description: 'Bad', amount: Number.NaN, currency: 'CHF', paidByUserId: 'mina', date: '2026-08-13T12:00:00.000Z'};
  state.splits.s1 = {id: 's1', expenseId: 'e1', userId: 'mina', amount: Number.NaN, status: 'open'};
  const before = structuredClone(state);
  const result = await assessLegacyAppState(state);
  assert.equal(result.groups.g1.verdict, 'quarantined');
  assert.ok(result.groups.g1.reasonCodes.includes('number_nonfinite'));
  assert.ok(result.groups.g1.reasonCodes.includes('money_ambiguous'));
  assert.deepEqual(state, before);
});
