import assert from 'node:assert/strict';
import test from 'node:test';
import type {ChatReceivedAction} from '@parity/product-sdk-host';
import {decodeMembershipRemovalAction, encodeMembershipRemovalMessage} from './membershipRemovalChatTransport.ts';
import type {MembershipRemovalMessageV1} from './membershipRemovalCoordinator.ts';

const message: MembershipRemovalMessageV1 = {
  v: 1, kind: 'chopdot.membership-removal-acceptance.v1', proposalId: 'remove-nina',
  acceptance: {
    v: 1, invitationId: 'rotation:remove-nina:leo', groupId: 'g-circle', recipientId: 'leo',
    recipientAccountPublicKeyHex: `0x${'22'.repeat(32)}`, recipientEcdhPublicKey: 'ecdh', nonce: 'nonce',
    expiresAt: '2026-08-24T12:00:00.000Z', signature: `0x${'aa'.repeat(64)}`,
  },
};

test('removal chat codec round-trips only its bounded custom message', () => {
  const encoded = encodeMembershipRemovalMessage(message);
  const action: ChatReceivedAction = {roomId: 'room-circle', peer: 'leo-peer', payload: {tag: 'MessagePosted', value: encoded}};
  assert.deepEqual(decodeMembershipRemovalAction(action), message);
  assert.equal(decodeMembershipRemovalAction({...action, payload: {tag: 'MessagePosted', value: {tag: 'Text', value: {text: 'remove nina'}}}}), null);
  assert.equal(decodeMembershipRemovalAction({...action, payload: {tag: 'MessagePosted', value: {tag: 'Custom', value: {messageType: 'another.product', payload: '0x00'}}}}), null);
  assert.equal(decodeMembershipRemovalAction({...action, payload: {tag: 'MessagePosted', value: {tag: 'Custom', value: {messageType: 'chopdot.membership-removal.v1', payload: '0xnothex'}}}}), null);
});
