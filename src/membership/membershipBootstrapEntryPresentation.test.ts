import assert from 'node:assert/strict';
import test from 'node:test';
import type {GroupInvitation} from './membershipLifecycle.ts';
import {
  resolveMembershipBootstrapEntry,
  verifiedInvitationDisplay,
} from './membershipBootstrapEntryPresentation.ts';
import type {RecipientBoundBootstrapV1} from './recipientBoundBootstrap.ts';

test('invitation display makes no unverified identity or roster claim and exposes no internal language', () => {
  const invitation = {
    invitationId: 'invite-recipient-7',
    groupId: 'group-42',
    inviterId: 'organizer-9',
    inviteeId: 'recipient-7',
    inviteeAccountPublicKeyHex: `0x${'11'.repeat(32)}`,
    role: 'member',
    route: 'join_link',
    status: 'invited',
    createdAt: '2026-08-12T12:00:00.000Z',
    expiresAt: '2026-08-13T12:00:00.000Z',
  } satisfies GroupInvitation;

  assert.deepEqual(verifiedInvitationDisplay(invitation), {
    groupName: 'this group',
    inviterName: 'the organizer',
    friendName: 'You',
    groupContext: 'Review the invitation and choose whether you want to take part.',
  });
});

test('entry dependency failure becomes invalid instead of an endless checking state', async () => {
  const result = await resolveMembershipBootstrapEntry({
    async restore() { throw new Error('provider unavailable'); },
    async enter() { throw new Error('must not run'); },
  }, {} as RecipientBoundBootstrapV1);
  assert.deepEqual(result, {status: 'invalid'});
});
