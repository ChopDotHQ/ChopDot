import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  PaymentEvidenceCommandEnvelope,
  PaymentIntentActor,
  PaymentIntentCommandEnvelope,
} from '../../src/contracts/paymentIntent';
import {
  InMemoryPaymentIntentKernel,
  PaymentIntentKernelError,
  type CoveredSplitSnapshot,
  type PaymentIntentKernelDependencies,
} from './paymentIntentKernel';

const MINA: PaymentIntentActor = { id: 'mina', role: 'receiver' };
const LEO: PaymentIntentActor = { id: 'leo', role: 'payer' };
const HOST: PaymentIntentActor = { id: 'telegram-adapter', role: 'host_adapter' };

test('rejects malformed split snapshots before accepting commands', () => {
  assertKernelError(
    () => new InMemoryPaymentIntentKernel([{
      id: 'split-invalid',
      groupId: 'weekend-trip',
      payerUserId: 'leo',
      receiverUserId: 'mina',
      amountMinor: 4_000,
      currency: 'usd',
      status: 'open',
      version: 1,
    }]),
    'INVALID_SCOPE',
  );
});

test('enforces the receiver -> payer -> receiver lifecycle', () => {
  const fixture = createFixture();
  const created = fixture.create();
  assert.equal(created.intent.status, 'created');
  assert.equal(fixture.kernel.getSplit('split-leo')?.status, 'open');

  const sent = fixture.send(created.intent.id, created.intent.version);
  assert.equal(sent.intent.status, 'request_sent');
  assert.equal(fixture.kernel.getSplit('split-leo')?.status, 'request_sent');

  const marked = fixture.markPaid(sent.intent.id, sent.intent.version);
  assert.equal(marked.intent.status, 'marked_paid');
  assert.equal(fixture.kernel.getSplit('split-leo')?.status, 'marked_paid');

  const confirmed = fixture.confirm(marked.intent.id, marked.intent.version);
  assert.equal(confirmed.intent.status, 'confirmed');
  assert.equal(fixture.kernel.getSplit('split-leo')?.status, 'confirmed');
  assert.deepEqual(
    fixture.kernel.listEvents(confirmed.intent.id).map((event) => event.eventType),
    ['intent_created', 'request_sent', 'payer_marked_paid', 'receiver_confirmed'],
  );
});

test('rejects payer confirmation and receiver mark-paid commands', () => {
  const fixture = createFixture();
  const created = fixture.create();
  const sent = fixture.send(created.intent.id, created.intent.version);

  assertKernelError(
    () => fixture.execute({
      commandId: 'cmd-wrong-mark',
      intentId: sent.intent.id,
      actor: MINA,
      sourceSurface: 'web',
      expectedVersion: sent.intent.version,
      submittedAt: fixture.now(),
      command: { type: 'mark_paid' },
    }),
    'UNAUTHORIZED',
  );

  const marked = fixture.markPaid(sent.intent.id, sent.intent.version);
  assertKernelError(
    () => fixture.execute({
      commandId: 'cmd-wrong-confirm',
      intentId: marked.intent.id,
      actor: LEO,
      sourceSurface: 'web',
      expectedVersion: marked.intent.version,
      submittedAt: fixture.now(),
      command: { type: 'confirm_received' },
    }),
    'UNAUTHORIZED',
  );
  assert.equal(fixture.kernel.getIntent(marked.intent.id)?.status, 'marked_paid');
});

test('replays the same command id without a duplicate transition or event', () => {
  const fixture = createFixture();
  const created = fixture.create();
  const sentEnvelope = fixture.sendEnvelope(created.intent.id, created.intent.version);
  const first = fixture.execute(sentEnvelope);
  const eventCount = fixture.kernel.listEvents(first.intent.id).length;
  const replay = fixture.execute(sentEnvelope);

  assert.equal(replay.replayed, true);
  assert.equal(replay.auditEvent, null);
  assert.equal(replay.intent.version, first.intent.version);
  assert.equal(fixture.kernel.listEvents(first.intent.id).length, eventCount);

  assertKernelError(
    () => fixture.execute({ ...sentEnvelope, command: { type: 'cancel' } }),
    'IDEMPOTENCY_CONFLICT',
  );
});

test('rejects stale versions and changed split scope', () => {
  const fixture = createFixture();
  const created = fixture.create();

  assertKernelError(
    () => fixture.send(created.intent.id, 0),
    'VERSION_CONFLICT',
  );

  const invalidFixture = createFixture();
  assertKernelError(
    () => invalidFixture.create(4_100),
    'INVALID_SCOPE',
  );
});

test('normalizes currency once and preserves the canonical value through transitions', () => {
  const fixture = createFixture();
  const created = fixture.create(4_000, 'usd');

  assert.equal(created.intent.expectedAmount.currency, 'USD');
  const sent = fixture.send(created.intent.id, created.intent.version);
  assert.equal(sent.intent.status, 'request_sent');
});

test('rejects invalid timestamps and contradictory evidence sources at runtime', () => {
  const fixture = createFixture({ canSubmitHostEvidence: () => true });
  const created = fixture.create();
  const sent = fixture.send(created.intent.id, created.intent.version);

  assertKernelError(
    () => fixture.execute({
      commandId: 'cmd-invalid-time',
      intentId: sent.intent.id,
      actor: LEO,
      sourceSurface: 'web',
      expectedVersion: sent.intent.version,
      submittedAt: 'not-a-timestamp',
      command: { type: 'mark_paid' },
    }),
    'INVALID_COMMAND',
  );

  const contradictoryEvidence: PaymentEvidenceCommandEnvelope = {
    commandId: 'cmd-contradictory-evidence',
    actor: HOST,
    sourceSurface: 'telegram',
    expectedVersion: sent.intent.version,
    submittedAt: fixture.now(),
    evidence: {
      evidenceId: 'evidence-contradictory',
      paymentIntentId: sent.intent.id,
      sourceSurface: 'web',
      sourceEventId: 'event-contradictory',
      evidenceType: 'payment-provider-event',
      amount: { minorUnits: 4_000, currency: 'USD' },
      paymentRail: 'bank-transfer',
      payerReferenceHash: 'payer-hash',
      receiverReferenceHash: 'receiver-hash',
      paymentReferenceHash: 'payment-hash',
      observedAt: fixture.now(),
    },
  };
  assertKernelError(
    () => fixture.kernel.submitEvidence(contradictoryEvidence),
    'INVALID_COMMAND',
  );
});

test('rejects expired requests and allows only the system to expire them', () => {
  const fixture = createFixture();
  const created = fixture.create();
  fixture.advanceTo('2026-07-16T00:00:00.000Z');

  assertKernelError(
    () => fixture.send(created.intent.id, created.intent.version),
    'INTENT_EXPIRED',
  );
  assertKernelError(
    () => fixture.execute({
      commandId: 'cmd-expire-wrong-actor',
      intentId: created.intent.id,
      actor: MINA,
      sourceSurface: 'web',
      expectedVersion: created.intent.version,
      submittedAt: fixture.now(),
      command: { type: 'expire' },
    }),
    'UNAUTHORIZED',
  );

  const expired = fixture.execute({
    commandId: 'cmd-expire',
    intentId: created.intent.id,
    actor: { id: 'payment-intent-expirer', role: 'system' },
    sourceSurface: 'other',
    expectedVersion: created.intent.version,
    submittedAt: fixture.now(),
    command: { type: 'expire' },
  });
  assert.equal(expired.intent.status, 'expired');
});

test('records mismatched evidence without changing payment state', () => {
  const fixture = createFixture({
    canSubmitHostEvidence: () => true,
    matchEvidenceReferences: () => false,
  });
  const created = fixture.create();
  const sent = fixture.send(created.intent.id, created.intent.version);
  const result = fixture.submitEvidence(sent.intent.id, sent.intent.version);

  assert.equal(result.evidence.status, 'mismatched');
  assert.equal(result.intent.status, 'request_sent');
  assert.equal(fixture.kernel.getSplit('split-leo')?.status, 'request_sent');
});

test('matched host evidence can mark paid by policy but can never confirm', () => {
  const fixture = createFixture({
    canSubmitHostEvidence: () => true,
    matchEvidenceReferences: () => true,
    autoMarkPaidOnMatchedEvidence: true,
  });
  const created = fixture.create();
  const sent = fixture.send(created.intent.id, created.intent.version);
  const result = fixture.submitEvidence(sent.intent.id, sent.intent.version);

  assert.equal(result.evidence.status, 'matched');
  assert.equal(result.intent.status, 'marked_paid');
  assert.notEqual(result.intent.status, 'confirmed');
  assert.equal(fixture.kernel.getSplit('split-leo')?.status, 'marked_paid');
});

test('future-dated evidence outside the live request window cannot mark paid', () => {
  const fixture = createFixture({
    canSubmitHostEvidence: () => true,
    matchEvidenceReferences: () => true,
    autoMarkPaidOnMatchedEvidence: true,
  });
  const created = fixture.create();
  const sent = fixture.send(created.intent.id, created.intent.version);
  const result = fixture.submitEvidence(
    sent.intent.id,
    sent.intent.version,
    '2026-07-16T12:00:00.000Z',
  );

  assert.equal(result.evidence.status, 'mismatched');
  assert.equal(result.intent.status, 'request_sent');
  assert.equal(fixture.kernel.getSplit('split-leo')?.status, 'request_sent');
});

test('rejects host evidence without a live scoped intent', () => {
  const fixture = createFixture({ canSubmitHostEvidence: () => true });
  assertKernelError(
    () => fixture.submitEvidence('missing-intent', 1),
    'NOT_FOUND',
  );
  assert.equal(fixture.kernel.listEvidence().length, 0);
});

function createFixture(overrides: PaymentIntentKernelDependencies = {}) {
  let currentTime = new Date('2026-07-14T12:00:00.000Z');
  let id = 0;
  const splits: CoveredSplitSnapshot[] = [
    {
      id: 'split-leo',
      groupId: 'weekend-trip',
      payerUserId: 'leo',
      receiverUserId: 'mina',
      amountMinor: 4_000,
      currency: 'USD',
      status: 'open',
      version: 7,
    },
    {
      id: 'split-nina',
      groupId: 'weekend-trip',
      payerUserId: 'nina',
      receiverUserId: 'mina',
      amountMinor: 4_000,
      currency: 'USD',
      status: 'open',
      version: 3,
    },
  ];
  const kernel = new InMemoryPaymentIntentKernel(splits, {
    now: () => new Date(currentTime),
    createId: (kind) => `${kind}-${++id}`,
    createSecret: () => 'server-only-secret',
    ...overrides,
  });

  const execute = (envelope: PaymentIntentCommandEnvelope) => kernel.execute(envelope);
  const now = () => currentTime.toISOString();
  const create = (amountMinor = 4_000, currency = 'USD') => execute({
    commandId: 'cmd-create',
    intentId: null,
    actor: MINA,
    sourceSurface: 'web',
    expectedVersion: 0,
    submittedAt: now(),
    command: {
      type: 'create_intent',
      input: {
        groupId: 'weekend-trip',
        payerUserId: 'leo',
        receiverUserId: 'mina',
        coveredSplitIds: ['split-leo'],
        expectedAmount: { minorUnits: amountMinor, currency },
        paymentRail: 'bank-transfer',
        recipientReferenceId: 'payment-method-mina-bank',
        expiresAt: '2026-07-15T12:00:00.000Z',
      },
    },
  });
  const sendEnvelope = (intentId: string, expectedVersion: number): PaymentIntentCommandEnvelope => ({
    commandId: 'cmd-send',
    intentId,
    actor: MINA,
    sourceSurface: 'web',
    expectedVersion,
    submittedAt: now(),
    command: { type: 'send_request' },
  });
  const send = (intentId: string, expectedVersion: number) =>
    execute(sendEnvelope(intentId, expectedVersion));
  const markPaid = (intentId: string, expectedVersion: number) => execute({
    commandId: 'cmd-mark-paid',
    intentId,
    actor: LEO,
    sourceSurface: 'web',
    expectedVersion,
    submittedAt: now(),
    command: { type: 'mark_paid' },
  });
  const confirm = (intentId: string, expectedVersion: number) => execute({
    commandId: 'cmd-confirm',
    intentId,
    actor: MINA,
    sourceSurface: 'web',
    expectedVersion,
    submittedAt: now(),
    command: { type: 'confirm_received' },
  });
  const submitEvidence = (
    intentId: string,
    expectedVersion: number,
    observedAt = now(),
  ) => {
    const envelope: PaymentEvidenceCommandEnvelope = {
      commandId: 'cmd-evidence',
      actor: HOST,
      sourceSurface: 'telegram',
      expectedVersion,
      submittedAt: now(),
      evidence: {
        evidenceId: 'evidence-1',
        paymentIntentId: intentId,
        sourceSurface: 'telegram',
        sourceEventId: 'telegram-payment-event-1',
        evidenceType: 'payment-provider-event',
        amount: { minorUnits: 4_000, currency: 'USD' },
        paymentRail: 'bank-transfer',
        payerReferenceHash: 'payer-hash',
        receiverReferenceHash: 'receiver-hash',
        paymentReferenceHash: 'payment-hash',
        observedAt,
      },
    };
    return kernel.submitEvidence(envelope);
  };

  return {
    kernel,
    now,
    create,
    execute,
    send,
    sendEnvelope,
    markPaid,
    confirm,
    submitEvidence,
    advanceTo: (iso: string) => {
      currentTime = new Date(iso);
    },
  };
}

function assertKernelError(
  operation: () => unknown,
  expectedCode: PaymentIntentKernelError['code'],
): void {
  assert.throws(operation, (error: unknown) => {
    return error instanceof PaymentIntentKernelError && error.code === expectedCode;
  });
}
