import type {AppState} from '../types.ts';
import type {Action} from '../state/store.ts';
import {decryptSessionValue, encryptSessionValue, type EncryptedSessionPacket} from './encryptedSession.ts';
import {
  assertPayerMarkedPaidEnvelope,
  assertReceiptConfirmedEnvelope,
  fromPayerMarkedPaidWire,
  fromReceiptConfirmedWire,
  isPayerMarkedPaidEnvelope,
  isReceiptConfirmedEnvelope,
  isReceiptConfirmedNotice,
  toPayerMarkedPaidWire,
  toReceiptConfirmedWire,
  type PayerMarkedPaidEnvelope,
  type ReceiptConfirmedEnvelope,
  type ReceiptConfirmedNotice,
} from './livePayerSync.ts';
import {PolkadotHostBridge, type PolkadotHostIdentity} from './polkadotHostBridge.ts';
import {
  assertCanonicalAuthorityEventEnvelope,
  isCanonicalAuthorityEventAck,
  isCanonicalAuthorityEventEnvelope,
  type CanonicalAuthorityEventAckV1,
  type CanonicalAuthorityEventEnvelopeV1,
} from '../core/authority/productionAuthority.ts';

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

export type HostSessionEnvelope = SharedActionEnvelope | PayerMarkedPaidEnvelope | ReceiptConfirmedEnvelope | ReceiptConfirmedNotice | CanonicalAuthorityEventEnvelopeV1 | CanonicalAuthorityEventAckV1;

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
  preparePublish(): Promise<boolean>;
  signBytes(data: Uint8Array): Promise<Uint8Array>;
  refreshPublishTransport(): Promise<void>;
  publish(envelope: HostSessionEnvelope): Promise<boolean>;
  close(): void;
}

interface EncryptedActionChunk {
  kind: 'chopdot-action-chunk';
  messageId: string;
  index: number;
  total: number;
  part: string;
}

export interface CompactActionChunk {
  v: 1;
  k: 'a';
  e: string;
  i: number;
  n: number;
  p: string;
}

export interface CompactSessionNotification {
  v: 1;
  g: string;
  u: string;
  c: number;
  s: string;
  t: number;
}

interface CompactPaymentChunk {
  v: 1;
  k: 'x';
  e: string;
  i: number;
  n: number;
  p: string;
}

interface CompactRegistration {
  v: 1;
  k: 'r';
  e: string;
  p: string;
  n: string;
  t: string;
  w?: string;
}

const CHUNK_TEXT_LENGTH = 120;
const MAX_CHUNKS = 64;
const COMPACT_PAYMENT_PART_LENGTH = 190;
const COMPACT_ACTION_PART_LENGTH = 200;
const MAX_COMPACT_ACTION_CHUNKS = 4;

const COMPACT_KEYS = {
  eventId: 'e', actorUserId: 'u', actorPublicKeyHex: 'p', occurredAt: 't', action: 'a',
  type: 'y', payload: 'd', user: 'h', group: 'g', expense: 'x', splits: 's', record: 'r',
  id: 'i', name: 'n', username: 'j', walletAddress: 'w', accountPublicKeyHex: 'q',
  memberIds: 'l', groupId: 'b', description: 'c', amount: 'm', currency: 'f',
  paidByUserId: 'o', date: 'z', expenseId: 'v', userId: 'U', status: 'S', splitId: 'I',
  currentUserId: 'C', receiverUserId: 'R', recordId: 'D', receipt: 'P', txHash: 'T',
  chainId: 'H', from: 'F', to: 'O', amountBaseUnits: 'B', blockNumber: 'N', confirmedAt: 'A',
} as const;

const EXPANDED_KEYS = Object.fromEntries(
  Object.entries(COMPACT_KEYS).map(([key, value]) => [value, key]),
) as Record<string, string>;

export function parseHostSessionConfig(search = window.location.search): HostSessionConfig | null {
  const params = new URLSearchParams(search);
  // Raw transport secrets are supported only by the local host-simulator
  // harness. User-facing payer and membership routes use scoped capabilities.
  if (params.get('developerChecks') !== '1') return null;
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

export function assertHostSessionEnvelope(value: unknown): asserts value is HostSessionEnvelope {
  if (isCanonicalAuthorityEventEnvelope(value)) {
    assertCanonicalAuthorityEventEnvelope(value);
    return;
  }
  if (isCanonicalAuthorityEventAck(value)) return;
  if (isRecord(value) && value.kind === 'chopdot-payer-marked-paid') {
    assertPayerMarkedPaidEnvelope(value);
    return;
  }
  if (isRecord(value) && value.kind === 'chopdot-receipt-confirmed') {
    assertReceiptConfirmedEnvelope(value);
    return;
  }
  if (isReceiptConfirmedNotice(value)) return;
  assertSharedActionEnvelope(value);
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

export function compactPaymentEventChunks(
  envelope: PayerMarkedPaidEnvelope,
): CompactPaymentChunk[] {
  const wire = toPayerMarkedPaidWire(envelope);
  const serialized = JSON.stringify(wire);
  const parts = Array.from(
    {length: Math.ceil(serialized.length / COMPACT_PAYMENT_PART_LENGTH)},
    (_, index) => serialized.slice(index * COMPACT_PAYMENT_PART_LENGTH, (index + 1) * COMPACT_PAYMENT_PART_LENGTH),
  );
  if (parts.length === 0 || parts.length > 4) {
    throw new Error('Payment event exceeds the compact session size limit.');
  }
  return parts.map((part, index) => ({v: 1, k: 'x', e: envelope.eventId, i: index, n: parts.length, p: part}));
}

export async function compactSharedActionChunks(
  envelope: SharedActionEnvelope,
): Promise<CompactActionChunk[]> {
  assertSharedActionEnvelope(envelope);
  const encoded = envelope.action.type === 'ADD_EXPENSE' && canUseCompactExpenseWire(envelope)
    ? encodeCompactExpenseEnvelope(envelope)
    : await encodeGenericCompactEnvelope(envelope);
  const serialized = base64UrlEncode(encoded);
  const parts = Array.from(
    {length: Math.ceil(serialized.length / COMPACT_ACTION_PART_LENGTH)},
    (_, index) => serialized.slice(
      index * COMPACT_ACTION_PART_LENGTH,
      (index + 1) * COMPACT_ACTION_PART_LENGTH,
    ),
  );
  if (parts.length === 0 || parts.length > MAX_COMPACT_ACTION_CHUNKS) {
    throw new Error('Shared action exceeds the compact session size limit.');
  }
  return parts.map((part, index) => ({
    v: 1,
    k: 'a',
    e: envelope.eventId,
    i: index,
    n: parts.length,
    p: part,
  }));
}

export function encodeCompactSessionNotification(value: CompactSessionNotification): string {
  if (
    value.v !== 1
    || !Number.isInteger(value.c)
    || value.c < 0
    || value.c > 255
    || !Number.isInteger(value.t)
    || value.t < 0
    || value.t > 0xffff_ffff
  ) throw new Error('Invalid compact session notification.');
  const writer = new ByteWriter();
  writer.u8(value.v);
  writer.token(value.g);
  writer.token(value.u);
  writer.u8(value.c);
  writer.token(value.s);
  writer.u32(value.t);
  return `n.${base64UrlEncode(writer.finish())}`;
}

export function decodeCompactSessionNotification(value: unknown): CompactSessionNotification | null {
  if (typeof value !== 'string' || !value.startsWith('n.')) return null;
  try {
    const reader = new ByteReader(base64UrlDecode(value.slice(2)));
    const v = reader.u8();
    const g = reader.token();
    const u = reader.token();
    const c = reader.u8();
    const s = reader.token();
    const t = reader.u32();
    reader.done();
    return v === 1 ? {v, g, u, c, s, t} : null;
  } catch {
    return null;
  }
}

export async function sharedActionFromCompactChunks(
  chunks: readonly CompactActionChunk[],
): Promise<SharedActionEnvelope> {
  if (chunks.length === 0 || chunks.length > MAX_COMPACT_ACTION_CHUNKS) {
    throw new Error('Invalid compact shared action.');
  }
  const ordered = [...chunks].sort((left, right) => left.i - right.i);
  const first = ordered[0];
  if (
    ordered.length !== first.n
    || ordered.some((chunk, index) => !isCompactActionChunk(chunk)
      || chunk.e !== first.e
      || chunk.n !== first.n
      || chunk.i !== index)
  ) {
    throw new Error('Invalid compact shared action.');
  }
  const compressed = base64UrlDecode(ordered.map(chunk => chunk.p).join(''));
  const envelope = compressed[0] === 1
    ? decodeCompactExpenseEnvelope(compressed)
    : await decodeGenericCompactEnvelope(compressed);
  assertSharedActionEnvelope(envelope);
  if (envelope.eventId !== first.e) throw new Error('Compact shared action event mismatch.');
  return envelope;
}

async function encodeGenericCompactEnvelope(envelope: SharedActionEnvelope): Promise<Uint8Array> {
  const compact = compactJsonValue(envelope);
  const compressed = await gzip(new TextEncoder().encode(JSON.stringify(compact)));
  return Uint8Array.of(0, ...compressed);
}

async function decodeGenericCompactEnvelope(value: Uint8Array): Promise<unknown> {
  if (value[0] !== 0) throw new Error('Unknown compact shared action encoding.');
  const json = new TextDecoder().decode(await gunzip(value.slice(1)));
  return expandJsonValue(JSON.parse(json));
}

function canUseCompactExpenseWire(envelope: SharedActionEnvelope): boolean {
  if (envelope.action.type !== 'ADD_EXPENSE') return false;
  const {expense, splits} = envelope.action.payload;
  const allowedExpenseKeys = new Set(['id', 'groupId', 'description', 'amount', 'currency', 'paidByUserId', 'date']);
  const allowedSplitKeys = new Set(['id', 'expenseId', 'userId', 'amount', 'status']);
  return envelope.actorUserId === participantIdFromPublicKey(envelope.actorPublicKeyHex)
    && Object.keys(expense).every(key => allowedExpenseKeys.has(key))
    && splits.length > 0
    && splits.length <= 32
    && splits.every(split => split.expenseId === expense.id
      && Object.keys(split).every(key => allowedSplitKeys.has(key)));
}

function encodeCompactExpenseEnvelope(envelope: SharedActionEnvelope): Uint8Array {
  if (envelope.action.type !== 'ADD_EXPENSE') throw new Error('Expected an expense event.');
  const writer = new ByteWriter();
  const {expense, splits} = envelope.action.payload;
  writer.u8(1);
  writer.token(envelope.eventId);
  writer.fixedHex(envelope.actorPublicKeyHex, 32);
  writer.timestamp(envelope.occurredAt);
  writer.token(expense.id);
  writer.token(expense.groupId);
  writer.string(expense.description);
  writer.number(expense.amount);
  writer.string(expense.currency ?? '');
  writer.u8(expense.paidByUserId === envelope.actorUserId ? 1 : 0);
  if (expense.paidByUserId !== envelope.actorUserId) writer.token(expense.paidByUserId);
  writer.timestamp(expense.date);
  writer.u8(splits.length);
  for (const split of splits) {
    writer.token(split.id);
    writer.token(split.userId);
    writer.number(split.amount);
    writer.u8(paymentStatusCode(split.status));
  }
  return writer.finish();
}

function decodeCompactExpenseEnvelope(value: Uint8Array): SharedActionEnvelope {
  const reader = new ByteReader(value);
  if (reader.u8() !== 1) throw new Error('Invalid compact expense encoding.');
  const eventId = reader.token();
  const actorPublicKeyHex = `0x${reader.fixedHex(32)}`;
  const actorUserId = participantIdFromPublicKey(actorPublicKeyHex);
  const occurredAt = reader.timestamp();
  const expenseId = reader.token();
  const groupId = reader.token();
  const description = reader.string();
  const amount = reader.number();
  const currency = reader.string();
  const paidByUserId = reader.u8() === 1 ? actorUserId : reader.token();
  const date = reader.timestamp();
  const splitCount = reader.u8();
  if (splitCount === 0 || splitCount > 32) throw new Error('Invalid compact expense split count.');
  const splits = Array.from({length: splitCount}, () => ({
    id: reader.token(),
    expenseId,
    userId: reader.token(),
    amount: reader.number(),
    status: paymentStatusFromCode(reader.u8()),
  }));
  reader.done();
  return {
    v: 1,
    eventId,
    actorUserId,
    actorPublicKeyHex,
    occurredAt,
    action: {
      type: 'ADD_EXPENSE',
      payload: {
        expense: {
          id: expenseId,
          groupId,
          description,
          amount,
          ...(currency ? {currency} : {}),
          paidByUserId,
          date,
        },
        splits,
      },
    },
  };
}

export async function connectHostSession({
  config,
  onEnvelope,
  bridge = new PolkadotHostBridge(),
}: {
  config: HostSessionConfig;
  onEnvelope: (envelope: HostSessionEnvelope, signerHex?: string) => void;
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
  const compactActionBuffers = new Map<string, {total: number; parts: Map<number, CompactActionChunk>} >();
  const compactPaymentBuffers = new Map<string, {total: number; parts: Map<number, string>}>();
  const openChannel = () => bridge.openSessionChannel({
    identity,
    groupId: config.roomId,
    secret: config.secret,
    onPacket: (packet: EncryptedSessionPacket, signerHex?: string) => {
      void decryptSessionValue<unknown>(config.secret, packet)
        .then(async value => {
          const payerEnvelope = fromPayerMarkedPaidWire(value);
          if (payerEnvelope) {
            onEnvelope(payerEnvelope, signerHex);
            return;
          }
          const confirmationEnvelope = fromReceiptConfirmedWire(value);
          if (confirmationEnvelope) {
            onEnvelope(confirmationEnvelope, signerHex);
            return;
          }
          const registrationEnvelope = fromCompactRegistration(value);
          if (registrationEnvelope) {
            onEnvelope(registrationEnvelope, signerHex);
            return;
          }
          if (isCompactPaymentChunk(value)) {
            const signer = signerHex?.toLowerCase() ?? 'missing-signer';
            const bufferKey = `${signer}:${value.e}`;
            const buffer = compactPaymentBuffers.get(bufferKey) ?? {total: value.n, parts: new Map<number, string>()};
            if (buffer.total !== value.n) {
              compactPaymentBuffers.delete(bufferKey);
              return;
            }
            buffer.parts.set(value.i, value.p);
            compactPaymentBuffers.set(bufferKey, buffer);
            if (buffer.parts.size !== buffer.total) return;
            const serialized = Array.from({length: buffer.total}, (_, index) => buffer.parts.get(index) ?? '').join('');
            compactPaymentBuffers.delete(bufferKey);
            const wire = JSON.parse(serialized) as unknown;
            const compactEnvelope = fromPayerMarkedPaidWire(wire);
            if (!compactEnvelope) throw new Error('Invalid compact payment event.');
            onEnvelope(compactEnvelope, signerHex);
            return;
          }
          if (isCompactActionChunk(value)) {
            const signer = signerHex?.toLowerCase() ?? 'missing-signer';
            const bufferKey = `${signer}:${value.e}`;
            const buffer = compactActionBuffers.get(bufferKey) ?? {
              total: value.n,
              parts: new Map<number, CompactActionChunk>(),
            };
            if (buffer.total !== value.n) {
              compactActionBuffers.delete(bufferKey);
              return;
            }
            buffer.parts.set(value.i, value);
            compactActionBuffers.set(bufferKey, buffer);
            if (buffer.parts.size !== buffer.total) return;
            compactActionBuffers.delete(bufferKey);
            const envelope = await sharedActionFromCompactChunks(
              Array.from({length: buffer.total}, (_, index) => buffer.parts.get(index)!),
            );
            onEnvelope(envelope, signerHex);
            return;
          }
          if (!isEncryptedActionChunk(value)) {
            assertHostSessionEnvelope(value);
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
          assertHostSessionEnvelope(envelope);
          onEnvelope(envelope, signerHex);
        })
        .catch(() => undefined);
    },
  });
  let channel = await openChannel();
  let closed = false;

  return {
    participant,
    preparePublish: () => channel.preparePublish(),
    signBytes: async data => {
      if (!identity.signBytes) throw new Error('Product-account signing is unavailable.');
      return identity.signBytes(data);
    },
    refreshPublishTransport: async () => {
      if (closed) throw new Error('Shared session is closed.');
      // Polkadot Desktop may replace its host transport while a remote account
      // signature modal is open. Retire the pre-sign channel before opening its
      // replacement: each channel owns a Statement Store subscription, and
      // overlapping both can exceed the host connection's subscription cap.
      const previous = channel;
      try {
        previous.close();
      } catch {
        // The whole purpose of this refresh is to recover from an already
        // disposed host transport. Opening the replacement remains safe.
      }
      channel = await openChannel();
    },
    publish: async envelope => {
      if (isCanonicalAuthorityEventAck(envelope)) {
        const packet = await encryptSessionValue(config.secret, envelope);
        return channel.publish(packet, `authority-ack/${envelope.eventId}/${envelope.acknowledgingParticipantId}`);
      }
      if (isCanonicalAuthorityEventEnvelope(envelope)) {
        const chunks = authorityEventChunks(envelope);
        const results = await Promise.all(chunks.map(async (chunk, index) => {
          const packet = await encryptSessionValue(config.secret, chunk);
          return channel.publish(packet, `authority/${envelope.event.eventId}/${index}`);
        }));
        return results.every(Boolean);
      }
      if (isReceiptConfirmedEnvelope(envelope)) {
        const packet = await encryptSessionValue(config.secret, toReceiptConfirmedWire(envelope));
        return channel.publish(packet, `receipt/${envelope.requestId}`);
      }
      if (isPayerMarkedPaidEnvelope(envelope)) {
        const chunks = compactPaymentEventChunks(envelope);
        const results = await Promise.all(chunks.map(async (chunk, index) => {
          const packet = await encryptSessionValue(config.secret, chunk);
          return channel.publish(packet, `payment/${envelope.eventId}/${index}`);
        }));
        return results.every(Boolean);
      }
      if (isReceiptConfirmedNotice(envelope)) {
        throw new Error('A received confirmation notice cannot be republished.');
      }
      if (isSelfRegistrationEnvelope(envelope)) {
        // Registration is a deterministic actor binding for this session, not
        // an append-only money transition. Keep it in one encrypted,
        // replaceable statement so chunk overhead cannot consume the retained
        // user budget before ordinary group actions are sent.
        const packet = await encryptSessionValue(config.secret, toCompactRegistration(envelope));
        return channel.publish(packet, `registration/${envelope.actorUserId}`);
      }
      const chunks = await compactSharedActionChunks(envelope);
      const results = await Promise.all(chunks.map((chunk, index) => {
        return encryptSessionValue(config.secret, chunk)
          .then(packet => channel.publish(packet, `action/${envelope.eventId}/${index}`));
      }));
      return results.every(Boolean);
    },
    close: () => {
      if (closed) return;
      closed = true;
      try {
        channel.close();
      } catch {
        // Host teardown is best effort. Delivery truth is the persisted outbox,
        // not whether an obsolete subscription accepted unsubscribe().
      }
    },
  };
}

function authorityEventChunks(envelope: CanonicalAuthorityEventEnvelopeV1): EncryptedActionChunk[] {
  assertCanonicalAuthorityEventEnvelope(envelope);
  const serialized = JSON.stringify(envelope);
  const parts = Array.from({length: Math.ceil(serialized.length / CHUNK_TEXT_LENGTH)}, (_, index) => (
    serialized.slice(index * CHUNK_TEXT_LENGTH, (index + 1) * CHUNK_TEXT_LENGTH)
  ));
  if (parts.length === 0 || parts.length > MAX_CHUNKS) throw new Error('Canonical authority event exceeds the session size limit.');
  return parts.map((part, index) => ({kind: 'chopdot-action-chunk', messageId: `authority:${envelope.event.eventId}`, index, total: parts.length, part}));
}

function isSelfRegistrationEnvelope(envelope: SharedActionEnvelope): boolean {
  if (envelope.action.type !== 'ADD_USER') return false;
  const {user} = envelope.action.payload;
  return user.id === envelope.actorUserId
    && participantIdFromPublicKey(envelope.actorPublicKeyHex) === envelope.actorUserId
    && Boolean(user.accountPublicKeyHex)
    && normalizePublicKey(user.accountPublicKeyHex!) === normalizePublicKey(envelope.actorPublicKeyHex);
}

function toCompactRegistration(envelope: SharedActionEnvelope): CompactRegistration {
  if (!isSelfRegistrationEnvelope(envelope) || envelope.action.type !== 'ADD_USER') {
    throw new Error('Only self registration can use the compact registration wire.');
  }
  const {user} = envelope.action.payload;
  return {
    v: 1,
    k: 'r',
    e: envelope.eventId,
    p: normalizePublicKey(envelope.actorPublicKeyHex).slice(2),
    n: user.name,
    t: envelope.occurredAt,
    ...(user.walletAddress ? {w: user.walletAddress} : {}),
  };
}

function fromCompactRegistration(value: unknown): SharedActionEnvelope | null {
  if (
    !isRecord(value)
    || value.v !== 1
    || value.k !== 'r'
    || typeof value.e !== 'string'
    || !value.e
    || typeof value.p !== 'string'
    || typeof value.n !== 'string'
    || !value.n.trim()
    || typeof value.t !== 'string'
    || Number.isNaN(Date.parse(value.t))
    || (value.w !== undefined && typeof value.w !== 'string')
  ) return null;
  const actorPublicKeyHex = normalizePublicKey(value.p);
  if (!actorPublicKeyHex) return null;
  const actorUserId = participantIdFromPublicKey(actorPublicKeyHex);
  return {
    v: 1,
    eventId: value.e,
    actorUserId,
    actorPublicKeyHex,
    occurredAt: value.t,
    action: {
      type: 'ADD_USER',
      payload: {
        user: {
          id: actorUserId,
          name: value.n,
          accountPublicKeyHex: actorPublicKeyHex,
          ...(value.w ? {walletAddress: value.w} : {}),
        },
      },
    },
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

function isCompactPaymentChunk(value: unknown): value is CompactPaymentChunk {
  return isRecord(value)
    && value.v === 1
    && value.k === 'x'
    && typeof value.e === 'string'
    && Number.isInteger(value.i)
    && Number.isInteger(value.n)
    && value.i >= 0
    && value.n > 0
    && value.n <= 4
    && value.i < value.n
    && typeof value.p === 'string'
    && value.p.length <= COMPACT_PAYMENT_PART_LENGTH;
}

function isCompactActionChunk(value: unknown): value is CompactActionChunk {
  return isRecord(value)
    && value.v === 1
    && value.k === 'a'
    && typeof value.e === 'string'
    && Boolean(value.e)
    && Number.isInteger(value.i)
    && Number.isInteger(value.n)
    && value.i >= 0
    && value.n > 0
    && value.n <= MAX_COMPACT_ACTION_CHUNKS
    && value.i < value.n
    && typeof value.p === 'string'
    && value.p.length > 0
    && value.p.length <= COMPACT_ACTION_PART_LENGTH
    && /^[A-Za-z0-9_-]+$/u.test(value.p);
}

function compactJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(compactJsonValue);
  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
      key in COMPACT_KEYS ? COMPACT_KEYS[key as keyof typeof COMPACT_KEYS] : `~${key}`,
      compactJsonValue(entry),
    ]));
  }
  if (typeof value !== 'string') return value;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(value)) {
    return `~${base64UrlEncode(hexToBytes(value.replaceAll('-', '')))}`;
  }
  if (/^0x[0-9a-f]{64}$/iu.test(value)) return `#${base64UrlEncode(hexToBytes(value.slice(2)))}`;
  if (/^u-host-[0-9a-f]{64}$/iu.test(value)) return `!${base64UrlEncode(hexToBytes(value.slice(7)))}`;
  if (/^\d{4}-\d{2}-\d{2}T/u.test(value) && Number.isFinite(Date.parse(value))) {
    return `@${Date.parse(value).toString(36)}`;
  }
  return /^[~#!@=]/u.test(value) ? `=${value}` : value;
}

function expandJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(expandJsonValue);
  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
      key.startsWith('~') ? key.slice(1) : (EXPANDED_KEYS[key] ?? key),
      expandJsonValue(entry),
    ]));
  }
  if (typeof value !== 'string') return value;
  if (value.startsWith('=')) return value.slice(1);
  if (value.startsWith('~')) return uuidFromBytes(base64UrlDecode(value.slice(1)));
  if (value.startsWith('#')) return `0x${bytesToHex(base64UrlDecode(value.slice(1)))}`;
  if (value.startsWith('!')) return `u-host-${bytesToHex(base64UrlDecode(value.slice(1)))}`;
  if (value.startsWith('@')) return new Date(Number.parseInt(value.slice(1), 36)).toISOString();
  return value;
}

async function gzip(value: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([value as BlobPart]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzip(value: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([value as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function base64UrlDecode(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new Error('Invalid base64url value.');
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(value.replaceAll('-', '+').replaceAll('_', '/') + padding);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function hexToBytes(value: string): Uint8Array {
  if (value.length % 2 !== 0 || !/^[0-9a-f]+$/iu.test(value)) throw new Error('Invalid hex value.');
  return Uint8Array.from({length: value.length / 2}, (_, index) => Number.parseInt(value.slice(index * 2, index * 2 + 2), 16));
}

function bytesToHex(value: Uint8Array): string {
  return Array.from(value, byte => byte.toString(16).padStart(2, '0')).join('');
}

function uuidFromBytes(value: Uint8Array): string {
  if (value.length !== 16) throw new Error('Invalid UUID bytes.');
  const hex = bytesToHex(value);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function paymentStatusCode(status: string): number {
  // Preserve v1 codes 0-3; `cleared` was appended so older packets remain decodable.
  const values = ['open', 'request_sent', 'marked_paid', 'confirmed', 'cleared'];
  const code = values.indexOf(status);
  if (code < 0) throw new Error('Invalid payment status.');
  return code;
}

function paymentStatusFromCode(code: number): 'open' | 'request_sent' | 'marked_paid' | 'confirmed' | 'cleared' {
  const values = ['open', 'request_sent', 'marked_paid', 'confirmed', 'cleared'] as const;
  const status = values[code];
  if (!status) throw new Error('Invalid payment status code.');
  return status;
}

class ByteWriter {
  private readonly bytes: number[] = [];
  private readonly encoder = new TextEncoder();

  u8(value: number): void {
    if (!Number.isInteger(value) || value < 0 || value > 255) throw new Error('Invalid byte.');
    this.bytes.push(value);
  }

  u16(value: number): void {
    if (!Number.isInteger(value) || value < 0 || value > 65_535) throw new Error('Invalid length.');
    this.bytes.push((value >>> 8) & 255, value & 255);
  }

  u32(value: number): void {
    if (!Number.isInteger(value) || value < 0 || value > 0xffff_ffff) throw new Error('Invalid integer.');
    this.bytes.push((value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255);
  }

  number(value: number): void {
    if (!Number.isFinite(value)) throw new Error('Invalid number.');
    const bytes = new Uint8Array(8);
    new DataView(bytes.buffer).setFloat64(0, value, false);
    this.bytes.push(...bytes);
  }

  timestamp(value: string): void {
    const timestamp = Date.parse(value);
    if (!Number.isSafeInteger(timestamp) || timestamp < 0) throw new Error('Invalid timestamp.');
    const bytes = new Uint8Array(8);
    new DataView(bytes.buffer).setBigUint64(0, BigInt(timestamp), false);
    this.bytes.push(...bytes);
  }

  string(value: string): void {
    const bytes = this.encoder.encode(value);
    this.u16(bytes.length);
    this.bytes.push(...bytes);
  }

  fixedHex(value: string, byteLength: number): void {
    const normalized = value.replace(/^0x/u, '');
    const bytes = hexToBytes(normalized);
    if (bytes.length !== byteLength) throw new Error('Invalid fixed hex value.');
    this.bytes.push(...bytes);
  }

  token(value: string): void {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(value)) {
      this.u8(0);
      this.bytes.push(...hexToBytes(value.replaceAll('-', '')));
      return;
    }
    if (/^u-host-[0-9a-f]{64}$/iu.test(value)) {
      this.u8(1);
      this.bytes.push(...hexToBytes(value.slice(7)));
      return;
    }
    if (/^[A-Za-z0-9_-]{22}$/u.test(value)) {
      const bytes = base64UrlDecode(value);
      if (bytes.length === 16) {
        this.u8(3);
        this.bytes.push(...bytes);
        return;
      }
    }
    this.u8(2);
    this.string(value);
  }

  finish(): Uint8Array {
    return Uint8Array.from(this.bytes);
  }
}

class ByteReader {
  private offset = 0;
  private readonly decoder = new TextDecoder('utf-8', {fatal: true});

  constructor(private readonly bytes: Uint8Array) {}

  u8(): number {
    this.ensure(1);
    return this.bytes[this.offset++];
  }

  u16(): number {
    this.ensure(2);
    const value = (this.bytes[this.offset] << 8) | this.bytes[this.offset + 1];
    this.offset += 2;
    return value;
  }

  u32(): number {
    this.ensure(4);
    const value = new DataView(this.bytes.buffer, this.bytes.byteOffset + this.offset, 4).getUint32(0, false);
    this.offset += 4;
    return value;
  }

  number(): number {
    this.ensure(8);
    const value = new DataView(this.bytes.buffer, this.bytes.byteOffset + this.offset, 8).getFloat64(0, false);
    this.offset += 8;
    if (!Number.isFinite(value)) throw new Error('Invalid number.');
    return value;
  }

  timestamp(): string {
    this.ensure(8);
    const value = new DataView(this.bytes.buffer, this.bytes.byteOffset + this.offset, 8).getBigUint64(0, false);
    this.offset += 8;
    const timestamp = Number(value);
    if (!Number.isSafeInteger(timestamp)) throw new Error('Invalid timestamp.');
    return new Date(timestamp).toISOString();
  }

  string(): string {
    const length = this.u16();
    this.ensure(length);
    const value = this.decoder.decode(this.bytes.slice(this.offset, this.offset + length));
    this.offset += length;
    return value;
  }

  fixedHex(byteLength: number): string {
    this.ensure(byteLength);
    const value = bytesToHex(this.bytes.slice(this.offset, this.offset + byteLength));
    this.offset += byteLength;
    return value;
  }

  token(): string {
    const kind = this.u8();
    if (kind === 0) {
      this.ensure(16);
      const value = uuidFromBytes(this.bytes.slice(this.offset, this.offset + 16));
      this.offset += 16;
      return value;
    }
    if (kind === 1) {
      this.ensure(32);
      const value = `u-host-${bytesToHex(this.bytes.slice(this.offset, this.offset + 32))}`;
      this.offset += 32;
      return value;
    }
    if (kind === 2) return this.string();
    if (kind === 3) {
      this.ensure(16);
      const value = base64UrlEncode(this.bytes.slice(this.offset, this.offset + 16));
      this.offset += 16;
      return value;
    }
    throw new Error('Invalid token type.');
  }

  done(): void {
    if (this.offset !== this.bytes.length) throw new Error('Unexpected compact action bytes.');
  }

  private ensure(length: number): void {
    if (this.offset + length > this.bytes.length) throw new Error('Truncated compact action.');
  }
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
