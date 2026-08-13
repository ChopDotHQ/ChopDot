import assert from 'node:assert/strict';
import test from 'node:test';
import {cryptoWaitReady, sr25519PairFromSeed, sr25519Sign} from '@polkadot/util-crypto';
import type {
  ChatManager,
  ChatMessageContent,
  ChatReceivedAction,
  HostSubscription,
} from '@parity/product-sdk-host';
import {
  adaptChatInvitationTransport,
  decodeMembershipChatAction,
  encodeMembershipChatMessage,
  MAX_MEMBERSHIP_CHAT_PAYLOAD_BYTES,
} from './chatInvitationTransport.ts';
import {createSignedMembershipEvent} from './signedMembershipEvents.ts';

async function event() {
  await cryptoWaitReady();
  const mina = sr25519PairFromSeed(new Uint8Array(32).fill(11));
  return createSignedMembershipEvent({
    eventId: 'event-chat-invite',
    actorId: 'mina',
    actorAccountPublicKeyHex: `0x${Buffer.from(mina.publicKey).toString('hex')}`,
    occurredAt: '2026-08-12T12:01:00.000Z',
    event: {
      type: 'INVITATION_CREATED',
      invitation: {
        invitationId: 'invite-leo', groupId: 'zurich-dinner', inviterId: 'mina', inviteeId: 'leo',
        inviteeAccountPublicKeyHex: `0x${'22'.repeat(32)}`,
        role: 'member', route: 'existing_friend', status: 'invited',
        createdAt: '2026-08-12T12:01:00.000Z', expiresAt: '2099-08-13T12:00:00.000Z',
      },
    },
    signer: {signBytes: async data => sr25519Sign(data, mina)},
  });
}

test('custom chat message round-trips one signed membership event', async () => {
  const signed = await event();
  const action: ChatReceivedAction = {
    roomId: 'friends-room',
    peer: 'leo-peer',
    payload: {tag: 'MessagePosted', value: encodeMembershipChatMessage(signed)},
  };
  assert.deepEqual(decodeMembershipChatAction(action), signed);
});

test('unrelated, malformed, and structurally tampered chat payloads are ignored', async () => {
  const signed = await event();
  const text: ChatReceivedAction = {
    roomId: 'friends-room', peer: 'leo-peer',
    payload: {tag: 'MessagePosted', value: {tag: 'Text', value: {text: 'hello'}}},
  };
  assert.equal(decodeMembershipChatAction(text), null);

  const custom = encodeMembershipChatMessage(signed);
  assert.equal(custom.tag, 'Custom');
  if (custom.tag !== 'Custom') throw new Error('Expected custom message.');
  const malformed: ChatReceivedAction = {
    roomId: 'friends-room', peer: 'leo-peer',
    payload: {tag: 'MessagePosted', value: {...custom, value: {...custom.value, payload: '0xnothex'}}},
  };
  assert.equal(decodeMembershipChatAction(malformed), null);

  const wrongType: ChatReceivedAction = {
    roomId: 'friends-room', peer: 'leo-peer',
    payload: {tag: 'MessagePosted', value: {
      ...custom,
      value: {...custom.value, messageType: 'another.product'},
    }},
  };
  assert.equal(decodeMembershipChatAction(wrongType), null);

  const oversized: ChatReceivedAction = {
    roomId: 'friends-room', peer: 'leo-peer',
    payload: {tag: 'MessagePosted', value: {tag: 'Custom', value: {
      messageType: 'chopdot.membership.v1',
      payload: `0x${'00'.repeat(MAX_MEMBERSHIP_CHAT_PAYLOAD_BYTES + 1)}`,
    }}},
  };
  assert.equal(decodeMembershipChatAction(oversized), null);
});

test('codec rejects an outbound event beyond the local defensive byte budget', async () => {
  const signed = await event();
  const oversized = {...signed, eventId: 'x'.repeat(MAX_MEMBERSHIP_CHAT_PAYLOAD_BYTES)};
  assert.throws(() => encodeMembershipChatMessage(oversized), /too large/u);
});

test('adapter sends only to the selected room and forwards decoded events', async () => {
  const sent: Array<{roomId: string; payload: ChatMessageContent}> = [];
  let listener: ((action: ChatReceivedAction) => void) | undefined;
  const subscription: HostSubscription = {unsubscribe() {}, onInterrupt() { return () => {}; }};
  const manager: ChatManager = {
    async registerRoom() { return 'Exists'; },
    async registerBot() { return 'Exists'; },
    async sendMessage(roomId, payload) { sent.push({roomId, payload}); return {messageId: 'message-1'}; },
    subscribeChatList() { return subscription; },
    subscribeAction(callback) { listener = callback; return subscription; },
  };
  const transport = adaptChatInvitationTransport(manager);
  const signed = await event();
  assert.deepEqual(await transport.send(' friends-room ', signed), {messageId: 'message-1'});
  assert.equal(sent[0].roomId, 'friends-room');
  const received: unknown[] = [];
  transport.subscribe(input => received.push(input));
  listener?.({
    roomId: 'friends-room', peer: 'mina-peer',
    payload: {tag: 'MessagePosted', value: sent[0].payload},
  });
  assert.deepEqual(received, [{roomId: 'friends-room', peer: 'mina-peer', event: signed}]);
  assert.throws(() => transport.send('   ', signed), /Choose a conversation/u);
});
