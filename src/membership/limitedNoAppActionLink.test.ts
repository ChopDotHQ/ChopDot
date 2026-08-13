import assert from 'node:assert/strict';
import test from 'node:test';
import {cryptoWaitReady, sr25519PairFromSeed, sr25519Sign} from '@polkadot/util-crypto';
import {createSignedLimitedNoAppAction} from './limitedNoAppAction.ts';
import {limitedNoAppActionFromUrl, limitedNoAppActionUrl} from './limitedNoAppActionLink.ts';

test('limited action URL carries one exact signed action and no membership or secret fields', async () => {
  await cryptoWaitReady();
  const pair = sr25519PairFromSeed(new Uint8Array(32).fill(11));
  const request = await createSignedLimitedNoAppAction({
    requestId: 'request-1', organizerId: 'mina', organizerAccountPublicKeyHex: `0x${Buffer.from(pair.publicKey).toString('hex')}`,
    recipientId: 'omar', recipientAccountPublicKeyHex: `0x${'44'.repeat(32)}`, groupId: 'group-1', expenseId: 'expense-1',
    action: 'MARK_PAID', amountMinor: 2500, currency: 'CHF', createdAt: '2026-08-13T10:00:00.000Z',
    expiresAt: '2026-08-14T10:00:00.000Z', signer: {signBytes: async data => sr25519Sign(data, pair)},
  });
  const url = limitedNoAppActionUrl('https://chopdotproof02.dot/pay?legacy=ignored', request);
  assert.deepEqual(limitedNoAppActionFromUrl(url), request);
  assert.equal(url.includes('groupKey'), false);
  assert.equal(url.includes('membership'), false);
  assert.throws(() => limitedNoAppActionFromUrl(`${url}&extra=authority`), /invalid/u);
});
