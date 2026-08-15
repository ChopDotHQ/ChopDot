import assert from 'node:assert/strict';
import test from 'node:test';
import {isLocalOnlyAppAction} from './localAppReducer.ts';

test('identity binding and unbinding are local-only', () => {
  assert.equal(isLocalOnlyAppAction({
    type: 'BIND_POLKADOT_HOST_IDENTITY',
    payload: {
      userId: 'dev',
      identity: {
        username: 'dev.dot',
        productId: 'chopdot-shell-proof.dot',
        publicKey: new Uint8Array(32),
        accountId: ['5Fake', 42],
      },
    },
  }), true);
  assert.equal(isLocalOnlyAppAction({type: 'UNBIND_POLKADOT_HOST_IDENTITY', payload: {userId: 'dev'}}), true);
});

test('verified chain evidence and manual retraction stay local-only', () => {
  assert.equal(isLocalOnlyAppAction({type: 'RETRACT_MARK_PAID', payload: {splitId: 's1', userId: 'dev'}}), true);
  assert.equal(isLocalOnlyAppAction({
    type: 'RECORD_VERIFIED_CHAIN_PAYMENT',
    payload: {
      splitId: 's1',
      userId: 'dev',
      receiverUserId: 'jean',
      receipt: {
        txHash: '0xabc',
        chainId: '0x190f1b46',
        from: '0x1111111111111111111111111111111111111111',
        to: '0x2222222222222222222222222222222222222222',
        amountBaseUnits: '1',
        blockNumber: '1',
        confirmedAt: '2026-08-15T20:00:00.000Z',
      },
    },
  }), true);
  assert.equal(isLocalOnlyAppAction({
    type: 'RECORD_VERIFIED_NATIVE_PAYMENT',
    payload: {
      splitId: 's1',
      userId: 'dev',
      receiverUserId: 'jean',
      receipt: {
        network: 'paseo',
        asset: 'PAS',
        txHash: `0x${'aa'.repeat(32)}`,
        senderAccountId: '1sender',
        recipientAccountId: '1receiver',
        amountBaseUnits: '1',
        blockHash: `0x${'bb'.repeat(32)}`,
        blockNumber: '1',
        finalizedAt: '2026-08-15T20:00:00.000Z',
      },
    },
  }), true);
});