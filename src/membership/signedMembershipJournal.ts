import type {KeyValueStorage} from '../environment/livePayerSync.ts';
import type {AccountMessageVerifier} from './groupKeyHandoff.ts';
import {
  applySignedMembershipEvent,
  assertSignedMembershipEvent,
  membershipEventFingerprint,
  membershipEventGroupId,
  type SignedMembershipEventV1,
  type MembershipKeyEnvelopeResolver,
  type SignedMembershipState,
  type SignedMembershipTransition,
} from './signedMembershipEvents.ts';

const JOURNAL_KEY = 'chopdot-signed-membership-events-v1';

export interface MembershipReplayResult {
  state: SignedMembershipState;
  deferred: SignedMembershipEventV1[];
  rejected: Array<{event: SignedMembershipEventV1; reason: string}>;
  conflicts: Array<{event: SignedMembershipEventV1; reason: string}>;
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
    keyEnvelopes?: MembershipKeyEnvelopeResolver,
  ): Promise<SignedMembershipTransition> {
    const existing = this.list().find(candidate => candidate.eventId === event.eventId);
    if (existing && membershipEventFingerprint(existing) !== membershipEventFingerprint(event)) {
      return {state: current, outcome: 'rejected', reason: 'Membership action identifier is already in use.'};
    }
    const transition = await applySignedMembershipEvent(current, event, verifier, keyEnvelopes);
    if (transition.outcome === 'rejected') return transition;
    if (!existing && transition.outcome !== 'idempotent') this.append(event);
    return transition;
  }

  list(): SignedMembershipEventV1[] {
    const stored = this.storage.read(this.storageKey);
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored) as unknown;
      if (!Array.isArray(parsed)) throw new Error('Membership journal is not an array.');
      const firstById = new Map<string, SignedMembershipEventV1>();
      for (const candidate of parsed) {
        assertSignedMembershipEvent(candidate);
        const existing = firstById.get(candidate.eventId);
        if (existing && membershipEventFingerprint(existing) !== membershipEventFingerprint(candidate)) {
          throw new Error('Membership journal contains a conflicting event identifier.');
        }
        if (!existing) firstById.set(candidate.eventId, candidate);
      }
      return Array.from(firstById.values());
    } catch {
      throw new Error('Membership journal is corrupt.');
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
  keyEnvelopes?: MembershipKeyEnvelopeResolver,
): Promise<MembershipReplayResult> {
  let state = initial;
  const listed = journal.list();
  const rejected: MembershipReplayResult['rejected'] = [];
  const conflicts: MembershipReplayResult['conflicts'] = [];

  // Migration is intentionally one-way per group. A journal may begin with a
  // legacy (non-causal) prefix, but the first causal event closes that prefix
  // forever. Replaying the prefix in persisted acceptance order preserves the
  // exact live state that the first causal frontier was built against.
  const firstCausalIndexByGroup = new Map<string, number>();
  listed.forEach((event, index) => {
    if (!event.causal || firstCausalIndexByGroup.has(event.causal.groupId)) return;
    firstCausalIndexByGroup.set(event.causal.groupId, index);
  });
  const invitationGroups = membershipInvitationGroups(listed);
  let legacyPending = listed
    .map((event, index) => ({event, index}))
    .filter(item => !item.event.causal);

  while (legacyPending.length > 0) {
    const next: typeof legacyPending = [];
    let progressed = false;
    for (const item of legacyPending) {
      const groupId = journalEventGroupId(item.event, state, invitationGroups);
      const boundary = groupId ? firstCausalIndexByGroup.get(groupId) : undefined;
      if (boundary !== undefined && item.index >= boundary) {
        rejected.push({event: item.event, reason: 'Legacy membership action arrived after the causal migration frontier.'});
        continue;
      }
      const transition = await applySignedMembershipEvent(state, item.event, verifier, keyEnvelopes);
      if (transition.outcome === 'deferred') {
        next.push(item);
        continue;
      }
      if (transition.outcome === 'rejected') {
        rejected.push({event: item.event, reason: transition.reason ?? 'Membership action was rejected.'});
        continue;
      }
      if (transition.outcome === 'conflict') {
        conflicts.push({event: item.event, reason: transition.reason ?? 'Membership action conflicts with the accepted group frontier.'});
        continue;
      }
      state = transition.state;
      progressed = true;
    }
    legacyPending = next;
    if (!progressed) break;
  }

  let pending = listed.filter(event => Boolean(event.causal)).sort(replayOrder);

  while (pending.length > 0) {
    const next: SignedMembershipEventV1[] = [];
    let progressed = false;
    const readyByGroup = new Map<string, SignedMembershipEventV1[]>();
    for (const event of pending) {
      if (!event.causal) continue;
      const frontier = state.groupFrontiers[event.causal.groupId]
        ?? {version: 0, lastEventId: null, frontierHash: `0x${'00'.repeat(32)}`};
      const exact = event.causal.expectedVersion === frontier.version
        && event.causal.parentEventId === frontier.lastEventId
        && event.causal.expectedFrontierHash === frontier.frontierHash;
      if (exact) {
        const candidates = readyByGroup.get(event.causal.groupId) ?? [];
        candidates.push(event);
        readyByGroup.set(event.causal.groupId, candidates);
      } else if (event.causal.expectedVersion > frontier.version) {
        next.push(event);
      } else {
        conflicts.push({event, reason: 'Membership action conflicts with the accepted group frontier.'});
      }
    }

    for (const groupId of [...readyByGroup.keys()].sort()) {
      const candidates = (readyByGroup.get(groupId) ?? []).sort((a, b) => a.eventId.localeCompare(b.eventId));
      const valid: Array<{event: SignedMembershipEventV1; transition: SignedMembershipTransition}> = [];
      for (const event of candidates) {
        const transition = await applySignedMembershipEvent(state, event, verifier, keyEnvelopes);
        if (transition.outcome === 'applied') valid.push({event, transition});
        else if (transition.outcome === 'rejected') {
          rejected.push({event, reason: transition.reason ?? 'Membership action was rejected.'});
        } else if (transition.outcome === 'deferred') next.push(event);
        else if (transition.outcome === 'conflict') {
          conflicts.push({event, reason: transition.reason ?? 'Membership action conflicts with the accepted group frontier.'});
        }
      }
      const winner = valid[0];
      if (winner) {
        state = winner.transition.state;
        progressed = true;
        for (const losing of valid.slice(1)) {
          conflicts.push({event: losing.event, reason: `Concurrent membership action lost to ${winner.event.eventId}.`});
        }
      }
    }

    if (!progressed) {
      return {
        state,
        deferred: [...next, ...remainingLegacy(legacyPending, state, invitationGroups, rejected)].sort(replayOrder),
        rejected,
        conflicts,
      };
    }
    pending = next.sort(replayOrder);
  }
  return {
    state,
    deferred: remainingLegacy(legacyPending, state, invitationGroups, rejected).sort(replayOrder),
    rejected,
    conflicts,
  };
}

function membershipInvitationGroups(events: SignedMembershipEventV1[]): Map<string, string> {
  const groups = new Map<string, string>();
  for (const event of events) {
    switch (event.event.type) {
      case 'INVITATION_CREATED':
        groups.set(event.event.invitation.invitationId, event.event.invitation.groupId);
        break;
      case 'INVITATION_ACCEPTED':
        groups.set(event.event.acceptance.invitationId, event.event.acceptance.groupId);
        break;
      case 'MEMBERSHIP_GRANTED':
        groups.set(event.event.handoff.invitationId, event.event.handoff.groupId);
        break;
      default:
        break;
    }
  }
  return groups;
}

function journalEventGroupId(
  event: SignedMembershipEventV1,
  state: SignedMembershipState,
  invitationGroups: Map<string, string>,
): string {
  const direct = membershipEventGroupId(event.event, state).trim();
  if (direct) return direct;
  if (event.event.type === 'INVITATION_DECLINED' || event.event.type === 'INVITATION_REVOKED') {
    return invitationGroups.get(event.event.invitationId)?.trim() ?? '';
  }
  return '';
}

function remainingLegacy(
  pending: Array<{event: SignedMembershipEventV1; index: number}>,
  state: SignedMembershipState,
  invitationGroups: Map<string, string>,
  rejected: MembershipReplayResult['rejected'],
): SignedMembershipEventV1[] {
  const deferred: SignedMembershipEventV1[] = [];
  for (const item of pending) {
    const groupId = journalEventGroupId(item.event, state, invitationGroups);
    if (groupId && (state.groupFrontiers[groupId]?.version ?? 0) > 0) {
      rejected.push({event: item.event, reason: 'Legacy membership action cannot be admitted after a causal frontier.'});
    } else {
      deferred.push(item.event);
    }
  }
  return deferred;
}

function replayOrder(left: SignedMembershipEventV1, right: SignedMembershipEventV1): number {
  if (left.causal && right.causal) {
    return left.causal.groupId.localeCompare(right.causal.groupId)
      || left.causal.expectedVersion - right.causal.expectedVersion
      || (left.causal.parentEventId ?? '').localeCompare(right.causal.parentEventId ?? '')
      || left.eventId.localeCompare(right.eventId);
  }
  if (left.causal) return -1;
  if (right.causal) return 1;
  return left.occurredAt.localeCompare(right.occurredAt) || left.eventId.localeCompare(right.eventId);
}
