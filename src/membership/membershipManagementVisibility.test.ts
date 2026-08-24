import assert from 'node:assert/strict';
import test from 'node:test';
import type {CanonicalGroupStateV1} from '../core/moneyEventKernel.ts';
import {canManageCanonicalMembership, canonicalMembershipActionVisibility} from './membershipManagementVisibility.ts';

const minaKey = `0x${'11'.repeat(32)}`;
const leoKey = `0x${'22'.repeat(32)}`;
const state = {
  v: 1, groupId: 'g-circle', name: 'Circle', version: 2, currentEventId: 'member-added',
  organizerId: 'mina', groupKeyVersion: 1, expenses: {}, shares: {}, closed: null,
  successorRecords: [], eventIds: ['origin', 'member-added'],
  members: {
    mina: {participantId: 'mina', accountPublicKeyHex: minaKey, role: 'organizer', active: true},
    leo: {participantId: 'leo', accountPublicKeyHex: leoKey, role: 'member', active: true},
    nina: {participantId: 'nina', accountPublicKeyHex: `0x${'33'.repeat(32)}`, role: 'member', active: false},
  },
} satisfies CanonicalGroupStateV1;

test('only the active canonical organizer with the bound account sees membership management', () => {
  assert.equal(canManageCanonicalMembership({state, participantId: 'mina', accountPublicKeyHex: minaKey}), true);
  assert.equal(canManageCanonicalMembership({state, participantId: 'leo', accountPublicKeyHex: leoKey}), false);
  assert.equal(canManageCanonicalMembership({state, participantId: 'nina', accountPublicKeyHex: state.members.nina.accountPublicKeyHex}), false);
  assert.equal(canManageCanonicalMembership({state, participantId: 'mina', accountPublicKeyHex: leoKey}), false);
  assert.equal(canManageCanonicalMembership({state: null, participantId: 'mina', accountPublicKeyHex: minaKey}), false);
});

test('normal and named-mode membership actions stay hidden from members and removed accounts', () => {
  assert.deepEqual(canonicalMembershipActionVisibility({state, participantId: 'mina', accountPublicKeyHex: minaKey}), {
    normalGroupActions: true, namedModeManageMembers: true,
  });
  for (const participantId of ['leo', 'nina'] as const) {
    assert.deepEqual(canonicalMembershipActionVisibility({state, participantId, accountPublicKeyHex: state.members[participantId].accountPublicKeyHex}), {
      normalGroupActions: false, namedModeManageMembers: false,
    });
  }
});
