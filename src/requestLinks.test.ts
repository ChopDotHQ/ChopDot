import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPayerRequestUrl,
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
  live: {
    roomId: 'group-friday-crew',
    secret: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    memberCapability: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    authority: 'native',
    requesterPublicKeyHex: `0x${'11'.repeat(32)}`,
  },
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
  assert.deepEqual(parseStandalonePayerRequest(url.search)?.live, request.live);
  assert.equal(url.searchParams.has('payUpdate'), false);
});

test('payer packets reject a missing or malformed requester product account', () => {
  const missing = {
    ...request,
    live: {
      roomId: request.live.roomId,
      secret: request.live.secret,
      memberCapability: request.live.memberCapability,
      authority: 'native',
    },
  } as StandalonePayerRequest;
  const missingUrl = new URL(buildPayerRequestUrl('group-123', 'leo-123', missing, 'https://example.com/'));
  assert.equal(parseStandalonePayerRequest(missingUrl.search), null);

  const offline = {
    ...missing,
    live: {...missing.live, authority: 'offline' as const},
  };
  const offlineUrl = new URL(buildPayerRequestUrl('group-123', 'leo-123', offline, 'https://example.com/'));
  assert.equal(parseStandalonePayerRequest(offlineUrl.search)?.live.authority, 'offline');

  const malformed = {
    ...request,
    live: {...request.live, requesterPublicKeyHex: '0x1234'},
  };
  const malformedUrl = new URL(buildPayerRequestUrl('group-123', 'leo-123', malformed, 'https://example.com/'));
  assert.equal(parseStandalonePayerRequest(malformedUrl.search), null);
});

test('products devnet request links use the supported wrapper instead of the app sandbox', () => {
  const url = new URL(buildPayerRequestUrl(
    'group-123',
    'leo-123',
    request,
    'https://chopdotproof02.app.dev-dot.li/?chainBackend=rpc-gateway&cid=old&v=4',
  ));

  assert.equal(url.hostname, 'chopdotproof02.dev-dot.li');
  assert.equal(url.searchParams.get('chainBackend'), 'rpc-gateway');
  assert.equal(url.searchParams.has('cid'), false);
  assert.equal(url.searchParams.has('v'), false);
  assert.equal(parseStandalonePayerRequest(url.search)?.requestId, request.requestId);
});

test('expired payer packets are rejected', () => {
  const expired = {...request, createdAt: '2020-01-01T00:00:00.000Z', expiresAt: '2020-01-02T00:00:00.000Z'};
  const url = new URL(buildPayerRequestUrl('group-123', 'leo-123', expired, 'https://example.com/'));
  assert.equal(parseStandalonePayerRequest(url.search), null);
});
