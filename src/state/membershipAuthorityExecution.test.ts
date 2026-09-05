import assert from 'node:assert/strict';
import test from 'node:test';
import type {AuthorityAppendResult} from '../core/authority/productionAuthority.ts';
import type {CanonicalEventV1, CanonicalGroupStateV1} from '../core/moneyEventKernel.ts';
import {createCleanState} from './store.ts';
import {executeMembershipAuthorityMutation, type MembershipAuthorityExecutionPort} from './membershipAuthorityExecution.ts';

const minaKey = `0x${'11'.repeat(32)}`;
const leoKey = `0x${'22'.repeat(32)}`;
const grant = {groupId: 'g-retry', participantId: 'leo', accountPublicKeyHex: leoKey, role: 'member' as const,
  acceptedAt: '2026-08-23T12:00:00.000Z', invitationId: 'invite-leo', keyVersion: 1, groupKeyEnvelopeId: 'leo-envelope'};
const origin = event('origin', 'GROUP_CREATED', 0, null);
const added = event('member-added', 'MEMBER_ADDED', 1, 'origin');
const before = canonical(false);
const after = canonical(true);

test('delivery failure after durable MEMBER_ADDED retries catch-up without appending a second add', async () => {
  let durable = before;
  let events = [origin];
  let appendCount = 0;
  let projected = 0;
  let deliveries = 0;
  let failDelivery = true;
  const authority: MembershipAuthorityExecutionPort = {
    async readCanonicalGroup() { return structuredClone(durable); },
    async readAcceptedEvents() { return structuredClone(events); },
    async importRecoveredEvents(base) { return {state: structuredClone(base), canonicalState: structuredClone(durable)}; },
    async appendMembership(base) {
      appendCount += 1;
      durable = after;
      events = [origin, added];
      return {state: structuredClone(base), event: added, canonicalState: after, stateHash: 'state', frontierHash: 'frontier'} satisfies AuthorityAppendResult;
    },
  };
  const run = () => executeMembershipAuthorityMutation({
    authority, base: createCleanState(), command: {groupId: grant.groupId, type: 'add', grant},
    onDurable: () => { projected += 1; },
    deliverJoin: async accepted => { deliveries += 1; assert.deepEqual(accepted.map(value => value.eventId), ['origin', 'member-added']); if (failDelivery) throw new Error('carrier unavailable'); },
    deliverRemoval: async () => { throw new Error('not removal'); },
    deliverOther: async () => { throw new Error('not other'); },
  });

  await assert.rejects(run(), /carrier unavailable/u);
  assert.equal(appendCount, 1);
  assert.equal(projected, 1, 'durable membership is projected before delivery fails');
  assert.equal(events.filter(value => value.eventType === 'MEMBER_ADDED').length, 1);
  failDelivery = false;
  assert.equal((await run()).members.leo.active, true);
  assert.equal(appendCount, 1, 'retry reuses the accepted frontier');
  assert.equal(deliveries, 2, 'retry requeues the complete signed history');
  assert.equal(events.filter(value => value.eventType === 'MEMBER_ADDED').length, 1);
});

function canonical(withLeo: boolean): CanonicalGroupStateV1 {
  return {v: 1, groupId: 'g-retry', name: 'Retry', version: withLeo ? 2 : 1,
    currentEventId: withLeo ? 'member-added' : 'origin', organizerId: 'mina', groupKeyVersion: 1,
    members: {
      mina: {participantId: 'mina', accountPublicKeyHex: minaKey, role: 'organizer', active: true, acceptedAt: grant.acceptedAt, invitationId: 'origin-mina', keyVersion: 1, groupKeyEnvelopeId: 'mina-envelope'},
      ...(withLeo ? {leo: {participantId: 'leo', accountPublicKeyHex: leoKey, role: 'member' as const, active: true, acceptedAt: grant.acceptedAt, invitationId: grant.invitationId, keyVersion: 1, groupKeyEnvelopeId: grant.groupKeyEnvelopeId}} : {}),
    }, expenses: {}, shares: {}, closed: null, successorRecords: [], eventIds: withLeo ? ['origin', 'member-added'] : ['origin']};
}

function event(eventId: string, eventType: CanonicalEventV1['eventType'], expectedVersion: number, parentEventId: string | null): CanonicalEventV1 {
  return {v: 1, eventId, commandId: `command-${eventId}`, groupId: 'g-retry', eventType, expectedVersion, parentEventId,
    actorId: 'mina', actorAccountPublicKeyHex: minaKey, actorRole: 'organizer', occurredAt: grant.acceptedAt,
    acceptedAt: grant.acceptedAt, eventVersion: 1, keyVersion: 1, visibility: 'group_encrypted', payloadHash: `0x${'bb'.repeat(32)}`,
    payload: eventType === 'MEMBER_ADDED' ? {member: afterMember()} : {name: 'Retry', organizerId: 'mina', members: [{participantId: 'mina', accountPublicKeyHex: minaKey, role: 'organizer', active: true, acceptedAt: grant.acceptedAt, invitationId: 'origin-mina', keyVersion: 1, groupKeyEnvelopeId: 'mina-envelope'}]}, signatureHex: `0x${'aa'.repeat(64)}`};
}

function afterMember() { return {participantId: grant.participantId, accountPublicKeyHex: grant.accountPublicKeyHex, role: grant.role, active: true, acceptedAt: grant.acceptedAt, invitationId: grant.invitationId, keyVersion: 1, groupKeyEnvelopeId: grant.groupKeyEnvelopeId}; }
