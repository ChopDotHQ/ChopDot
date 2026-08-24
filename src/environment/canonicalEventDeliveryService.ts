import {
  assertCanonicalAuthorityEventEnvelope,
  type CanonicalAuthorityEventEnvelopeV1,
} from '../core/authority/productionAuthority.ts';
import {projectCanonicalEvents, type CanonicalEventV1, type CanonicalGroupStateV1, type CanonicalVerifier} from '../core/moneyEventKernel.ts';
import {verifyParticipantSignature} from '../core/authority/browserAuthority.ts';
import type {AccountMessageSigner, AccountMessageVerifier} from '../membership/groupKeyHandoff.ts';
import {DurableMembershipKeyEnvelopeRegistry} from '../membership/membershipKeyEnvelopeRegistry.ts';
import type {KeyValueStorage} from './livePayerSync.ts';
import type {CanonicalEventChatTransport} from './canonicalEventChatTransport.ts';
import {
  EncryptedEventDeliveryQueue,
  createEncryptedDeliveryEnvelope,
  type DeliveryJson,
  type EncryptedDeliveryAckV1,
  type EncryptedDeliveryEnvelopeV1,
  type EncryptedDeliveryPayloadV1,
} from './encryptedEventDelivery.ts';

const PAYLOAD_KIND = 'chopdot.canonical-authority-event.v1';
const DEFAULT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1_000;

export interface CanonicalGroupRoomBindingV1 {
  v: 1;
  groupId: string;
  roomId: string;
  channelId: string;
  boundAt: string;
}

export interface CanonicalEventDeliveryAuthorityPort {
  readCanonicalGroup(groupId: string): Promise<CanonicalGroupStateV1 | null>;
  accept(envelope: CanonicalAuthorityEventEnvelopeV1): Promise<void>;
  importHistory?(events: CanonicalEventV1[]): Promise<void>;
}

/**
 * Account-scoped delivery composition for accepted ChopEventV1 transitions.
 *
 * Chat room and peer metadata route ciphertext only. The event signature and
 * ProductionAuthority replay remain the sole authority, while the current
 * account-bound membership key is the only decryption capability.
 */
export class CanonicalEventDeliveryService {
  private readonly participantId: string;
  private readonly accountPublicKeyHex: string;
  private readonly queue: EncryptedEventDeliveryQueue;
  private readonly bindingsKey: string;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly options: {
    participantId: string;
    accountPublicKeyHex: string;
    signer: AccountMessageSigner;
    storage: KeyValueStorage;
    keyEnvelopes: DurableMembershipKeyEnvelopeRegistry;
    authority: CanonicalEventDeliveryAuthorityPort;
    transport: CanonicalEventChatTransport;
    verifier?: AccountMessageVerifier;
    now?: () => string;
    expiryMs?: number;
    namespace?: string;
    canonicalVerifier?: CanonicalVerifier;
  }) {
    this.participantId = required(options.participantId, 'Participant is required.');
    this.accountPublicKeyHex = normalizeAccount(options.accountPublicKeyHex);
    if (!this.accountPublicKeyHex) throw new Error('A Product Account is required for group delivery.');
    const namespace = options.namespace?.trim() || `chopdot-canonical-delivery-v1:${this.accountPublicKeyHex}`;
    this.bindingsKey = `${namespace}:bindings`;
    this.queue = new EncryptedEventDeliveryQueue(options.storage, namespace);
  }

  async bindGroupToRoom(input: {groupId: string; roomId: string; replace?: boolean}): Promise<CanonicalGroupRoomBindingV1> {
    const groupId = required(input.groupId, 'Group is required.');
    const roomId = required(input.roomId, 'Choose a conversation first.');
    const bindings = this.bindings();
    const existing = bindings[groupId];
    if (existing) {
      if (existing.roomId === roomId) return structuredClone(existing);
      if (!input.replace) throw new Error('This group is already bound to another conversation. Confirm replacement first.');
    }
    const binding: CanonicalGroupRoomBindingV1 = {
      v: 1,
      groupId,
      roomId,
      channelId: await canonicalGroupChannelId(groupId, roomId),
      boundAt: canonicalTimestamp(this.now()),
    };
    this.writeBindings({...bindings, [groupId]: binding});
    return structuredClone(binding);
  }

  bindingForGroup(groupIdValue: string): CanonicalGroupRoomBindingV1 | null {
    const value = this.bindings()[required(groupIdValue, 'Group is required.')];
    return value ? structuredClone(value) : null;
  }

  listBindings(): CanonicalGroupRoomBindingV1[] {
    return Object.values(this.bindings()).map(value => structuredClone(value));
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Queue one locally accepted event for every active account except the sender. */
  async queueAcceptedEvent(event: CanonicalEventV1, state: CanonicalGroupStateV1): Promise<string[]> {
    if (event.groupId !== state.groupId || !state.eventIds.includes(event.eventId)) {
      throw new Error('Only an accepted event on this exact group frontier can be delivered.');
    }
    if (event.actorId !== this.participantId || normalizeAccount(event.actorAccountPublicKeyHex) !== this.accountPublicKeyHex) {
      throw new Error('Only the local event signer can publish this group update.');
    }
    const recipients = Object.values(state.members)
      .filter(member => member.active !== false && member.participantId !== this.participantId)
      .sort((left, right) => left.participantId.localeCompare(right.participantId));
    if (recipients.length === 0) return [];
    const binding = this.bindingForGroup(state.groupId);
    if (!binding) throw new Error('Choose a conversation for this group before sharing updates.');
    const keyVersion = currentGroupKeyVersion(state);
    const sender = state.members[this.participantId];
    if (!sender || sender.active === false || sender.keyVersion !== keyVersion || !sender.groupKeyEnvelopeId) {
      throw new Error('Current account-bound group access is unavailable.');
    }
    const senderRecord = await this.options.keyEnvelopes.findAcknowledged({
      groupId: state.groupId,
      participantId: this.participantId,
      recipientAccountPublicKeyHex: this.accountPublicKeyHex,
      keyVersion,
    });
    if (!senderRecord || senderRecord.binding.groupKeyEnvelopeId !== sender.groupKeyEnvelopeId) {
      throw new Error('Current account-bound group access is unavailable.');
    }
    for (const member of recipients) {
      if (!normalizeAccount(member.accountPublicKeyHex)
        || member.keyVersion !== keyVersion
        || !member.groupKeyEnvelopeId) {
        throw new Error(`Group access is not ready for ${member.participantId}.`);
      }
    }
    const expectedIds = recipients.map(recipient => deliveryId(event.eventId, recipient.participantId));
    const missing = recipients.filter((_, index) => !this.queue.hasPending(expectedIds[index]) && !this.queue.hasAcknowledged(expectedIds[index]));
    if (missing.length === 0) return expectedIds;
    const deliveryKey = await this.options.keyEnvelopes.open(senderRecord.binding);
    try {
      const now = canonicalTimestamp(this.now());
      const expiresAt = new Date(Date.parse(now) + this.expiryMs()).toISOString();
      const envelopes: EncryptedDeliveryEnvelopeV1[] = [];
      for (const recipient of missing) {
        const envelope = await createEncryptedDeliveryEnvelope({
          envelopeId: deliveryId(event.eventId, recipient.participantId),
          channelId: binding.channelId,
          senderAccountPublicKeyHex: this.accountPublicKeyHex,
          recipientAccountPublicKeyHex: recipient.accountPublicKeyHex,
          keyVersion,
          createdAt: now,
          expiresAt,
          deliveryKey,
          payload: canonicalEventPayload(event),
          signer: this.options.signer,
        });
        envelopes.push(envelope);
      }
      this.queue.enqueueMany(envelopes.map(envelope => ({envelope, queuedAt: now})));
      this.notify();
      return expectedIds;
    } finally {
      deliveryKey.fill(0);
    }
  }

  /**
   * Queue one complete accepted frontier for a newly granted recipient. The
   * recipient imports this event set atomically, so MEMBER_ADDED never outruns
   * GROUP_CREATED or an intermediate signed event.
   */
  async queueHistoryForRecipient(input: {
    events: CanonicalEventV1[];
    state: CanonicalGroupStateV1;
    recipientId: string;
  }): Promise<string> {
    const recipientId = required(input.recipientId, 'Recipient is required.');
    if (input.events.length === 0
      || input.events.length !== input.state.version
      || input.events.some(event => event.groupId !== input.state.groupId)
      || input.events.map(event => event.eventId).join('\u0000') !== input.state.eventIds.join('\u0000')) {
      throw new Error('Only one complete accepted group frontier can be sent for catch-up.');
    }
    const binding = this.bindingForGroup(input.state.groupId);
    if (!binding) throw new Error('Choose a conversation for this group before sharing updates.');
    const keyVersion = currentGroupKeyVersion(input.state);
    const sender = input.state.members[this.participantId];
    const recipient = input.state.members[recipientId];
    if (!sender || sender.active === false || sender.keyVersion !== keyVersion || !sender.groupKeyEnvelopeId) {
      throw new Error('Current account-bound group access is unavailable.');
    }
    if (!recipient || recipient.active === false || recipient.keyVersion !== keyVersion || !recipient.groupKeyEnvelopeId) {
      throw new Error('New member account-bound group access is unavailable.');
    }
    const senderRecord = await this.options.keyEnvelopes.findAcknowledged({
      groupId: input.state.groupId,
      participantId: this.participantId,
      recipientAccountPublicKeyHex: this.accountPublicKeyHex,
      keyVersion,
    });
    if (!senderRecord || senderRecord.binding.groupKeyEnvelopeId !== sender.groupKeyEnvelopeId) {
      throw new Error('Current account-bound group access is unavailable.');
    }
    const envelopeId = `history:${required(input.state.currentEventId ?? '', 'Current group frontier is required.')}:recipient:${recipientId}`;
    if (this.queue.hasPending(envelopeId) || this.queue.hasAcknowledged(envelopeId)) return envelopeId;
    const deliveryKey = await this.options.keyEnvelopes.open(senderRecord.binding);
    try {
      const createdAt = canonicalTimestamp(this.now());
      const envelope = await createEncryptedDeliveryEnvelope({
        envelopeId,
        channelId: binding.channelId,
        senderAccountPublicKeyHex: this.accountPublicKeyHex,
        recipientAccountPublicKeyHex: recipient.accountPublicKeyHex,
        keyVersion,
        createdAt,
        expiresAt: new Date(Date.parse(createdAt) + this.expiryMs()).toISOString(),
        deliveryKey,
        payload: {v: 1, kind: 'chopdot.canonical-authority-history.v1', body: JSON.parse(JSON.stringify(input.events)) as DeliveryJson},
        signer: this.options.signer,
      });
      this.queue.enqueue(envelope, createdAt);
      this.notify();
      return envelope.envelopeId;
    } finally {
      deliveryKey.fill(0);
    }
  }

  /**
   * Deliver the canonical removal on both sides of its key boundary. Remaining
   * members receive it under the acknowledged next key. The removed account
   * receives only that signed removal event under the acknowledged old key, so
   * its local authority can mark it inactive without learning the next key.
   */
  async queueMembershipRemoval(input: {events: CanonicalEventV1[]; participantId: string}): Promise<string[]> {
    const participantId = required(input.participantId, 'Removed participant is required.');
    if (input.events.length === 0 || input.events.some(event => event.groupId !== input.events[0].groupId)) {
      throw new Error('Removal delivery needs one complete accepted group history.');
    }
    const complete = await projectCanonicalEvents(input.events, this.options.canonicalVerifier ?? verifyParticipantSignature);
    if (complete.rejected.length || complete.conflicts.length
      || complete.state.eventIds.join('\u0000') !== input.events.map(event => event.eventId).join('\u0000')) {
      throw new Error('Removal delivery history is not one accepted frontier.');
    }
    let removalIndex = -1;
    for (let index = input.events.length - 1; index >= 0; index -= 1) {
      const candidate = input.events[index];
      if (candidate.eventType === 'MEMBER_REMOVED'
        && (candidate.payload as {participantId?: string}).participantId === participantId) {
        removalIndex = index;
        break;
      }
    }
    if (removalIndex < 1) throw new Error('The accepted removal event is unavailable.');
    const event = input.events[removalIndex];
    const [beforeProjection, afterProjection] = await Promise.all([
      projectCanonicalEvents(input.events.slice(0, removalIndex), this.options.canonicalVerifier ?? verifyParticipantSignature),
      projectCanonicalEvents(input.events.slice(0, removalIndex + 1), this.options.canonicalVerifier ?? verifyParticipantSignature),
    ]);
    if (beforeProjection.rejected.length || beforeProjection.conflicts.length
      || afterProjection.rejected.length || afterProjection.conflicts.length
      || event.parentEventId !== beforeProjection.state.currentEventId
      || event.expectedVersion !== beforeProjection.state.version
      || afterProjection.state.members[participantId]?.active !== false) {
      throw new Error('The accepted removal key boundary is invalid.');
    }
    const before = beforeProjection.state;
    const after = afterProjection.state;
    const binding = this.bindingForGroup(before.groupId);
    if (!binding) throw new Error('Choose a conversation for this group before sharing updates.');
    const oldKeyVersion = currentGroupKeyVersion(before);
    const nextKeyVersion = currentGroupKeyVersion(after);
    const sender = before.members[this.participantId];
    const nextSender = after.members[this.participantId];
    const removed = before.members[participantId];
    if (!sender || sender.active === false || sender.keyVersion !== oldKeyVersion || !sender.groupKeyEnvelopeId
      || !removed || removed.active === false || removed.keyVersion !== oldKeyVersion || !removed.groupKeyEnvelopeId
      || !normalizeAccount(removed.accountPublicKeyHex)) {
      throw new Error('Acknowledged old-key removal access is unavailable.');
    }
    if (!nextSender || nextSender.active === false || nextSender.keyVersion !== nextKeyVersion || !nextSender.groupKeyEnvelopeId) {
      throw new Error('Acknowledged next-key removal access is unavailable.');
    }
    const remaining = Object.values(after.members)
      .filter(member => member.active !== false && member.participantId !== this.participantId)
      .sort((left, right) => left.participantId.localeCompare(right.participantId));
    if (remaining.some(member => !normalizeAccount(member.accountPublicKeyHex)
      || member.keyVersion !== nextKeyVersion || !member.groupKeyEnvelopeId)) {
      throw new Error('Every remaining member must acknowledge the next group access.');
    }
    const [oldSenderRecord, nextSenderRecord] = await Promise.all([
      this.options.keyEnvelopes.findAcknowledged({
      groupId: before.groupId,
      participantId: this.participantId,
      recipientAccountPublicKeyHex: this.accountPublicKeyHex,
      keyVersion: oldKeyVersion,
      }),
      this.options.keyEnvelopes.findAcknowledged({
        groupId: after.groupId,
        participantId: this.participantId,
        recipientAccountPublicKeyHex: this.accountPublicKeyHex,
        keyVersion: nextKeyVersion,
      }),
    ]);
    if (!oldSenderRecord || oldSenderRecord.binding.groupKeyEnvelopeId !== sender.groupKeyEnvelopeId) {
      throw new Error('Acknowledged old-key removal access is unavailable.');
    }
    if (!nextSenderRecord || nextSenderRecord.binding.groupKeyEnvelopeId !== nextSender.groupKeyEnvelopeId) {
      throw new Error('Acknowledged next-key removal access is unavailable.');
    }
    const remainingIds = remaining.map(member => deliveryId(event.eventId, member.participantId));
    const removedId = `removal:${event.eventId}:recipient:${participantId}`;
    const allIds = [...remainingIds, removedId];
    const missingRemaining = remaining.filter((_, index) => !this.queue.hasPending(remainingIds[index]) && !this.queue.hasAcknowledged(remainingIds[index]));
    const missingRemoved = !this.queue.hasPending(removedId) && !this.queue.hasAcknowledged(removedId);
    if (missingRemaining.length === 0 && !missingRemoved) return allIds;
    let oldKey: Uint8Array | undefined;
    let nextKey: Uint8Array | undefined;
    try {
      // Open sequentially so a successful first plaintext can still be wiped
      // when the second account-bound open fails.
      oldKey = await this.options.keyEnvelopes.open(oldSenderRecord.binding);
      nextKey = await this.options.keyEnvelopes.open(nextSenderRecord.binding);
      const createdAt = canonicalTimestamp(this.now());
      const expiresAt = new Date(Date.parse(createdAt) + this.expiryMs()).toISOString();
      const envelopes: EncryptedDeliveryEnvelopeV1[] = [];
      for (const recipient of missingRemaining) {
        envelopes.push(await createEncryptedDeliveryEnvelope({
          envelopeId: deliveryId(event.eventId, recipient.participantId), channelId: binding.channelId,
          senderAccountPublicKeyHex: this.accountPublicKeyHex, recipientAccountPublicKeyHex: recipient.accountPublicKeyHex,
          keyVersion: nextKeyVersion, createdAt, expiresAt, deliveryKey: nextKey,
          payload: canonicalEventPayload(event), signer: this.options.signer,
        }));
      }
      if (missingRemoved) {
        envelopes.push(await createEncryptedDeliveryEnvelope({
          envelopeId: removedId, channelId: binding.channelId,
          senderAccountPublicKeyHex: this.accountPublicKeyHex, recipientAccountPublicKeyHex: removed.accountPublicKeyHex,
          keyVersion: oldKeyVersion, createdAt, expiresAt, deliveryKey: oldKey,
          payload: canonicalEventPayload(event), signer: this.options.signer,
        }));
      }
      this.queue.enqueueMany(envelopes.map(envelope => ({envelope, queuedAt: createdAt})));
      this.notify();
      return allIds;
    } finally {
      oldKey?.fill(0);
      nextKey?.fill(0);
    }
  }

  async flush(now = this.now()) {
    return this.queue.flush(async envelope => {
      const binding = this.bindingForChannel(envelope.channelId);
      if (!binding) throw new Error('The group conversation binding is unavailable.');
      await this.options.transport.sendEnvelope(binding.roomId, envelope);
    }, now);
  }

  async receiveEnvelope(input: {roomId: string; envelope: EncryptedDeliveryEnvelopeV1; receivedAt?: string}) {
    const roomId = required(input.roomId, 'Conversation is required.');
    const binding = this.bindingForChannel(input.envelope.channelId);
    if (!binding || binding.roomId !== roomId) throw new Error('This group update came from the wrong conversation.');
    const keyVersion = input.envelope.keyVersion;
    const record = await this.options.keyEnvelopes.findAcknowledged({
      groupId: binding.groupId,
      participantId: this.participantId,
      recipientAccountPublicKeyHex: this.accountPublicKeyHex,
      keyVersion,
    });
    if (!record) throw new Error('This account does not have access to this group update.');
    const current = await this.options.authority.readCanonicalGroup(binding.groupId);
    const currentMember = current?.members[this.participantId];
    const currentKeyVersion = current ? currentGroupKeyVersion(current) : null;
    const matchesCurrentAccess = Boolean(currentMember
      && currentMember.keyVersion === keyVersion
      && currentMember.groupKeyEnvelopeId === record.binding.groupKeyEnvelopeId);
    const matchesAcknowledgedNextAccess = Boolean(currentMember?.active !== false
      && currentKeyVersion !== null
      && keyVersion === currentKeyVersion + 1
      && record.binding.keyVersion === keyVersion);
    if (currentMember && (
      currentMember.accountPublicKeyHex !== this.accountPublicKeyHex
      || (!matchesCurrentAccess && !matchesAcknowledgedNextAccess)
    )) throw new Error('This group update does not match current account access.');
    const deliveryKey = await this.options.keyEnvelopes.open(record.binding);
    try {
      return await this.queue.receive({
        envelope: input.envelope,
        expectedRecipientAccountPublicKeyHex: this.accountPublicKeyHex,
        expectedChannelId: binding.channelId,
        expectedKeyVersion: keyVersion,
        deliveryKey,
        receivedAt: input.receivedAt ?? this.now(),
        signer: this.options.signer,
        verifier: this.options.verifier,
        apply: async payload => {
          if (currentMember?.active === false) {
            throw new Error('This account is no longer an active group member.');
          }
          if (payload.kind === 'chopdot.canonical-authority-history.v1') {
            if (!this.options.authority.importHistory || !Array.isArray(payload.body)) {
              throw new Error('Atomic group history import is unavailable.');
            }
            const events = payload.body.map(value => {
              const envelope = {v: 1, kind: 'chopdot-authority-event', event: value};
              assertCanonicalAuthorityEventEnvelope(envelope);
              return envelope.event;
            });
            if (events.length === 0 || events.some(event => event.groupId !== binding.groupId)) {
              throw new Error('Group history does not match its conversation binding.');
            }
            await this.options.authority.importHistory(events);
            return;
          }
          const authorityEnvelope = authorityEnvelopeFromPayload(payload);
          if (authorityEnvelope.event.groupId !== binding.groupId) throw new Error('Group update payload does not match its conversation binding.');
          if (normalizeAccount(authorityEnvelope.event.actorAccountPublicKeyHex) !== normalizeAccount(input.envelope.senderAccountPublicKeyHex)) {
            throw new Error('Group update sender does not match its signed event actor.');
          }
          await this.options.authority.accept(authorityEnvelope);
        },
      });
    } finally {
      deliveryKey.fill(0);
    }
  }

  async receiveAcknowledgement(roomIdValue: string, acknowledgement: EncryptedDeliveryAckV1) {
    const roomId = required(roomIdValue, 'Conversation is required.');
    const pending = this.queue.pending().find(item => item.envelope.envelopeId === acknowledgement.envelopeId);
    if (!pending) return this.queue.acknowledge(acknowledgement, this.options.verifier);
    const binding = this.bindingForChannel(pending.envelope.channelId);
    if (!binding || binding.roomId !== roomId) return 'rejected' as const;
    const outcome = await this.queue.acknowledge(acknowledgement, this.options.verifier);
    if (outcome !== 'rejected') this.notify();
    return outcome;
  }

  pendingDeliveryCount(): number {
    return this.queue.pending().length;
  }

  isDeliveryPending(envelopeId: string): boolean {
    return this.queue.pending().some(item => item.envelope.envelopeId === required(envelopeId, 'Delivery is required.'));
  }

  isDeliveryAcknowledged(envelopeId: string): boolean {
    return this.queue.hasAcknowledged(required(envelopeId, 'Delivery is required.'));
  }

  private bindingForChannel(channelId: string): CanonicalGroupRoomBindingV1 | null {
    return this.listBindings().find(binding => binding.channelId === channelId) ?? null;
  }

  private bindings(): Record<string, CanonicalGroupRoomBindingV1> {
    const raw = this.options.storage.read(this.bindingsKey);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!isRecord(parsed)) throw new Error('invalid');
      const result: Record<string, CanonicalGroupRoomBindingV1> = {};
      for (const [groupId, candidate] of Object.entries(parsed)) {
        const binding = canonicalBinding(candidate);
        if (binding.groupId !== groupId) throw new Error('invalid');
        result[groupId] = binding;
      }
      return result;
    } catch {
      throw new Error('Group conversation bindings are corrupt.');
    }
  }

  private writeBindings(value: Record<string, CanonicalGroupRoomBindingV1>): void {
    this.options.storage.write(this.bindingsKey, JSON.stringify(value));
  }

  private now(): string {
    return this.options.now?.() ?? new Date().toISOString();
  }

  private expiryMs(): number {
    const value = this.options.expiryMs ?? DEFAULT_EXPIRY_MS;
    if (!Number.isSafeInteger(value) || value < 1 || value > DEFAULT_EXPIRY_MS) throw new Error('Group update expiry is invalid.');
    return value;
  }

  private notify(): void { this.listeners.forEach(listener => listener()); }
}

export async function canonicalGroupChannelId(groupIdValue: string, roomIdValue: string): Promise<string> {
  const groupId = required(groupIdValue, 'Group is required.');
  const roomId = required(roomIdValue, 'Conversation is required.');
  const bytes = new TextEncoder().encode(JSON.stringify(['chopdot:canonical-group-room:v1', groupId, roomId]));
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return `sha256:${Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

function canonicalEventPayload(event: CanonicalEventV1): EncryptedDeliveryPayloadV1 {
  return {v: 1, kind: PAYLOAD_KIND, body: JSON.parse(JSON.stringify(event)) as DeliveryJson};
}

function authorityEnvelopeFromPayload(payload: EncryptedDeliveryPayloadV1): CanonicalAuthorityEventEnvelopeV1 {
  if (payload.kind !== PAYLOAD_KIND) throw new Error('Encrypted payload is not a canonical group update.');
  const envelope = {v: 1, kind: 'chopdot-authority-event', event: payload.body};
  assertCanonicalAuthorityEventEnvelope(envelope);
  return envelope;
}

function currentGroupKeyVersion(state: CanonicalGroupStateV1): number {
  const value = state.groupKeyVersion ?? state.members[state.organizerId]?.keyVersion;
  if (!Number.isSafeInteger(value) || Number(value) < 1) throw new Error('Current group key version is unavailable.');
  return Number(value);
}

function deliveryId(eventId: string, participantId: string): string {
  return `event:${required(eventId, 'Event identifier is required.')}:recipient:${required(participantId, 'Recipient is required.')}`;
}

function canonicalBinding(value: unknown): CanonicalGroupRoomBindingV1 {
  if (!isRecord(value) || value.v !== 1) throw new Error('invalid');
  const groupId = required(String(value.groupId ?? ''), 'Group is required.');
  const roomId = required(String(value.roomId ?? ''), 'Conversation is required.');
  const channelId = required(String(value.channelId ?? ''), 'Channel is required.');
  if (!/^sha256:[0-9a-f]{64}$/u.test(channelId)) throw new Error('invalid');
  return {v: 1, groupId, roomId, channelId, boundAt: canonicalTimestamp(String(value.boundAt ?? ''))};
}

function canonicalTimestamp(value: string): string {
  if (Number.isNaN(Date.parse(value))) throw new Error('Timestamp is invalid.');
  return new Date(value).toISOString();
}

function normalizeAccount(value: unknown): string {
  if (typeof value !== 'string') return '';
  const normalized = value.trim().toLowerCase();
  return /^0x[0-9a-f]{64}$/u.test(normalized) ? normalized : '';
}

function required(value: string, message: string): string {
  if (!value.trim()) throw new Error(message);
  return value.trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
