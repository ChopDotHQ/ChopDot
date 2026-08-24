import {
  getChatManager,
  type ChatManager,
  type ChatMessageContent,
  type ChatReceivedAction,
  type HostSubscription,
} from '@parity/product-sdk-host';
import {
  assertEncryptedDeliveryAck,
  assertEncryptedDeliveryEnvelope,
  type EncryptedDeliveryAckV1,
  type EncryptedDeliveryEnvelopeV1,
} from './encryptedEventDelivery.ts';

export const CHOPDOT_CANONICAL_EVENT_MESSAGE_TYPE = 'chopdot.canonical-event.v1';
export const CHOPDOT_CANONICAL_EVENT_ACK_MESSAGE_TYPE = 'chopdot.canonical-event-ack.v1';
const MAX_CANONICAL_CHAT_PAYLOAD_BYTES = 64 * 1024;

export type CanonicalEventChatMessage =
  | {kind: 'envelope'; envelope: EncryptedDeliveryEnvelopeV1}
  | {kind: 'acknowledgement'; acknowledgement: EncryptedDeliveryAckV1};

export interface CanonicalEventChatTransport {
  sendEnvelope(roomId: string, envelope: EncryptedDeliveryEnvelopeV1): Promise<{messageId: string}>;
  sendAcknowledgement(roomId: string, acknowledgement: EncryptedDeliveryAckV1): Promise<{messageId: string}>;
  subscribe(onMessage: (input: {roomId: string; peer: string; message: CanonicalEventChatMessage}) => void): HostSubscription;
}

export async function createHostCanonicalEventChatTransport(): Promise<CanonicalEventChatTransport | null> {
  const manager = await getChatManager();
  return manager ? adaptCanonicalEventChatTransport(manager) : null;
}

export function adaptCanonicalEventChatTransport(manager: ChatManager): CanonicalEventChatTransport {
  return {
    sendEnvelope(roomId, envelope) {
      return manager.sendMessage(requiredRoom(roomId), encodeCanonicalEventEnvelopeChatMessage(envelope));
    },
    sendAcknowledgement(roomId, acknowledgement) {
      return manager.sendMessage(requiredRoom(roomId), encodeCanonicalEventAckChatMessage(acknowledgement));
    },
    subscribe(onMessage) {
      return manager.subscribeAction(action => {
        const message = decodeCanonicalEventChatAction(action);
        if (message) onMessage({roomId: action.roomId, peer: action.peer, message});
      });
    },
  };
}

export function encodeCanonicalEventEnvelopeChatMessage(envelope: EncryptedDeliveryEnvelopeV1): ChatMessageContent {
  assertEncryptedDeliveryEnvelope(envelope);
  return encode(CHOPDOT_CANONICAL_EVENT_MESSAGE_TYPE, envelope);
}

export function encodeCanonicalEventAckChatMessage(acknowledgement: EncryptedDeliveryAckV1): ChatMessageContent {
  assertEncryptedDeliveryAck(acknowledgement);
  return encode(CHOPDOT_CANONICAL_EVENT_ACK_MESSAGE_TYPE, acknowledgement);
}

export function decodeCanonicalEventChatAction(action: ChatReceivedAction): CanonicalEventChatMessage | null {
  try {
    if (action.payload.tag !== 'MessagePosted' || action.payload.value.tag !== 'Custom') return null;
    const custom = action.payload.value.value;
    if (![CHOPDOT_CANONICAL_EVENT_MESSAGE_TYPE, CHOPDOT_CANONICAL_EVENT_ACK_MESSAGE_TYPE].includes(custom.messageType)) return null;
    if (encodedByteLength(custom.payload) > MAX_CANONICAL_CHAT_PAYLOAD_BYTES) return null;
    const value = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(hexToBytes(custom.payload))) as unknown;
    if (custom.messageType === CHOPDOT_CANONICAL_EVENT_MESSAGE_TYPE) {
      assertEncryptedDeliveryEnvelope(value);
      return {kind: 'envelope', envelope: value};
    }
    assertEncryptedDeliveryAck(value);
    return {kind: 'acknowledgement', acknowledgement: value};
  } catch {
    return null;
  }
}

function encode(messageType: string, value: unknown): ChatMessageContent {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  if (bytes.byteLength > MAX_CANONICAL_CHAT_PAYLOAD_BYTES) throw new Error('Group update is too large to send safely.');
  return {tag: 'Custom', value: {messageType, payload: bytesToHex(bytes)}};
}

function requiredRoom(value: string): string {
  if (!value.trim()) throw new Error('Choose a conversation first.');
  return value.trim();
}

function bytesToHex(value: Uint8Array): `0x${string}` {
  return `0x${Array.from(value, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

function hexToBytes(value: string): Uint8Array {
  if (!/^0x[0-9a-f]*$/iu.test(value) || (value.length - 2) % 2 !== 0) throw new Error('Invalid payload.');
  return Uint8Array.from(value.slice(2).match(/.{2}/gu) ?? [], byte => Number.parseInt(byte, 16));
}

function encodedByteLength(value: string): number {
  if (!/^0x[0-9a-f]*$/iu.test(value) || (value.length - 2) % 2 !== 0) throw new Error('Invalid payload.');
  return (value.length - 2) / 2;
}
