import {getChatManager, type ChatManager, type ChatMessageContent, type ChatReceivedAction, type HostSubscription} from '@parity/product-sdk-host';
import {assertMembershipRemovalMessage, type MembershipRemovalMessageV1} from './membershipRemovalCoordinator.ts';

export const CHOPDOT_MEMBERSHIP_REMOVAL_MESSAGE_TYPE = 'chopdot.membership-removal.v1';
const MAX_REMOVAL_MESSAGE_BYTES = 64 * 1024;

export interface MembershipRemovalChatTransport {
  send(roomId: string, message: MembershipRemovalMessageV1): Promise<{messageId: string}>;
  subscribe(listener: (input: {roomId: string; peer: string; message: MembershipRemovalMessageV1}) => void): HostSubscription;
}

export async function createHostMembershipRemovalChatTransport(): Promise<MembershipRemovalChatTransport | null> {
  const manager = await getChatManager();
  return manager ? adaptMembershipRemovalChatTransport(manager) : null;
}

export function adaptMembershipRemovalChatTransport(manager: ChatManager): MembershipRemovalChatTransport {
  return {
    send(roomId, message) { return manager.sendMessage(required(roomId), encodeMembershipRemovalMessage(message)); },
    subscribe(listener) {
      return manager.subscribeAction(action => {
        const message = decodeMembershipRemovalAction(action);
        if (message) listener({roomId: action.roomId, peer: action.peer, message});
      });
    },
  };
}

export function encodeMembershipRemovalMessage(message: MembershipRemovalMessageV1): ChatMessageContent {
  assertMembershipRemovalMessage(message);
  const bytes = new TextEncoder().encode(JSON.stringify(message));
  if (bytes.byteLength > MAX_REMOVAL_MESSAGE_BYTES) throw new Error('Membership update is too large to send safely.');
  return {tag: 'Custom', value: {messageType: CHOPDOT_MEMBERSHIP_REMOVAL_MESSAGE_TYPE, payload: bytesToHex(bytes)}};
}

export function decodeMembershipRemovalAction(action: ChatReceivedAction): MembershipRemovalMessageV1 | null {
  try {
    if (action.payload.tag !== 'MessagePosted' || action.payload.value.tag !== 'Custom'
      || action.payload.value.value.messageType !== CHOPDOT_MEMBERSHIP_REMOVAL_MESSAGE_TYPE) return null;
    const payload = action.payload.value.value.payload;
    if (!/^0x[0-9a-f]*$/iu.test(payload) || (payload.length - 2) / 2 > MAX_REMOVAL_MESSAGE_BYTES) return null;
    const value = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(hexToBytes(payload))) as unknown;
    assertMembershipRemovalMessage(value);
    return value;
  } catch {
    return null;
  }
}

function required(value: string): string { if (!value.trim()) throw new Error('Choose a conversation first.'); return value.trim(); }
function bytesToHex(value: Uint8Array): `0x${string}` { return `0x${Array.from(value, byte => byte.toString(16).padStart(2, '0')).join('')}`; }
function hexToBytes(value: string): Uint8Array { return Uint8Array.from(value.slice(2).match(/.{2}/gu) ?? [], byte => Number.parseInt(byte, 16)); }
