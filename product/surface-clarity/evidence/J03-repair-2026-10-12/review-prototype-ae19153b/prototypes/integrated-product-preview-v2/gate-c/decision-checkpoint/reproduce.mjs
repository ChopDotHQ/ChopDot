import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

// Source evidence only: this is not the integrated Gate C model or a provider.
const root = new URL('./', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('source-hashes.json', root)));
const checks = [];
function check(id, fn) { fn(); checks.push({ id, outcome: 'PASS' }); }
for (const source of manifest) {
  check(`SOURCE:${source.path}`, () => {
    const bytes = readFileSync(new URL(source.local_path, root));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), source.sha256);
    assert.equal(createHash('sha1').update(Buffer.concat([
      Buffer.from(`blob ${bytes.length}\0`), bytes
    ])).digest('hex'), source.blob);
  });
}
const require = createRequire(import.meta.url);
const model = require('./sources/authority/prototypes/experience-workbench/journeys/12-complete-settlement/source/continuity-model.cjs');
const f = model.fixtures.partial;
let record = model.initial('partial');
check('APPROVED-PAIR-AND-LINEAGE', () => {
  assert.equal(f.original, 5430); assert.equal(f.amount, 2000);
  assert.deepEqual(f.source, ['Apartment', 'Ski Trip']);
  assert.deepEqual(f.items, ['apartment-ja-7430', 'ski-ja-credit-2000']);
  assert.equal(7430n - 2000n, BigInt(f.original));
});
check('PAYER-CANNOT-CONFIRM-RECEIPT', () => {
  assert.strictEqual(model.apply(record, 'ReceiverConfirmedPartial', 'payer', {
    recipient: f.recipient, paymentId: record.id, amount: 2000
  }), record);
});
check('OTHER-RECIPIENT-CANNOT-CONFIRM', () => {
  assert.strictEqual(model.apply(record, 'ReceiverConfirmedPartial', 'receiver', {
    recipient: 'Someone else', paymentId: record.id, amount: 2000
  }), record);
});
check('RECEIVED-IS-NOT-YET-CLOSED', () => {
  record = model.apply(record, 'ReceiverConfirmedPartial', 'receiver', {
    recipient: f.recipient, paymentId: record.id, amount: 2000
  });
  assert.equal(record.state, 'received'); assert.equal(record.confirmed, 2000);
  assert.equal(model.balance(record), 5430);
});
check('REFRESH-DOES-NOT-CLOSE', () => {
  assert.strictEqual(model.apply(record, 'PaymentStatusRefreshRequested'), record);
});
check('APPROVED-PARTIAL-CLOSE-REMAINDER', () => {
  record = model.apply(record, 'DemoPaymentClosed', 'demo-backend');
  assert.equal(record.state, 'partial'); assert.equal(record.settled, 2000);
  assert.equal(model.balance(record), 3430); assert.equal(record.id, f.id);
  assert.deepEqual(model.fixtures.partial.items, ['apartment-ja-7430', 'ski-ja-credit-2000']);
});
check('DUPLICATE-CLOSE-IS-PURE', () => {
  assert.strictEqual(model.apply(record, 'DemoPaymentClosed', 'demo-backend'), record);
});
let unknown = model.apply(model.initial('twint'), 'PaymentOutcomeUnknown');
check('UNKNOWN-RETRY-RECOVERS-SAME-IDENTITY', () => {
  const next = model.apply(unknown, 'PaymentRetryRequested');
  assert.equal(next.state, 'recovering'); assert.equal(next.id, unknown.id);
  assert.equal(next.retryEligible, false); assert.equal(next.settled, 0);
  unknown = next;
});
check('MATCHED-NONEXECUTION-ALLOWS-ONE-RETRY', () => {
  const t = model.fixtures.twint;
  const proven = model.apply(unknown, 'DemoVerifiedResult', 'demo-provider', {
    paymentId: t.id, method: t.method, recipient: t.recipient,
    outcome: 'not-executed'
  });
  assert.equal(proven.retryEligible, true);
  const retry = model.apply(proven, 'PaymentRetryRequested');
  assert.equal(retry.state, 'retrying'); assert.equal(retry.id, t.id);
  assert.equal(retry.retryEligible, false);
  assert.strictEqual(model.apply(retry, 'PaymentRetryRequested'), retry);
});

// These two alternatives are COUNTEREXAMPLES to unique attribution, not
// implementations, tests of approved attribution, or approved product rules.
const alternatives = [
  { id: 'ILLUSTRATION-KEEP-OFFSET-OPEN', Apartment: 5430n, 'Ski Trip': -2000n },
  { id: 'ILLUSTRATION-CONSUME-OFFSET', Apartment: 3430n, 'Ski Trip': 0n }
];
check('PAIR-REMAINDER-DOES-NOT-SELECT-GROUP-RESIDUALS', () => {
  for (const a of alternatives) assert.equal(a.Apartment + a['Ski Trip'], 3430n);
  assert.notEqual(alternatives[0].Apartment, alternatives[1].Apartment);
  assert.notEqual(alternatives[0]['Ski Trip'], alternatives[1]['Ski Trip']);
  assert.equal(Object.hasOwn(record, 'groupResiduals'), false);
});
const serialize = value => JSON.parse(JSON.stringify(value, (_, v) =>
  typeof v === 'bigint' ? v.toString() : v));
console.log(JSON.stringify({
  status: 'SOURCE_EVIDENCE_EXECUTED_PRODUCT_DECISION_REQUIRED',
  authority_sha: '4ba456e6595330e4ca8e21366e0d827f17e10881',
  schema_sha: '5107e64b1b2a0cb0eddd34f8235dfd6ae1d54013',
  accepted_gate_b_sha: '28775726dc06b1823e231d50b4d84080a07530fb',
  runtime: process.version,
  source_hashes_verified: manifest.length,
  executable_source_checks: checks.length - manifest.length,
  checks,
  approved_reference_result: { payment_id: record.id, state: record.state,
    confirmed_minor: String(record.confirmed), remaining_minor: String(model.balance(record)),
    currency: f.currency, groups: f.source, items: f.items },
  attribution_illustrations_not_approved: serialize(alternatives),
  blocker: 'GC-SOURCE-PARTIAL-ATTRIBUTION-01',
  limits: [
    'Checks exercise the unchanged approved reference reducer, not an integrated implementation.',
    'Two arithmetic alternatives illustrate underdetermination; they are not product authority.',
    'No Gate C browser, regression, visual or implementation review has run.',
    'The absence conclusion is bounded to the independently reviewed source set.'
  ]
}, null, 2));
