import type {KeyValueStorage} from '../environment/livePayerSync.ts';
import {
  assertSignedMembershipEvent,
  membershipEventFingerprint,
  type SignedMembershipEventV1,
} from './signedMembershipEvents.ts';

const OUTBOX_KEY = 'chopdot-membership-delivery-outbox-v1';

export type MembershipDeliveryTarget = {
  kind: 'chat_room';
  roomId: string;
};

export interface PendingMembershipDelivery {
  deliveryId: string;
  target: MembershipDeliveryTarget;
  event: SignedMembershipEventV1;
  queuedAt: string;
}

export class MembershipDeliveryOutbox {
  constructor(
    private readonly storage: KeyValueStorage,
    private readonly storageKey = OUTBOX_KEY,
  ) {}

  enqueue(input: {
    target: MembershipDeliveryTarget;
    event: SignedMembershipEventV1;
    queuedAt?: string;
  }): PendingMembershipDelivery {
    assertSignedMembershipEvent(input.event);
    const target = canonicalTarget(input.target);
    const deliveryId = `${target.kind}:${target.roomId}:${input.event.eventId}`;
    const items = this.list();
    const existing = items.find(item => item.deliveryId === deliveryId);
    if (existing) {
      if (membershipEventFingerprint(existing.event) !== membershipEventFingerprint(input.event)) {
        throw new Error('Invitation delivery identifier already belongs to another action.');
      }
      return existing;
    }
    const pending: PendingMembershipDelivery = {
      deliveryId,
      target,
      event: input.event,
      queuedAt: input.queuedAt ?? new Date().toISOString(),
    };
    if (!isPendingMembershipDelivery(pending)) throw new Error('Invitation could not be queued.');
    items.push(pending);
    this.writeAll(items);
    const persisted = this.list().find(item => item.deliveryId === deliveryId);
    if (!persisted) throw new Error('Invitation could not be queued.');
    return persisted;
  }

  list(): PendingMembershipDelivery[] {
    const stored = this.storage.read(this.storageKey);
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored) as unknown;
      if (!Array.isArray(parsed)) return [];
      const firstById = new Map<string, PendingMembershipDelivery>();
      for (const candidate of parsed) {
        if (isPendingMembershipDelivery(candidate) && !firstById.has(candidate.deliveryId)) {
          firstById.set(candidate.deliveryId, candidate);
        }
      }
      return Array.from(firstById.values());
    } catch {
      return [];
    }
  }

  async flush(
    deliver: (item: PendingMembershipDelivery) => Promise<boolean>,
  ): Promise<{delivered: string[]; pending: string[]}> {
    const snapshot = this.list();
    const delivered = new Set<string>();
    for (const item of snapshot) {
      try {
        if (await deliver(item)) delivered.add(item.deliveryId);
      } catch {
        // Retry truth remains in the outbox.
      }
    }
    const retained = this.list().filter(item => !delivered.has(item.deliveryId));
    this.writeAll(retained);
    return {
      delivered: Array.from(delivered),
      pending: retained.map(item => item.deliveryId),
    };
  }

  clear(): void {
    this.storage.remove(this.storageKey);
  }

  private writeAll(items: PendingMembershipDelivery[]): void {
    if (items.length === 0) {
      this.storage.remove(this.storageKey);
      return;
    }
    this.storage.write(this.storageKey, JSON.stringify(items));
  }
}

function canonicalTarget(target: MembershipDeliveryTarget): MembershipDeliveryTarget {
  if (target.kind !== 'chat_room' || !target.roomId.trim()) throw new Error('Choose a conversation first.');
  return {kind: 'chat_room', roomId: target.roomId.trim()};
}

function isPendingMembershipDelivery(value: unknown): value is PendingMembershipDelivery {
  if (!isRecord(value) || !isRecord(value.target)) return false;
  try {
    const target = canonicalTarget(value.target as MembershipDeliveryTarget);
    assertSignedMembershipEvent(value.event);
    return typeof value.deliveryId === 'string'
      && value.deliveryId === `${target.kind}:${target.roomId}:${value.event.eventId}`
      && typeof value.queuedAt === 'string'
      && !Number.isNaN(Date.parse(value.queuedAt));
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
