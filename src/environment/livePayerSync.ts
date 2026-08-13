import type {AppState} from '../types.ts';
import {cryptoWaitReady, signatureVerify} from '@polkadot/util-crypto';
import type {StandalonePayerRequest} from '../requestLinks.ts';

export interface PayerMarkedPaidEnvelope {
  v: 1;
  kind: 'chopdot-payer-marked-paid';
  eventId: string;
  requestId: string;
  groupId: string;
  memberId: string;
  amount: number;
  currency: string;
  memberCapability: string;
  actorPublicKeyHex: string;
  actorSignature: string;
  occurredAt: string;
  expiresAt: string;
}

export interface ReceiptConfirmedEnvelope {
  v: 1;
  kind: 'chopdot-receipt-confirmed';
  eventId: string;
  requestId: string;
  groupId: string;
  memberId: string;
  amount: number;
  currency: string;
  memberCapability: string;
  actorPublicKeyHex: string;
  actorSignature: string;
  occurredAt: string;
  expiresAt: string;
}

export interface PendingPayerAction {
  eventId: string;
  requestId: string;
  groupId: string;
  memberId: string;
  amount: number;
  currency: string;
  memberCapability: string;
  roomId: string;
  secret: string;
  occurredAt: string;
  expiresAt: string;
}

export type PendingReceiptConfirmation = PendingPayerAction;

export interface PayerMarkedPaidWire {
  v: 1;
  k: 'p';
  e: string;
  r: string;
  g: string;
  m: string;
  a: number;
  c: string;
  x: string;
  p: string;
  s: string;
  t: number;
  z: number;
}

export interface ReceiptConfirmedWire {
  v: 1;
  k: 'c';
  r: string;
  s: string;
}

export interface ReceiptConfirmedNotice {
  v: 1;
  kind: 'chopdot-receipt-confirmed-notice';
  requestId: string;
  actorSignature: string;
}

export interface KeyValueStorage {
  read(key: string): string | null;
  write(key: string, value: string): unknown;
  remove(key: string): unknown;
}

export type PayerEnvelopeValidation =
  | {
      ok: true;
      splitIds: string[];
      accountPublicKeyHex: string;
      statementSignerHex: string;
    }
  | {
      ok: false;
      reason:
        | 'invalid_envelope'
        | 'expired'
        | 'unknown_group'
        | 'unknown_member'
        | 'request_not_open'
        | 'request_mismatch'
        | 'capability_mismatch'
        | 'signature_invalid'
        | 'identity_mismatch';
    };

export type ReceiptConfirmationValidation =
  | {ok: true}
  | {
      ok: false;
      reason:
        | 'invalid_envelope'
        | 'expired'
        | 'request_mismatch'
        | 'capability_mismatch'
        | 'identity_mismatch'
        | 'signature_invalid';
    };

const OUTBOX_KEY = 'chopdot-payer-action-outbox-v1';
const CONFIRMATION_OUTBOX_KEY = 'chopdot-receipt-confirmation-outbox-v1';
const BASE64_URL = /^[A-Za-z0-9_-]{20,160}$/u;
const HEX_32 = /^0x[0-9a-f]{64}$/u;
const SIGNATURE_BASE64_URL = /^[A-Za-z0-9_-]{80,100}$/u;

export function createPayerMarkedPaidEnvelope(
  input: Omit<PayerMarkedPaidEnvelope, 'v' | 'kind'>,
): PayerMarkedPaidEnvelope {
  return {
    v: 1,
    kind: 'chopdot-payer-marked-paid',
    ...input,
    currency: input.currency.trim().toUpperCase(),
    actorPublicKeyHex: normalizeHex32(input.actorPublicKeyHex),
    actorSignature: input.actorSignature.trim(),
  };
}

export function createReceiptConfirmedEnvelope(
  input: Omit<ReceiptConfirmedEnvelope, 'v' | 'kind'>,
): ReceiptConfirmedEnvelope {
  return {
    v: 1,
    kind: 'chopdot-receipt-confirmed',
    ...input,
    currency: input.currency.trim().toUpperCase(),
    actorPublicKeyHex: normalizeHex32(input.actorPublicKeyHex),
    actorSignature: input.actorSignature.trim(),
  };
}

export function assertPayerMarkedPaidEnvelope(value: unknown): asserts value is PayerMarkedPaidEnvelope {
  if (!isRecord(value) || value.v !== 1 || value.kind !== 'chopdot-payer-marked-paid') {
    throw new Error('Invalid payer action.');
  }
  if (
    typeof value.eventId !== 'string' || !value.eventId ||
    typeof value.requestId !== 'string' || !value.requestId ||
    typeof value.groupId !== 'string' || !value.groupId ||
    typeof value.memberId !== 'string' || !value.memberId ||
    typeof value.amount !== 'number' || !Number.isFinite(value.amount) || value.amount <= 0 ||
    typeof value.currency !== 'string' || !/^[A-Z]{3}$/u.test(value.currency) ||
    typeof value.memberCapability !== 'string' || !BASE64_URL.test(value.memberCapability) ||
    typeof value.actorPublicKeyHex !== 'string' || !HEX_32.test(normalizeHex32(value.actorPublicKeyHex)) ||
    typeof value.actorSignature !== 'string' || !SIGNATURE_BASE64_URL.test(value.actorSignature) ||
    typeof value.occurredAt !== 'string' || Number.isNaN(Date.parse(value.occurredAt)) ||
    typeof value.expiresAt !== 'string' || Number.isNaN(Date.parse(value.expiresAt))
  ) {
    throw new Error('Invalid payer action.');
  }
}

export function assertReceiptConfirmedEnvelope(value: unknown): asserts value is ReceiptConfirmedEnvelope {
  if (!isRecord(value) || value.v !== 1 || value.kind !== 'chopdot-receipt-confirmed') {
    throw new Error('Invalid receipt confirmation.');
  }
  if (
    typeof value.eventId !== 'string' || !value.eventId ||
    typeof value.requestId !== 'string' || !value.requestId ||
    typeof value.groupId !== 'string' || !value.groupId ||
    typeof value.memberId !== 'string' || !value.memberId ||
    typeof value.amount !== 'number' || !Number.isFinite(value.amount) || value.amount <= 0 ||
    typeof value.currency !== 'string' || !/^[A-Z]{3}$/u.test(value.currency) ||
    typeof value.memberCapability !== 'string' || !BASE64_URL.test(value.memberCapability) ||
    typeof value.actorPublicKeyHex !== 'string' || !HEX_32.test(normalizeHex32(value.actorPublicKeyHex)) ||
    typeof value.actorSignature !== 'string' || !SIGNATURE_BASE64_URL.test(value.actorSignature) ||
    typeof value.occurredAt !== 'string' || Number.isNaN(Date.parse(value.occurredAt)) ||
    typeof value.expiresAt !== 'string' || Number.isNaN(Date.parse(value.expiresAt))
  ) {
    throw new Error('Invalid receipt confirmation.');
  }
}

export function isPayerMarkedPaidEnvelope(value: unknown): value is PayerMarkedPaidEnvelope {
  try {
    assertPayerMarkedPaidEnvelope(value);
    return true;
  } catch {
    return false;
  }
}

export function isReceiptConfirmedEnvelope(value: unknown): value is ReceiptConfirmedEnvelope {
  try {
    assertReceiptConfirmedEnvelope(value);
    return true;
  } catch {
    return false;
  }
}

export function isReceiptConfirmedNotice(value: unknown): value is ReceiptConfirmedNotice {
  return isRecord(value)
    && value.v === 1
    && value.kind === 'chopdot-receipt-confirmed-notice'
    && typeof value.requestId === 'string'
    && Boolean(value.requestId)
    && typeof value.actorSignature === 'string'
    && SIGNATURE_BASE64_URL.test(value.actorSignature);
}

export function toPayerMarkedPaidWire(envelope: PayerMarkedPaidEnvelope): PayerMarkedPaidWire {
  assertPayerMarkedPaidEnvelope(envelope);
  return {
    v: 1,
    k: 'p',
    e: packId(envelope.eventId),
    r: packId(envelope.requestId),
    g: packId(envelope.groupId),
    m: packId(envelope.memberId),
    a: envelope.amount,
    c: envelope.currency,
    x: envelope.memberCapability,
    p: envelope.actorPublicKeyHex.slice(2),
    s: envelope.actorSignature,
    t: Math.floor(Date.parse(envelope.occurredAt) / 1000),
    z: Math.floor(Date.parse(envelope.expiresAt) / 1000),
  };
}

export function fromPayerMarkedPaidWire(value: unknown): PayerMarkedPaidEnvelope | null {
  if (
    !isRecord(value) || value.v !== 1 || value.k !== 'p' ||
    typeof value.e !== 'string' || typeof value.r !== 'string' ||
    typeof value.g !== 'string' || typeof value.m !== 'string' ||
    typeof value.a !== 'number' || typeof value.c !== 'string' ||
    typeof value.x !== 'string' || typeof value.p !== 'string' ||
    typeof value.s !== 'string' ||
    typeof value.t !== 'number' || typeof value.z !== 'number'
  ) return null;
  try {
    const envelope = createPayerMarkedPaidEnvelope({
      eventId: unpackId(value.e),
      requestId: unpackId(value.r),
      groupId: unpackId(value.g),
      memberId: unpackId(value.m),
      amount: value.a,
      currency: value.c,
      memberCapability: value.x,
      actorPublicKeyHex: `0x${value.p}`,
      actorSignature: value.s,
      occurredAt: new Date(value.t * 1000).toISOString(),
      expiresAt: new Date(value.z * 1000).toISOString(),
    });
    assertPayerMarkedPaidEnvelope(envelope);
    return envelope;
  } catch {
    return null;
  }
}

export function toReceiptConfirmedWire(envelope: ReceiptConfirmedEnvelope): ReceiptConfirmedWire {
  assertReceiptConfirmedEnvelope(envelope);
  return {
    v: 1,
    k: 'c',
    r: packId(envelope.requestId),
    s: envelope.actorSignature,
  };
}

export function fromReceiptConfirmedWire(value: unknown): ReceiptConfirmedNotice | null {
  if (
    !isRecord(value) || value.v !== 1 || value.k !== 'c' ||
    typeof value.r !== 'string' || typeof value.s !== 'string'
  ) return null;
  const notice: ReceiptConfirmedNotice = {
    v: 1,
    kind: 'chopdot-receipt-confirmed-notice',
    requestId: unpackId(value.r),
    actorSignature: value.s,
  };
  return isReceiptConfirmedNotice(notice) ? notice : null;
}

export type SignedPaymentEvent = PayerMarkedPaidEnvelope | ReceiptConfirmedEnvelope;

export function paymentEventSigningBytes(envelope: SignedPaymentEvent): Uint8Array {
  const kind = envelope.kind === 'chopdot-payer-marked-paid' ? 'p' : 'c';
  const fields = [
    'chopdot-payment-event-v1',
    kind,
    envelope.eventId,
    envelope.requestId,
    envelope.groupId,
    envelope.memberId,
    envelope.amount,
    envelope.currency,
    envelope.memberCapability,
    normalizeHex32(envelope.actorPublicKeyHex),
    Math.floor(Date.parse(envelope.expiresAt) / 1000),
  ];
  if (kind === 'p') fields.push(Math.floor(Date.parse(envelope.occurredAt) / 1000));
  return new TextEncoder().encode(JSON.stringify(fields));
}

export async function validatePayerMarkedPaidEnvelope(
  state: AppState,
  envelope: PayerMarkedPaidEnvelope,
  statementSignerHex: string | undefined,
  now = new Date(),
): Promise<PayerEnvelopeValidation> {
  try {
    assertPayerMarkedPaidEnvelope(envelope);
  } catch {
    return {ok: false, reason: 'invalid_envelope'};
  }

  if (Date.parse(envelope.expiresAt) <= now.getTime()) return {ok: false, reason: 'expired'};
  if (!(await verifyPaymentEventSignature(envelope))) return {ok: false, reason: 'signature_invalid'};
  const group = state.groups[envelope.groupId];
  if (!group) return {ok: false, reason: 'unknown_group'};
  if (!group.memberIds.includes(envelope.memberId)) return {ok: false, reason: 'unknown_member'};

  const matching = Object.values(state.splits).filter(split => {
    const expense = state.expenses[split.expenseId];
    return split.userId === envelope.memberId
      && split.requestId === envelope.requestId
      && expense?.groupId === envelope.groupId;
  });
  if (matching.length === 0 || matching.some(split => split.status !== 'request_sent')) {
    return {ok: false, reason: 'request_not_open'};
  }

  const matchingAmount = matching.reduce((sum, split) => sum + split.amount, 0);
  const currencies = new Set(matching.map(split => state.expenses[split.expenseId]?.currency ?? state.currency));
  if (
    Math.abs(matchingAmount - envelope.amount) > 0.005 ||
    currencies.size !== 1 ||
    !currencies.has(envelope.currency) ||
    matching.some(split => !sameEpochSecond(split.requestExpiresAt, envelope.expiresAt))
  ) {
    return {ok: false, reason: 'request_mismatch'};
  }

  const capabilityHash = await hashMemberCapability(envelope.memberCapability);
  if (matching.some(split => !split.requestCapabilityHash || split.requestCapabilityHash !== capabilityHash)) {
    return {ok: false, reason: 'capability_mismatch'};
  }

  const accountPublicKeyHex = normalizeHex32(envelope.actorPublicKeyHex);
  const normalizedSigner = normalizeHex32(statementSignerHex ?? '');
  const member = state.users[envelope.memberId];
  if (
    !accountPublicKeyHex ||
    !normalizedSigner ||
    (member?.accountPublicKeyHex && normalizeHex32(member.accountPublicKeyHex) !== accountPublicKeyHex) ||
    (member?.statementSignerHex && normalizeHex32(member.statementSignerHex) !== normalizedSigner)
  ) {
    return {ok: false, reason: 'identity_mismatch'};
  }

  return {
    ok: true,
    splitIds: matching.map(split => split.id),
    accountPublicKeyHex,
    statementSignerHex: normalizedSigner,
  };
}

export async function validateReceiptConfirmedForPayer(
  request: StandalonePayerRequest,
  route: {groupId: string; memberId: string},
  notice: ReceiptConfirmedNotice,
  statementSignerHex: string | undefined,
  now = new Date(),
): Promise<ReceiptConfirmationValidation> {
  if (!isReceiptConfirmedNotice(notice)) return {ok: false, reason: 'invalid_envelope'};
  const envelope = createReceiptConfirmedEnvelope({
    eventId: receiptConfirmationEventId(request.requestId),
    requestId: notice.requestId,
    groupId: route.groupId,
    memberId: route.memberId,
    amount: request.amount,
    currency: request.currency,
    memberCapability: request.live.memberCapability,
    actorPublicKeyHex: request.live.requesterPublicKeyHex ?? '',
    actorSignature: notice.actorSignature,
    occurredAt: request.createdAt,
    expiresAt: request.expiresAt,
  });
  if (Date.parse(envelope.expiresAt) <= now.getTime()) return {ok: false, reason: 'expired'};
  if (
    envelope.requestId !== request.requestId ||
    envelope.groupId !== route.groupId ||
    envelope.memberId !== route.memberId ||
    Math.abs(envelope.amount - request.amount) > 0.005 ||
    envelope.currency !== request.currency ||
    !sameEpochSecond(envelope.expiresAt, request.expiresAt)
  ) {
    return {ok: false, reason: 'request_mismatch'};
  }
  if (envelope.memberCapability !== request.live.memberCapability) {
    return {ok: false, reason: 'capability_mismatch'};
  }
  if (
    request.live.authority !== 'native' ||
    normalizeHex32(envelope.actorPublicKeyHex) !== normalizeHex32(request.live.requesterPublicKeyHex ?? '') ||
    !normalizeHex32(statementSignerHex ?? '')
  ) {
    return {ok: false, reason: 'identity_mismatch'};
  }
  if (!(await verifyPaymentEventSignature(envelope))) return {ok: false, reason: 'signature_invalid'};
  return {ok: true};
}

export function receiptConfirmationEventId(requestId: string): string {
  return `confirm:${requestId}`;
}

export async function verifyPaymentEventSignature(envelope: SignedPaymentEvent): Promise<boolean> {
  try {
    if (!(await cryptoWaitReady())) return false;
    const result = signatureVerify(
      paymentEventSigningBytes(envelope),
      base64UrlToBytes(envelope.actorSignature),
      envelope.actorPublicKeyHex,
    );
    return result.isValid && result.crypto === 'sr25519';
  } catch {
    return false;
  }
}

function sameEpochSecond(left: string | undefined, right: string): boolean {
  if (!left) return false;
  return Math.floor(Date.parse(left) / 1000) === Math.floor(Date.parse(right) / 1000);
}

export async function hashMemberCapability(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

export function createLiveGroupSession(): {roomId: string; secret: string} {
  return {
    roomId: `group-${crypto.randomUUID()}`,
    secret: randomBase64Url(32),
  };
}

export function createMemberCapability(): string {
  return randomBase64Url(32);
}

export async function derivePayerSessionConfig(
  requestId: string,
  memberCapability: string,
): Promise<{roomId: string; secret: string}> {
  if (!requestId.trim() || !/^[A-Za-z0-9_-]{20,160}$/u.test(memberCapability)) {
    throw new Error('The payment request capability is invalid.');
  }
  const material = new TextEncoder().encode(
    `chopdot-payer-session-v1\0${requestId}\0${memberCapability}`,
  );
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', material));
  return {
    roomId: `payer-${requestId}`,
    secret: bytesToBase64Url(digest),
  };
}

export class PayerActionOutbox {
  constructor(private readonly storage: KeyValueStorage, private readonly storageKey = OUTBOX_KEY) {}

  enqueue(action: PendingPayerAction): PendingPayerAction {
    const items = this.readAll();
    const existing = items.find(item => item.requestId === action.requestId);
    if (existing) return existing;
    items.push(action);
    this.writeAll(items);
    return action;
  }

  get(requestId: string): PendingPayerAction | null {
    return this.readAll().find(item => item.requestId === requestId) ?? null;
  }

  async flush(
    publish: (action: PendingPayerAction) => Promise<boolean>,
  ): Promise<{published: string[]; pending: string[]}> {
    const items = this.readAll();
    const retained: PendingPayerAction[] = [];
    const published: string[] = [];
    for (const item of items) {
      let accepted = false;
      try {
        accepted = await publish(item);
      } catch {
        accepted = false;
      }
      if (accepted) published.push(item.requestId);
      else retained.push(item);
    }
    this.writeAll(retained);
    return {published, pending: retained.map(item => item.requestId)};
  }

  private readAll(): PendingPayerAction[] {
    const stored = this.storage.read(this.storageKey);
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored) as unknown;
      return Array.isArray(parsed) ? parsed.filter(isPendingPayerAction) : [];
    } catch {
      return [];
    }
  }

  private writeAll(items: PendingPayerAction[]): void {
    if (items.length === 0) {
      this.storage.remove(this.storageKey);
      return;
    }
    this.storage.write(this.storageKey, JSON.stringify(items));
  }
}

export class ReceiptConfirmationOutbox {
  constructor(private readonly storage: KeyValueStorage, private readonly storageKey = CONFIRMATION_OUTBOX_KEY) {}

  enqueue(action: PendingReceiptConfirmation): PendingReceiptConfirmation {
    const items = this.readAll();
    const existing = items.find(item => item.requestId === action.requestId);
    if (existing) return existing;
    items.push(action);
    this.writeAll(items);
    return action;
  }

  get(requestId: string): PendingReceiptConfirmation | null {
    return this.readAll().find(item => item.requestId === requestId) ?? null;
  }

  async flush(
    publish: (action: PendingReceiptConfirmation) => Promise<boolean>,
  ): Promise<{published: string[]; pending: string[]}> {
    const retained: PendingReceiptConfirmation[] = [];
    const published: string[] = [];
    for (const item of this.readAll()) {
      let accepted = false;
      try {
        accepted = await publish(item);
      } catch {
        accepted = false;
      }
      if (accepted) published.push(item.requestId);
      else retained.push(item);
    }
    this.writeAll(retained);
    return {published, pending: retained.map(item => item.requestId)};
  }

  private readAll(): PendingReceiptConfirmation[] {
    const stored = this.storage.read(this.storageKey);
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored) as unknown;
      return Array.isArray(parsed) ? parsed.filter(isPendingPayerAction) : [];
    } catch {
      return [];
    }
  }

  private writeAll(items: PendingReceiptConfirmation[]): void {
    if (items.length === 0) {
      this.storage.remove(this.storageKey);
      return;
    }
    this.storage.write(this.storageKey, JSON.stringify(items));
  }
}

function isPendingPayerAction(value: unknown): value is PendingPayerAction {
  return isRecord(value)
    && typeof value.eventId === 'string'
    && typeof value.requestId === 'string'
    && typeof value.groupId === 'string'
    && typeof value.memberId === 'string'
    && typeof value.amount === 'number'
    && typeof value.currency === 'string'
    && typeof value.memberCapability === 'string'
    && typeof value.roomId === 'string'
    && typeof value.secret === 'string'
    && typeof value.occurredAt === 'string'
    && typeof value.expiresAt === 'string';
}

function normalizeHex32(value: string): string {
  const normalized = value.toLowerCase().replace(/^0x/u, '');
  return /^[0-9a-f]{64}$/u.test(normalized) ? `0x${normalized}` : '';
}

function randomBase64Url(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/gu, '');
}

export function signatureToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64Url(bytes);
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/gu, '+').replace(/_/gu, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(normalized);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function packId(value: string): string {
  const match = /^(paid|confirm|req|g|u)-([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})$/iu.exec(value);
  if (!match) return value;
  const prefix = {paid: 'e', confirm: 'f', req: 'r', g: 'g', u: 'u'}[match[1].toLowerCase() as 'paid' | 'confirm' | 'req' | 'g' | 'u'];
  const hex = match.slice(2).join('');
  const bytes = Uint8Array.from(hex.match(/.{2}/gu) ?? [], part => Number.parseInt(part, 16));
  return `${prefix}${bytesToBase64Url(bytes)}`;
}

function unpackId(value: string): string {
  const match = /^([efrgu])([A-Za-z0-9_-]{22})$/u.exec(value);
  if (!match) return value;
  const normalized = match[2].replace(/-/gu, '+').replace(/_/gu, '/').padEnd(24, '=');
  const binary = atob(normalized);
  const hex = Array.from(binary, character => character.charCodeAt(0).toString(16).padStart(2, '0')).join('');
  const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  const prefix = {e: 'paid', f: 'confirm', r: 'req', g: 'g', u: 'u'}[match[1] as 'e' | 'f' | 'r' | 'g' | 'u'];
  return `${prefix}-${uuid}`;
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
