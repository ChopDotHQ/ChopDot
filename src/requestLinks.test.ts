import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPayerMarkedPaidReturnUrl,
  buildPayerRequestUrl,
  parsePayerMarkedPaidUpdate,
  parseStandalonePayerRequest,
  type StandalonePayerRequest,
} from './requestLinks';

const request: StandalonePayerRequest = {
  requestId: 'request-123',
  groupName: 'Friday Crew',
  requesterName: 'Mina',
  payerName: 'Leo',
  amount: 15,
  currency: 'USD',
  paymentMethodLabel: 'Payment Link',
  createdAt: '2099-07-15T10:00:00.000Z',
  expiresAt: '2099-07-16T10:00:00.000Z',
};

test('dot-host request links use the public host instead of the sandbox origin', () => {
  const url = new URL(buildPayerRequestUrl(
    'group-123',
    'leo-123',
    request,
    'https://chopdot-shell-proof.app.paseo.li/?chainBackend=rpc-gateway&cid=old&v=3&network=paseo-next-v2',
  ));

  assert.equal(url.hostname, 'chopdot-shell-proof.paseo.li');
  assert.equal(url.searchParams.get('chainBackend'), 'rpc-gateway');
  assert.equal(url.searchParams.has('cid'), false);
  assert.equal(url.searchParams.has('v'), false);
  assert.equal(parseStandalonePayerRequest(url.search)?.requestId, request.requestId);
});

test('a marked-paid return packet remains scoped to the original request', () => {
  const url = new URL(buildPayerMarkedPaidReturnUrl(
    'group-123',
    'leo-123',
    request,
    'https://chopdot-shell-proof.app.paseo.li/?chainBackend=rpc-gateway',
  ));
  const update = parsePayerMarkedPaidUpdate(url.search);

  assert.equal(url.hostname, 'chopdot-shell-proof.paseo.li');
  assert.deepEqual(update && {
    action: update.action,
    requestId: update.requestId,
    groupId: update.groupId,
    memberId: update.memberId,
    amount: update.amount,
    currency: update.currency,
    expiresAt: update.expiresAt,
  }, {
    action: 'marked_paid',
    requestId: 'request-123',
    groupId: 'group-123',
    memberId: 'leo-123',
    amount: 15,
    currency: 'USD',
    expiresAt: '2099-07-16T10:00:00.000Z',
  });
});

test('expired payer packets are rejected', () => {
  const expired = {...request, createdAt: '2020-01-01T00:00:00.000Z', expiresAt: '2020-01-02T00:00:00.000Z'};
  const url = new URL(buildPayerRequestUrl('group-123', 'leo-123', expired, 'https://example.com/'));
  assert.equal(parseStandalonePayerRequest(url.search), null);
});
