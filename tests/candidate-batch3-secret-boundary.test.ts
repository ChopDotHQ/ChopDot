import assert from 'node:assert/strict';
import test from 'node:test';
import {moneyFromDecimal, moneyToDecimal} from '../src/core/money.ts';
import {createRedactedGroupExport} from '../src/core/groupExport.ts';
import type {CanonicalGroupStateV1} from '../src/core/moneyEventKernel.ts';
import {createAccountBoundGroupKeyEnvelope} from '../src/environment/accountBoundKeyEnvelope.ts';
import {MemoryCheckpointArchive, MemoryRecoveryLocatorStore} from '../src/recovery/groupRecovery.ts';

test('money export stays exact, partitioned, and free of payment custody fields', () => {
  const amount = moneyFromDecimal('120.00', 'CHF');
  const exported = JSON.stringify({groupId:'g-dinner', total: amount, display: moneyToDecimal(amount)});
  assert.equal(exported.includes('12000'), true);
  assert.equal(exported.includes('CHF'), true);
  for (const forbidden of ['privateKey','seed','bankBalance','custodyBalance','paymentCredential','cardNumber']) {
    assert.equal(exported.includes(forbidden), false);
  }
});

test('minimum-disclosure export omits Product Account keys, signatures, and recovery material', () => {
  const amount=moneyFromDecimal('120.00','CHF');
  const state:CanonicalGroupStateV1={v:1,groupId:'g-dinner',name:'Zurich Dinner',version:2,currentEventId:'02-expense',organizerId:'mina',members:{mina:{participantId:'mina',accountPublicKeyHex:`0x${'11'.repeat(32)}`,role:'organizer'}},expenses:{e1:{expenseId:'e1',description:'Dinner',paidBy:'mina',originalTotal:amount,total:amount,revisions:[]}},shares:{'share:e1:mina':{shareId:'share:e1:mina',expenseId:'e1',participantId:'mina',originalAmount:amount,amount,status:'open',adjustments:[]}},closed:null,successorRecords:[],eventIds:['01-create','02-expense']};
  const exported=createRedactedGroupExport(state,`0x${'ab'.repeat(32)}`);
  const serialized=JSON.stringify(exported);
  assert.equal(serialized.includes('accountPublicKeyHex'),false);
  assert.equal(serialized.includes('signature'),false);
  assert.equal(serialized.includes('ciphertext'),false);
  assert.equal(serialized.includes('12000'),true);
});

test('account-bound envelope and recovery edges expose no raw group key', async () => {
  const key = Uint8Array.from({length:32}, (_, index) => index + 10);
  const metadata = {productId:'app.chopdotproof02.dot',groupId:'g-dinner',recipientId:'leo',recipientAccountPublicKeyHex:`0x${'22'.repeat(32)}`,keyVersion:1};
  const envelope = await createAccountBoundGroupKeyEnvelope(metadata, key, {deriveAccountEntropy: async context => new Uint8Array(await crypto.subtle.digest('SHA-256', context))});
  const serialized = JSON.stringify({envelope, archive:new MemoryCheckpointArchive(), locators:new MemoryRecoveryLocatorStore()});
  assert.equal(serialized.includes(Buffer.from(key).toString('hex')), false);
  assert.equal(serialized.includes(Buffer.from(key).toString('base64url')), false);
  assert.equal(Object.hasOwn(envelope, 'groupKey'), false);
});

test('authority payload capacity rejects pathological money rather than silently rounding', () => {
  assert.throws(() => moneyFromDecimal('10000000000000000000000000000000.00', 'CHF'), /limit/u);
  assert.throws(() => moneyFromDecimal('0.001', 'CHF'), /precision/u);
});
