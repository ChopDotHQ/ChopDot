import {
  getChatManager,
  type ChatManager,
  type ChatMessageContent,
  type ChatReceivedAction,
  type ChatRoom,
  type HostSubscription,
} from '@parity/product-sdk-host';
import {
  assertSignedMembershipEvent,
  type SignedMembershipEventV1,
} from './signedMembershipEvents.ts';
import {
  assertMembershipDeliveryAcknowledgementShape,
  type MembershipDeliveryAcknowledgement,
} from './membershipDeliveryOutbox.ts';

export const CHOPDOT_MEMBERSHIP_MESSAGE_TYPE = 'chopdot.membership.v1';
export const CHOPDOT_MEMBERSHIP_ACK_MESSAGE_TYPE = 'chopdot.membership-ack.v1';
/** Defensive product limit; the installed Host API exposes MessageTooLarge but no numeric ceiling. */
export const MAX_MEMBERSHIP_CHAT_PAYLOAD_BYTES = 16 * 1024;

export interface ChatInvitationTransport {
  send(roomId: string, event: SignedMembershipEventV1): Promise<{messageId: string}>;
  sendAcknowledgement(roomId: string, acknowledgement: MembershipDeliveryAcknowledgement): Promise<{messageId: string}>;
  subscribe(onMessage: (input: {
    roomId: string;
    peer: string;
    message:
      | {kind: 'event'; event: SignedMembershipEventV1}
      | {kind: 'acknowledgement'; acknowledgement: MembershipDeliveryAcknowledgement};
  }) => void): HostSubscription;
  /** Host-owned room list. A room identifier is delivery metadata only. */
  subscribeRooms?(onRooms: (rooms: ChatRoom[]) => void): HostSubscription;
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
    sendAcknowledgement(roomId, acknowledgement) {
      if (!roomId.trim()) throw new Error('Choose a conversation first.');
      return manager.sendMessage(roomId.trim(), encodeMembershipAcknowledgementChatMessage(acknowledgement));
    },
    subscribe(onMessage) {
      return manager.subscribeAction(action => {
        const message = decodeMembershipChatAction(action);
        if (!message) return;
        onMessage({roomId: action.roomId, peer: action.peer, message});
      });
    },
    subscribeRooms(onRooms) {
      return manager.subscribeChatList(rooms => onRooms(structuredClone(rooms)));
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

export function encodeMembershipAcknowledgementChatMessage(acknowledgement: MembershipDeliveryAcknowledgement): ChatMessageContent {
  assertMembershipDeliveryAcknowledgementShape(acknowledgement);
  const bytes = new TextEncoder().encode(JSON.stringify(acknowledgement));
  if (bytes.byteLength > MAX_MEMBERSHIP_CHAT_PAYLOAD_BYTES) throw new Error('Invitation acknowledgement is too large to send safely.');
  return {tag: 'Custom', value: {messageType: CHOPDOT_MEMBERSHIP_ACK_MESSAGE_TYPE, payload: bytesToHex(bytes)}};
}

export function decodeMembershipChatAction(action: ChatReceivedAction):
  | {kind: 'event'; event: SignedMembershipEventV1}
  | {kind: 'acknowledgement'; acknowledgement: MembershipDeliveryAcknowledgement}
  | null {
  try {
    if (action.payload.tag !== 'MessagePosted') return null;
    const content = action.payload.value;
    if (content.tag !== 'Custom' || ![CHOPDOT_MEMBERSHIP_MESSAGE_TYPE, CHOPDOT_MEMBERSHIP_ACK_MESSAGE_TYPE].includes(content.value.messageType)) return null;
    if (encodedByteLength(content.value.payload) > MAX_MEMBERSHIP_CHAT_PAYLOAD_BYTES) return null;
    const value = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(hexToBytes(content.value.payload))) as unknown;
    if (content.value.messageType === CHOPDOT_MEMBERSHIP_MESSAGE_TYPE) {
      assertSignedMembershipEvent(value);
      return {kind: 'event', event: value};
    }
    if (!isMembershipAcknowledgement(value)) return null;
    return {kind: 'acknowledgement', acknowledgement: value};
  } catch {
    return null;
  }
}

function isMembershipAcknowledgement(value: unknown): value is MembershipDeliveryAcknowledgement {
  try {
    assertMembershipDeliveryAcknowledgementShape(value);
    return true;
  } catch {
    return false;
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
