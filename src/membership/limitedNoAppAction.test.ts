import assert from 'node:assert/strict';
import test from 'node:test';
import {cryptoWaitReady, sr25519PairFromSeed, sr25519Sign} from '@polkadot/util-crypto';
import type {AccountMessageSigner} from './groupKeyHandoff.ts';
import {
  applyLimitedNoAppRequest,
  applyLimitedNoAppResponse,
  createLimitedNoAppActionState,
  createSignedLimitedNoAppAction,
  createSignedLimitedNoAppResponse,
} from './limitedNoAppAction.ts';

test('one signed limited action yields one explicit scoped response and no membership authority', async () => {
  const h = await harness();
  let state = createLimitedNoAppActionState();
  const request = await h.request();
  const received = await applyLimitedNoAppRequest(state, request);
  assert.equal(received.outcome, 'applied');
  state = received.state;
  const response = await createSignedLimitedNoAppResponse({
    request, responseId: 'response-omar-paid', recipientId: 'omar',
    recipientAccountPublicKeyHex: h.omarAccount, decision: 'MARKED_PAID',
    respondedAt: '2026-08-12T12:05:00.000Z', signer: h.omarSigner,
  });
  const applied = await applyLimitedNoAppResponse(state, response);
  assert.equal(applied.outcome, 'applied');
  assert.equal(applied.state.responses[request.requestId].expenseId, 'expense-dinner-omar');
  assert.deepEqual(Object.keys(applied.state).sort(), ['requests', 'responses']);
  assert.equal('memberships' in applied.state, false);
  assert.equal('organizers' in applied.state, false);
  assert.equal('receivers' in applied.state, false);
  assert.equal((await applyLimitedNoAppResponse(applied.state, response)).outcome, 'idempotent');
});

test('recipient, account, action, expense, amount, currency, expiry, and signature are bound', async () => {
  const h = await harness();
  const request = await h.request();
  const state = (await applyLimitedNoAppRequest(createLimitedNoAppActionState(), request)).state;
  await assert.rejects(() => createSignedLimitedNoAppResponse({
    request, responseId: 'wrong-recipient', recipientId: 'nina',
    recipientAccountPublicKeyHex: h.omarAccount, decision: 'MARKED_PAID',
    respondedAt: '2026-08-12T12:05:00.000Z', signer: h.omarSigner,
  }), /does not match/u);
  await assert.rejects(() => createSignedLimitedNoAppResponse({
    request, responseId: 'expired', recipientId: 'omar', recipientAccountPublicKeyHex: h.omarAccount,
    decision: 'MARKED_PAID', respondedAt: request.expiresAt, signer: h.omarSigner,
  }), /does not match/u);
  await assert.rejects(() => createSignedLimitedNoAppResponse({
    request, responseId: 'wrong-action', recipientId: 'omar', recipientAccountPublicKeyHex: h.omarAccount,
    decision: 'DECLINED', respondedAt: '2026-08-12T12:05:00.000Z', signer: h.omarSigner,
  }), /does not match/u);

  const valid = await createSignedLimitedNoAppResponse({
    request, responseId: 'valid', recipientId: 'omar', recipientAccountPublicKeyHex: h.omarAccount,
    decision: 'MARKED_PAID', respondedAt: '2026-08-12T12:05:00.000Z', signer: h.omarSigner,
  });
  const tampered = [
    {...valid, recipientAccountPublicKeyHex: `0x${'44'.repeat(32)}`},
    {...valid, expenseId: 'another-expense'},
    {...valid, amountMinor: valid.amountMinor + 1},
    {...valid, currency: 'EUR'},
    {...valid, action: 'DECLINE_PAYMENT' as const},
    {...valid, signature: `0x${'00'.repeat(64)}`},
  ];
  for (const response of tampered) {
    assert.equal((await applyLimitedNoAppResponse(state, response)).outcome, 'rejected');
    assert.deepEqual(state.responses, {});
  }
});

test('group history, secret, membership role, organizer and receiver grants are forbidden fields', async () => {
  const h = await harness();
  const request = await h.request();
  for (const field of ['groupHistory', 'groupKey', 'membershipRole', 'grantOrganizer', 'grantReceiver']) {
    const result = await applyLimitedNoAppRequest(createLimitedNoAppActionState(), {
      ...request, [field]: field,
    } as never);
    assert.equal(result.outcome, 'rejected');
  }
});

test('conflicting request or response replay preserves first content', async () => {
  const h = await harness();
  const request = await h.request();
  const accepted = await applyLimitedNoAppRequest(createLimitedNoAppActionState(), request);
  assert.equal((await applyLimitedNoAppRequest(accepted.state, request)).outcome, 'idempotent');
  assert.equal((await applyLimitedNoAppRequest(accepted.state, {...request, expenseId: 'other'})).outcome, 'rejected');
  const response = await createSignedLimitedNoAppResponse({
    request, responseId: 'response-one', recipientId: 'omar', recipientAccountPublicKeyHex: h.omarAccount,
    decision: 'MARKED_PAID', respondedAt: '2026-08-12T12:05:00.000Z', signer: h.omarSigner,
  });
  const responded = await applyLimitedNoAppResponse(accepted.state, response);
  const conflict = {...response, responseId: 'response-two', signature: `0x${'00'.repeat(64)}`};
  const rejected = await applyLimitedNoAppResponse(responded.state, conflict);
  assert.equal(rejected.outcome, 'rejected');
  assert.equal(rejected.state.responses[request.requestId].responseId, 'response-one');
});

async function harness() {
  await cryptoWaitReady();
  const mina = sr25519PairFromSeed(new Uint8Array(32).fill(11));
  const omar = sr25519PairFromSeed(new Uint8Array(32).fill(44));
  const account = (pair: typeof mina) => `0x${Buffer.from(pair.publicKey).toString('hex')}`;
  const signer = (pair: typeof mina): AccountMessageSigner => ({signBytes: async data => sr25519Sign(data, pair)});
  const minaAccount = account(mina);
  const omarAccount = account(omar);
  return {
    omarAccount,
    omarSigner: signer(omar),
    request: () => createSignedLimitedNoAppAction({
      requestId: 'limited-omar-dinner', organizerId: 'mina', organizerAccountPublicKeyHex: minaAccount,
      recipientId: 'omar', recipientAccountPublicKeyHex: omarAccount,
      groupId: 'zurich-dinner', expenseId: 'expense-dinner-omar', action: 'MARK_PAID',
      amountMinor: 3000, currency: 'CHF', createdAt: '2026-08-12T12:00:00.000Z',
      expiresAt: '2099-08-13T12:00:00.000Z', signer: signer(mina),
    }),
  };
}
