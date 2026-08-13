import type {KeyValueStorage} from '../environment/livePayerSync.ts';
import type {AccountMessageVerifier} from './groupKeyHandoff.ts';
import {
  applySignedMembershipEvent,
  assertSignedMembershipEvent,
  membershipEventFingerprint,
  type SignedMembershipEventV1,
  type SignedMembershipState,
  type SignedMembershipTransition,
} from './signedMembershipEvents.ts';

const JOURNAL_KEY = 'chopdot-signed-membership-events-v1';

export interface MembershipReplayResult {
  state: SignedMembershipState;
  deferred: SignedMembershipEventV1[];
  rejected: Array<{event: SignedMembershipEventV1; reason: string}>;
}

/**
 * Durable append-only storage for signed membership events. The journal never
 * grants membership itself; the verified reducer remains the only authority.
 */
export class SignedMembershipEventJournal {
  constructor(
    private readonly storage: KeyValueStorage,
    private readonly storageKey = JOURNAL_KEY,
  ) {}

  async accept(
    current: SignedMembershipState,
    event: SignedMembershipEventV1,
    verifier?: AccountMessageVerifier,
  ): Promise<SignedMembershipTransition> {
    const existing = this.list().find(candidate => candidate.eventId === event.eventId);
    if (existing && membershipEventFingerprint(existing) !== membershipEventFingerprint(event)) {
      return {state: current, outcome: 'rejected', reason: 'Membership action identifier is already in use.'};
    }
    const transition = await applySignedMembershipEvent(current, event, verifier);
    if (transition.outcome === 'rejected') return transition;
    if (!existing && transition.outcome !== 'idempotent') this.append(event);
    return transition;
  }

  list(): SignedMembershipEventV1[] {
    const stored = this.storage.read(this.storageKey);
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored) as unknown;
      if (!Array.isArray(parsed)) return [];
      const firstById = new Map<string, SignedMembershipEventV1>();
      for (const candidate of parsed) {
        try {
          assertSignedMembershipEvent(candidate);
          if (!firstById.has(candidate.eventId)) firstById.set(candidate.eventId, candidate);
        } catch {
          // A corrupt sibling cannot erase valid journal entries.
        }
      }
      return Array.from(firstById.values());
    } catch {
      return [];
    }
  }

  clear(): void {
    this.storage.remove(this.storageKey);
  }

  private append(event: SignedMembershipEventV1): void {
    assertSignedMembershipEvent(event);
    const items = [...this.list(), event];
    this.storage.write(this.storageKey, JSON.stringify(items));
    const persisted = this.list().find(candidate => candidate.eventId === event.eventId);
    if (!persisted || membershipEventFingerprint(persisted) !== membershipEventFingerprint(event)) {
      throw new Error('Membership action could not be persisted.');
    }
  }
}

export async function replaySignedMembershipJournal(
  initial: SignedMembershipState,
  journal: SignedMembershipEventJournal,
  verifier?: AccountMessageVerifier,
): Promise<MembershipReplayResult> {
  let state = initial;
  let pending = journal.list().sort((left, right) =>
    left.occurredAt.localeCompare(right.occurredAt) || left.eventId.localeCompare(right.eventId));
  const rejected: MembershipReplayResult['rejected'] = [];

  while (pending.length > 0) {
    const next: SignedMembershipEventV1[] = [];
    let progressed = false;
    for (const event of pending) {
      const transition = await applySignedMembershipEvent(state, event, verifier);
      if (transition.outcome === 'deferred') {
        next.push(event);
        continue;
      }
      if (transition.outcome === 'rejected') {
        rejected.push({event, reason: transition.reason ?? 'Membership action was rejected.'});
        continue;
      }
      state = transition.state;
      progressed = true;
    }
    if (!progressed) return {state, deferred: next, rejected};
    pending = next;
  }
  return {state, deferred: [], rejected};
}
