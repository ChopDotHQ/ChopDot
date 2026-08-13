import assert from 'node:assert/strict';
import test from 'node:test';
import {migrateLegacyAppState, migrateMainAppMoneyRows} from '../src/core/legacyMoneyMigration.ts';
import {createCleanState} from '../src/state/store.ts';

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
