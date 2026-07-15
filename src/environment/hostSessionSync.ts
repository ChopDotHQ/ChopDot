import type {AppState} from '../types.ts';
import type {Action} from '../state/store.ts';
import {decryptSessionValue, encryptSessionValue, type EncryptedSessionPacket} from './encryptedSession.ts';
import {PolkadotHostBridge, type PolkadotHostIdentity} from './polkadotHostBridge.ts';

const SESSION_PARAM = 'chopSession';
const SECRET_PARAM = 'chopKey';

export type SharedAction = Extract<Action, {
  type:
    | 'ADD_USER'
    | 'SET_WALLET_ADDRESS'
    | 'CREATE_GROUP'
    | 'ADD_EXPENSE'
    | 'SEND_REQUEST'
    | 'MARK_PAID'
    | 'CONFIRM_RECEIVED'
    | 'RECORD_MATCHED_PAYMENT'
    | 'SAVE_RECORD';
}>;

export interface SharedActionEnvelope {
  v: 1;
  eventId: string;
  actorUserId: string;
  actorPublicKeyHex: string;
  occurredAt: string;
  action: SharedAction;
}

export interface HostSessionConfig {
  roomId: string;
  secret: string;
}

export interface HostParticipant {
  userId: string;
  publicKeyHex: string;
  username: string;
}

export type AuthorityDecision = 'apply' | 'defer' | 'reject';

export interface HostSessionConnection {
  participant: HostParticipant;
  publish(envelope: SharedActionEnvelope): Promise<boolean>;
  close(): void;
}

interface EncryptedActionChunk {
  kind: 'chopdot-action-chunk';
  messageId: string;
  index: number;
  total: number;
  part: string;
}

const CHUNK_TEXT_LENGTH = 120;
const MAX_CHUNKS = 64;

export function parseHostSessionConfig(search = window.location.search): HostSessionConfig | null {
  const params = new URLSearchParams(search);
  const roomId = params.get(SESSION_PARAM)?.trim();
  const secret = params.get(SECRET_PARAM)?.trim();
  if (!roomId || !secret) return null;
  return {roomId, secret};
}

export function publicKeyHex(bytes: Uint8Array): string {
  return `0x${Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

export function participantIdFromPublicKey(value: string): string {
  return `u-host-${normalizePublicKey(value).slice(2)}`;
}

export function isSharedAction(action: Action): action is SharedAction {
  return [
    'ADD_USER',
    'SET_WALLET_ADDRESS',
    'CREATE_GROUP',
    'ADD_EXPENSE',
    'SEND_REQUEST',
    'MARK_PAID',
    'CONFIRM_RECEIVED',
    'RECORD_MATCHED_PAYMENT',
    'SAVE_RECORD',
  ].includes(action.type);
}

export function createSharedEnvelope(
  action: SharedAction,
  participant: HostParticipant,
): SharedActionEnvelope {
  return {
    v: 1,
    eventId: crypto.randomUUID(),
    actorUserId: participant.userId,
    actorPublicKeyHex: participant.publicKeyHex,
    occurredAt: new Date().toISOString(),
    action,
  };
}

export function assertSharedActionEnvelope(value: unknown): asserts value is SharedActionEnvelope {
  if (!isRecord(value) || value.v !== 1) throw new Error('Invalid shared action envelope.');
  if (
    typeof value.eventId !== 'string' || !value.eventId ||
    typeof value.actorUserId !== 'string' || !value.actorUserId ||
    typeof value.actorPublicKeyHex !== 'string' ||
    typeof value.occurredAt !== 'string' || Number.isNaN(Date.parse(value.occurredAt)) ||
    !isRecord(value.action) || typeof value.action.type !== 'string'
  ) {
    throw new Error('Invalid shared action envelope.');
  }
  if (!isRuntimeSharedAction(value.action)) throw new Error('Unsupported shared action.');
}

export function signerMatchesEnvelope(
  envelope: SharedActionEnvelope,
  signerHex: string | undefined,
  state?: AppState,
): boolean {
  const normalizedSigner = signerHex ? normalizePublicKey(signerHex) : '';
  if (!normalizedSigner) return false;

  if (envelope.action.type === 'ADD_USER') {
    const {user} = envelope.action.payload;
    const isSelfRegistration = user.id === envelope.actorUserId
      && participantIdFromPublicKey(envelope.actorPublicKeyHex) === envelope.actorUserId
      && Boolean(user.accountPublicKeyHex)
      && normalizePublicKey(user.accountPublicKeyHex!) === normalizePublicKey(envelope.actorPublicKeyHex);
    if (isSelfRegistration) {
      const existingSigner = state?.users[user.id]?.statementSignerHex;
      return !existingSigner || normalizePublicKey(existingSigner) === normalizedSigner;
    }
  }

  const actor = state?.users[envelope.actorUserId];
  return Boolean(
    actor?.statementSignerHex
    && normalizePublicKey(actor.statementSignerHex) === normalizedSigner
    && actor.accountPublicKeyHex
    && normalizePublicKey(actor.accountPublicKeyHex) === normalizePublicKey(envelope.actorPublicKeyHex),
  );
}

export function authorizeSharedAction(state: AppState, envelope: SharedActionEnvelope): AuthorityDecision {
  const {actorUserId, actorPublicKeyHex, action} = envelope;
  const actor = state.users[actorUserId];
  const actorIsBound = Boolean(
    actor?.accountPublicKeyHex &&
    normalizePublicKey(actor.accountPublicKeyHex) === normalizePublicKey(actorPublicKeyHex),
  );

  if (action.type === 'ADD_USER') {
    const {user} = action.payload;
    const isSelfRegistration = user.id === actorUserId
      && Boolean(user.accountPublicKeyHex)
      && normalizePublicKey(user.accountPublicKeyHex!) === normalizePublicKey(actorPublicKeyHex);
    if (isSelfRegistration) return 'apply';
    if (user.accountPublicKeyHex) return 'reject';
    return actorIsBound && !user.accountPublicKeyHex ? 'apply' : actor ? 'reject' : 'defer';
  }

  if (!actor) return 'defer';
  if (!actorIsBound) return 'reject';

  if (action.type === 'CREATE_GROUP') {
    return action.payload.group.memberIds.includes(actorUserId) ? 'apply' : 'reject';
  }

  if (action.type === 'SET_WALLET_ADDRESS') {
    return action.payload.userId === actorUserId ? 'apply' : 'reject';
  }

  if (action.type === 'ADD_EXPENSE') {
    const {expense} = action.payload;
    if (!state.groups[expense.groupId]) return 'defer';
    return expense.paidByUserId === actorUserId ? 'apply' : 'reject';
  }

  if (action.type === 'SEND_REQUEST') {
    const split = state.splits[action.payload.splitId];
    if (!split) return 'defer';
    const expense = state.expenses[split.expenseId];
    if (!expense) return 'defer';
    return expense.paidByUserId === actorUserId ? 'apply' : 'reject';
  }

  if (action.type === 'MARK_PAID') {
    const split = state.splits[action.payload.splitId];
    if (!split) return 'defer';
    return action.payload.userId === actorUserId && split.userId === actorUserId ? 'apply' : 'reject';
  }

  if (action.type === 'CONFIRM_RECEIVED') {
    const split = state.splits[action.payload.splitId];
    if (!split) return 'defer';
    const expense = state.expenses[split.expenseId];
    if (!expense) return 'defer';
    return action.payload.currentUserId === actorUserId && expense.paidByUserId === actorUserId
      ? 'apply'
      : 'reject';
  }

  if (action.type === 'RECORD_MATCHED_PAYMENT') {
    const split = state.splits[action.payload.splitId];
    if (!split) return 'defer';
    const expense = state.expenses[split.expenseId];
    if (!expense) return 'defer';
    if (!state.users[action.payload.userId]?.walletAddress || !state.users[action.payload.receiverUserId]?.walletAddress) {
      return 'defer';
    }
    return action.payload.userId === actorUserId
      && split.userId === actorUserId
      && action.payload.receiverUserId === expense.paidByUserId
      ? 'apply'
      : 'reject';
  }

  const groupExpenses = Object.values(state.expenses).filter(expense => expense.groupId === action.payload.groupId);
  if (groupExpenses.length === 0) return 'defer';
  return groupExpenses.some(expense => expense.paidByUserId === actorUserId) ? 'apply' : 'reject';
}

export async function connectHostSession({
  config,
  onEnvelope,
  bridge = new PolkadotHostBridge(),
}: {
  config: HostSessionConfig;
  onEnvelope: (envelope: SharedActionEnvelope, signerHex?: string) => void;
  bridge?: PolkadotHostBridge;
}): Promise<HostSessionConnection> {
  const identity: PolkadotHostIdentity = await bridge.requestIdentity();
  const identityPublicKey = publicKeyHex(identity.publicKey);
  const participant: HostParticipant = {
    userId: participantIdFromPublicKey(identityPublicKey),
    publicKeyHex: identityPublicKey,
    username: identity.username,
  };
  const chunkBuffers = new Map<string, {total: number; parts: Map<number, string>}>();
  const channel = await bridge.openSessionChannel({
    identity,
    groupId: config.roomId,
    secret: config.secret,
    onPacket: (packet: EncryptedSessionPacket, signerHex?: string) => {
      void decryptSessionValue<unknown>(config.secret, packet)
        .then(value => {
          if (!isEncryptedActionChunk(value)) {
            assertSharedActionEnvelope(value);
            onEnvelope(value, signerHex);
            return;
          }

          const signer = signerHex?.toLowerCase() ?? 'missing-signer';
          const bufferKey = `${signer}:${value.messageId}`;
          const buffer = chunkBuffers.get(bufferKey) ?? {total: value.total, parts: new Map<number, string>()};
          if (buffer.total !== value.total) {
            chunkBuffers.delete(bufferKey);
            return;
          }
          buffer.parts.set(value.index, value.part);
          chunkBuffers.set(bufferKey, buffer);
          if (buffer.parts.size !== buffer.total) return;

          const serialized = Array.from({length: buffer.total}, (_, index) => buffer.parts.get(index) ?? '').join('');
          chunkBuffers.delete(bufferKey);
          const envelope = JSON.parse(serialized) as unknown;
          assertSharedActionEnvelope(envelope);
          onEnvelope(envelope, signerHex);
        })
        .catch(() => undefined);
    },
  });

  return {
    participant,
    publish: async envelope => {
      const serialized = JSON.stringify(envelope);
      const parts = Array.from(
        {length: Math.ceil(serialized.length / CHUNK_TEXT_LENGTH)},
        (_, index) => serialized.slice(index * CHUNK_TEXT_LENGTH, (index + 1) * CHUNK_TEXT_LENGTH),
      );
      if (parts.length === 0 || parts.length > MAX_CHUNKS) {
        throw new Error('Shared action exceeds the session size limit.');
      }
      const results = await Promise.all(parts.map((part, index) => {
        const chunk: EncryptedActionChunk = {
          kind: 'chopdot-action-chunk',
          messageId: envelope.eventId,
          index,
          total: parts.length,
          part,
        };
        return encryptSessionValue(config.secret, chunk).then(packet => channel.publish(packet));
      }));
      return results.every(Boolean);
    },
    close: () => channel.close(),
  };
}

function normalizePublicKey(value: string): string {
  const normalized = value.toLowerCase().replace(/^0x/u, '');
  if (!/^[0-9a-f]{64}$/u.test(normalized)) return '';
  return `0x${normalized}`;
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isEncryptedActionChunk(value: unknown): value is EncryptedActionChunk {
  return isRecord(value)
    && value.kind === 'chopdot-action-chunk'
    && typeof value.messageId === 'string'
    && Number.isInteger(value.index)
    && Number.isInteger(value.total)
    && value.index >= 0
    && value.total > 0
    && value.total <= MAX_CHUNKS
    && value.index < value.total
    && typeof value.part === 'string'
    && value.part.length <= CHUNK_TEXT_LENGTH;
}

function isRuntimeSharedAction(value: Record<string, any>): value is SharedAction {
  if (!isRecord(value.payload)) return false;
  switch (value.type) {
    case 'ADD_USER':
      return isRecord(value.payload.user)
        && typeof value.payload.user.id === 'string'
        && typeof value.payload.user.name === 'string';
    case 'SET_WALLET_ADDRESS':
      return typeof value.payload.userId === 'string'
        && typeof value.payload.walletAddress === 'string';
    case 'CREATE_GROUP':
      return isRecord(value.payload.group)
        && typeof value.payload.group.id === 'string'
        && typeof value.payload.group.name === 'string'
        && Array.isArray(value.payload.group.memberIds)
        && value.payload.group.memberIds.every((id: unknown) => typeof id === 'string');
    case 'ADD_EXPENSE':
      return isRecord(value.payload.expense)
        && Array.isArray(value.payload.splits)
        && value.payload.splits.every((split: unknown) => isRecord(split));
    case 'SEND_REQUEST':
      return typeof value.payload.splitId === 'string';
    case 'MARK_PAID':
      return typeof value.payload.splitId === 'string' && typeof value.payload.userId === 'string';
    case 'CONFIRM_RECEIVED':
      return typeof value.payload.splitId === 'string' && typeof value.payload.currentUserId === 'string';
    case 'RECORD_MATCHED_PAYMENT':
      return typeof value.payload.splitId === 'string'
        && typeof value.payload.userId === 'string'
        && typeof value.payload.receiverUserId === 'string'
        && isRecord(value.payload.receipt)
        && typeof value.payload.receipt.txHash === 'string'
        && typeof value.payload.receipt.chainId === 'string'
        && typeof value.payload.receipt.from === 'string'
        && typeof value.payload.receipt.to === 'string'
        && typeof value.payload.receipt.amountBaseUnits === 'string'
        && typeof value.payload.receipt.blockNumber === 'string'
        && typeof value.payload.receipt.confirmedAt === 'string';
    case 'SAVE_RECORD':
      return typeof value.payload.recordId === 'string' && typeof value.payload.groupId === 'string';
    default:
      return false;
  }
}
