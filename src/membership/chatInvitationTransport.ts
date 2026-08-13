import {
  getChatManager,
  type ChatManager,
  type ChatMessageContent,
  type ChatReceivedAction,
  type HostSubscription,
} from '@parity/product-sdk-host';
import {
  assertSignedMembershipEvent,
  type SignedMembershipEventV1,
} from './signedMembershipEvents.ts';

export const CHOPDOT_MEMBERSHIP_MESSAGE_TYPE = 'chopdot.membership.v1';
/** Defensive product limit; the installed Host API exposes MessageTooLarge but no numeric ceiling. */
export const MAX_MEMBERSHIP_CHAT_PAYLOAD_BYTES = 16 * 1024;

export interface ChatInvitationTransport {
  send(roomId: string, event: SignedMembershipEventV1): Promise<{messageId: string}>;
  subscribe(onEvent: (input: {
    roomId: string;
    peer: string;
    event: SignedMembershipEventV1;
  }) => void): HostSubscription;
}

export async function createHostChatInvitationTransport(): Promise<ChatInvitationTransport | null> {
  const manager = await getChatManager();
  return manager ? adaptChatInvitationTransport(manager) : null;
}

export function adaptChatInvitationTransport(manager: ChatManager): ChatInvitationTransport {
  return {
    send(roomId, event) {
      if (!roomId.trim()) throw new Error('Choose a conversation first.');
      return manager.sendMessage(roomId.trim(), encodeMembershipChatMessage(event));
    },
    subscribe(onEvent) {
      return manager.subscribeAction(action => {
        const event = decodeMembershipChatAction(action);
        if (!event) return;
        onEvent({roomId: action.roomId, peer: action.peer, event});
      });
    },
  };
}

export function encodeMembershipChatMessage(event: SignedMembershipEventV1): ChatMessageContent {
  assertSignedMembershipEvent(event);
  const bytes = new TextEncoder().encode(JSON.stringify(event));
  if (bytes.byteLength > MAX_MEMBERSHIP_CHAT_PAYLOAD_BYTES) {
    throw new Error('Invitation message is too large to send safely.');
  }
  return {
    tag: 'Custom',
    value: {
      messageType: CHOPDOT_MEMBERSHIP_MESSAGE_TYPE,
      payload: bytesToHex(bytes),
    },
  };
}

export function decodeMembershipChatAction(action: ChatReceivedAction): SignedMembershipEventV1 | null {
  try {
    if (action.payload.tag !== 'MessagePosted') return null;
    const content = action.payload.value;
    if (content.tag !== 'Custom' || content.value.messageType !== CHOPDOT_MEMBERSHIP_MESSAGE_TYPE) return null;
    if (encodedByteLength(content.value.payload) > MAX_MEMBERSHIP_CHAT_PAYLOAD_BYTES) return null;
    const event = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(hexToBytes(content.value.payload))) as unknown;
    assertSignedMembershipEvent(event);
    return event;
  } catch {
    return null;
  }
}

function bytesToHex(value: Uint8Array): `0x${string}` {
  return `0x${Array.from(value, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

function hexToBytes(value: string): Uint8Array {
  if (!value.startsWith('0x')) throw new Error('Invalid payload.');
  const normalized = value.slice(2).toLowerCase();
  if (!/^[0-9a-f]*$/u.test(normalized) || normalized.length % 2 !== 0) throw new Error('Invalid payload.');
  return Uint8Array.from(normalized.match(/.{2}/gu) ?? [], byte => Number.parseInt(byte, 16));
}

function encodedByteLength(value: string): number {
  if (!/^0x[0-9a-f]*$/iu.test(value) || (value.length - 2) % 2 !== 0) throw new Error('Invalid payload.');
  return (value.length - 2) / 2;
}
