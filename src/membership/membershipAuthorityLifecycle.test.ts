import assert from 'node:assert/strict';
import test from 'node:test';
import {cryptoWaitReady, sr25519PairFromSeed, sr25519Sign} from '@polkadot/util-crypto';
import type {KeyValueStorage} from '../environment/livePayerSync.ts';
import {
  createGroupKeyHandoff,
  createMembershipAcceptance,
  verifyProductAccountSignature,
  type AccountMessageSigner,
} from './groupKeyHandoff.ts';
import type {MembershipGrant} from './membershipLifecycle.ts';
import {
  applySignedMembershipEvent as applySignedMembershipEventBase,
  createCausalSignedMembershipEvent,
  createSignedMembershipEvent,
  createSignedMembershipState,
  type MembershipEventV1,
  type MembershipKeyEnvelopeBindingV1,
  type SignedMembershipState,
} from './signedMembershipEvents.ts';
import {replaySignedMembershipJournal, SignedMembershipEventJournal} from './signedMembershipJournal.ts';

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  read(key: string) { return this.values.get(key) ?? null; }
  write(key: string, value: string) { this.values.set(key, value); }
  remove(key: string) { this.values.delete(key); }
}

const groupId = 'zurich-dinner';
const minaId = 'mina';
const leoId = 'leo';
const ninaId = 'nina';
const at = '2026-08-23T12:00:00.000Z';

let minaPair: ReturnType<typeof sr25519PairFromSeed>;
let leoPair: ReturnType<typeof sr25519PairFromSeed>;
let ninaPair: ReturnType<typeof sr25519PairFromSeed>;
let recoveredLeoPair: ReturnType<typeof sr25519PairFromSeed>;

const testKeyEnvelopes = {resolve: async () => true};
const applySignedMembershipEvent = (
  state: SignedMembershipState,
  event: Parameters<typeof applySignedMembershipEventBase>[1],
) => applySignedMembershipEventBase(state, event, undefined, testKeyEnvelopes);

test.before(async () => {
  await cryptoWaitReady();
  minaPair = sr25519PairFromSeed(new Uint8Array(32).fill(11));
  leoPair = sr25519PairFromSeed(new Uint8Array(32).fill(22));
  ninaPair = sr25519PairFromSeed(new Uint8Array(32).fill(33));
  recoveredLeoPair = sr25519PairFromSeed(new Uint8Array(32).fill(44));
});

function account(pair: ReturnType<typeof sr25519PairFromSeed>): string {
  return `0x${Buffer.from(pair.publicKey).toString('hex')}`;
}

function signer(pair: ReturnType<typeof sr25519PairFromSeed>): AccountMessageSigner {
  return {signBytes: async bytes => sr25519Sign(bytes, pair)};
}

function grant(participantId: string, pair: ReturnType<typeof sr25519PairFromSeed>, role: 'organizer' | 'member'): MembershipGrant {
  return {
    groupId,
    participantId,
    accountPublicKeyHex: account(pair),
    role,
    acceptedAt: '2026-08-22T12:00:00.000Z',
    invitationId: `accepted-${participantId}`,
    keyVersion: 1,
    groupKeyEnvelopeId: `envelope-${participantId}-v1`,
  };
}

function initial(): SignedMembershipState {
  return createSignedMembershipState([
    grant(minaId, minaPair, 'organizer'),
    grant(leoId, leoPair, 'member'),
    grant(ninaId, ninaPair, 'member'),
  ]);
}

async function signed(input: {
  eventId: string;
  actorId: string;
  pair: ReturnType<typeof sr25519PairFromSeed>;
  event: MembershipEventV1;
  occurredAt?: string;
  state?: SignedMembershipState;
}) {
  const create = input.state ? createCausalSignedMembershipEvent.bind(null, input.state) : createSignedMembershipEvent;
  return create({
    eventId: input.eventId,
    actorId: input.actorId,
    actorAccountPublicKeyHex: account(input.pair),
    occurredAt: input.occurredAt ?? at,
    event: input.event,
    signer: signer(input.pair),
  });
}

function binding(
  participantId: string,
  pair: ReturnType<typeof sr25519PairFromSeed>,
  keyVersion: number,
  groupKeyEnvelopeId = `${participantId}-v${keyVersion}`,
): MembershipKeyEnvelopeBindingV1 {
  return {participantId, recipientAccountPublicKeyHex: account(pair), keyVersion, groupKeyEnvelopeId};
}

test('a member cannot remove another member even with a valid account signature', async () => {
  const before = initial();
  const event = await signed({
    eventId: 'remove-nina-by-leo', actorId: leoId, pair: leoPair,
    state: before,
    event: {
      type: 'MEMBERSHIP_REMOVED', groupId, participantId: ninaId, nextKeyVersion: 2,
      groupKeyEnvelopes: {mina: binding('mina', minaPair, 2), leo: binding('leo', leoPair, 2)},
    },
  });
  const result = await applySignedMembershipEvent(before, event);
  assert.equal(result.outcome, 'rejected');
  assert.equal(result.state, before);
});

test('role transfer is organizer-signed and atomically rotates every current member envelope', async () => {
  const before = initial();
  const event = await signed({
    eventId: 'transfer-organizer', actorId: minaId, pair: minaPair,
    state: before,
    event: {
      type: 'MEMBERSHIP_ROLES_CHANGED', groupId,
      roles: {mina: 'member', leo: 'organizer', nina: 'member'},
      nextKeyVersion: 2,
      groupKeyEnvelopes: {
        mina: binding('mina', minaPair, 2), leo: binding('leo', leoPair, 2), nina: binding('nina', ninaPair, 2),
      },
    },
  });
  const result = await applySignedMembershipEvent(before, event);
  assert.equal(result.outcome, 'applied');
  assert.equal(result.state.lifecycle.memberships[`${groupId}:mina`].role, 'member');
  assert.equal(result.state.lifecycle.memberships[`${groupId}:leo`].role, 'organizer');
  for (const membership of Object.values(result.state.lifecycle.memberships)) {
    assert.equal(membership.keyVersion, 2);
    assert.equal(membership.groupKeyEnvelopeId, `${membership.participantId}-v2`);
  }
});

test('the transferred organizer can rotate future access and the former organizer cannot', async () => {
  const before = initial();
  const transfer = await signed({
    eventId: 'transfer-first', actorId: minaId, pair: minaPair,
    state: before,
    event: {
      type: 'MEMBERSHIP_ROLES_CHANGED', groupId,
      roles: {mina: 'member', leo: 'organizer', nina: 'member'},
      nextKeyVersion: 2,
      groupKeyEnvelopes: {
        mina: binding('mina', minaPair, 2), leo: binding('leo', leoPair, 2), nina: binding('nina', ninaPair, 2),
      },
    },
  });
  const transferred = await applySignedMembershipEvent(before, transfer);
  const oldOrganizerRotation = await signed({
    eventId: 'old-organizer-rotate', actorId: minaId, pair: minaPair,
    state: transferred.state,
    event: {
      type: 'GROUP_KEY_ROTATED', groupId, nextKeyVersion: 3,
      groupKeyEnvelopes: {
        mina: binding('mina', minaPair, 3), leo: binding('leo', leoPair, 3), nina: binding('nina', ninaPair, 3),
      },
    },
  });
  assert.equal((await applySignedMembershipEvent(transferred.state, oldOrganizerRotation)).outcome, 'rejected');

  const newOrganizerRotation = await signed({
    eventId: 'new-organizer-rotate', actorId: leoId, pair: leoPair,
    state: transferred.state,
    event: {
      type: 'GROUP_KEY_ROTATED', groupId, nextKeyVersion: 3,
      groupKeyEnvelopes: {
        mina: binding('mina', minaPair, 3), leo: binding('leo', leoPair, 3), nina: binding('nina', ninaPair, 3),
      },
    },
  });
  const rotated = await applySignedMembershipEvent(transferred.state, newOrganizerRotation);
  assert.equal(rotated.outcome, 'applied');
  assert.deepEqual(
    Object.values(rotated.state.lifecycle.memberships).map(member => member.keyVersion),
    [3, 3, 3],
  );
});

test('concurrent rotate versus role transfer replays to one deterministic frontier in either arrival order', async () => {
  const before = initial();
  const transfer = await signed({
    eventId: 'a-transfer', actorId: minaId, pair: minaPair, state: before,
    event: {
      type: 'MEMBERSHIP_ROLES_CHANGED', groupId,
      roles: {mina: 'member', leo: 'organizer', nina: 'member'}, nextKeyVersion: 2,
      groupKeyEnvelopes: {
        mina: binding('mina', minaPair, 2), leo: binding('leo', leoPair, 2), nina: binding('nina', ninaPair, 2),
      },
    },
  });
  const rotate = await signed({
    eventId: 'b-rotate', actorId: minaId, pair: minaPair, state: before,
    event: {
      type: 'GROUP_KEY_ROTATED', groupId, nextKeyVersion: 2,
      groupKeyEnvelopes: {
        mina: binding('mina', minaPair, 2), leo: binding('leo', leoPair, 2), nina: binding('nina', ninaPair, 2),
      },
    },
  });
  const replay = async (events: typeof transfer[]) => {
    const journal = new SignedMembershipEventJournal(new MemoryStorage());
    let incremental = before;
    for (const event of events) {
      const accepted = await journal.accept(incremental, event, undefined, testKeyEnvelopes);
      if (accepted.outcome === 'applied') incremental = accepted.state;
    }
    return replaySignedMembershipJournal(initial(), journal, undefined, testKeyEnvelopes);
  };
  const first = await replay([rotate, transfer]);
  const second = await replay([transfer, rotate]);
  assert.deepEqual(first.state, second.state);
  assert.equal(first.state.lifecycle.memberships[`${groupId}:leo`].role, 'organizer');
  assert.equal(first.state.groupFrontiers[groupId].version, 1);
  assert.deepEqual(first.conflicts.map(item => item.event.eventId), ['b-rotate']);
  assert.deepEqual(second.conflicts.map(item => item.event.eventId), ['b-rotate']);
  const minaIntervals = first.state.authorityIntervals.filter(interval => interval.participantId === minaId);
  assert.deepEqual(minaIntervals.map(interval => [interval.role, interval.effectiveFromVersion, interval.effectiveUntilVersion]), [
    ['organizer', 0, 1], ['member', 1, null],
  ]);
});

test('occurredAt cannot backdate former-organizer authority after the accepted transfer frontier', async () => {
  const before = initial();
  const transfer = await signed({
    eventId: 'transfer-authority', actorId: minaId, pair: minaPair, state: before,
    event: {
      type: 'MEMBERSHIP_ROLES_CHANGED', groupId,
      roles: {mina: 'member', leo: 'organizer', nina: 'member'}, nextKeyVersion: 2,
      groupKeyEnvelopes: {
        mina: binding('mina', minaPair, 2), leo: binding('leo', leoPair, 2), nina: binding('nina', ninaPair, 2),
      },
    },
  });
  const transferred = await applySignedMembershipEvent(before, transfer);
  assert.equal(transferred.outcome, 'applied');
  const backdated = await signed({
    eventId: 'backdated-old-organizer', actorId: minaId, pair: minaPair, state: transferred.state,
    occurredAt: '2026-08-22T00:00:00.000Z',
    event: {
      type: 'GROUP_KEY_ROTATED', groupId, nextKeyVersion: 3,
      groupKeyEnvelopes: {
        mina: binding('mina', minaPair, 3), leo: binding('leo', leoPair, 3), nina: binding('nina', ninaPair, 3),
      },
    },
  });
  const result = await applySignedMembershipEvent(transferred.state, backdated);
  assert.equal(result.outcome, 'rejected');
  assert.match(result.reason ?? '', /current organizer/u);
  assert.equal(result.state.groupFrontiers[groupId].lastEventId, 'transfer-authority');
});

test('removal excludes the removed member from the required future key envelopes', async () => {
  const before = initial();
  const event = await signed({
    eventId: 'remove-nina', actorId: minaId, pair: minaPair,
    state: before,
    event: {
      type: 'MEMBERSHIP_REMOVED', groupId, participantId: ninaId, nextKeyVersion: 2,
      groupKeyEnvelopes: {mina: binding('mina', minaPair, 2), leo: binding('leo', leoPair, 2)},
    },
  });
  const removed = await applySignedMembershipEvent(before, event);
  assert.equal(removed.outcome, 'applied');
  assert.equal(removed.state.lifecycle.memberships[`${groupId}:nina`], undefined);
  assert.equal(removed.state.lifecycle.memberships[`${groupId}:mina`].keyVersion, 2);
  assert.equal(removed.state.lifecycle.memberships[`${groupId}:leo`].keyVersion, 2);

  const leakingEnvelope = await signed({
    eventId: 'remove-nina-with-envelope', actorId: minaId, pair: minaPair,
    state: before,
    event: {
      type: 'MEMBERSHIP_REMOVED', groupId, participantId: ninaId, nextKeyVersion: 2,
      groupKeyEnvelopes: {
        mina: binding('mina', minaPair, 2), leo: binding('leo', leoPair, 2), nina: binding('nina', ninaPair, 2),
      },
    },
  });
  assert.equal((await applySignedMembershipEvent(before, leakingEnvelope)).outcome, 'rejected');
});

test('removal and role changes fail closed without a complete next-key frontier', async () => {
  const before = initial();
  await assert.rejects(() => signed({
    eventId: 'invalid-key-version', actorId: minaId, pair: minaPair,
    state: before,
    event: {
      type: 'MEMBERSHIP_REMOVED', groupId, participantId: ninaId, nextKeyVersion: 1,
      groupKeyEnvelopes: {mina: binding('mina', minaPair, 1), leo: binding('leo', leoPair, 1)},
    },
  }), /Invalid membership event/u);
  const cases: MembershipEventV1[] = [
    {
      type: 'MEMBERSHIP_REMOVED', groupId, participantId: ninaId, nextKeyVersion: 2,
      groupKeyEnvelopes: {mina: binding('mina', minaPair, 2)},
    },
    {
      type: 'MEMBERSHIP_ROLES_CHANGED', groupId,
      roles: {mina: 'member', leo: 'member', nina: 'member'}, nextKeyVersion: 2,
      groupKeyEnvelopes: {
        mina: binding('mina', minaPair, 2), leo: binding('leo', leoPair, 2), nina: binding('nina', ninaPair, 2),
      },
    },
  ];
  for (const [index, membershipEvent] of cases.entries()) {
    const event = await signed({eventId: `invalid-${index}`, actorId: minaId, pair: minaPair, event: membershipEvent, state: before});
    const result = await applySignedMembershipEvent(before, event);
    assert.equal(result.outcome, 'rejected');
    assert.equal(Object.keys(result.state.lifecycle.memberships).length, 3);
  }
});

test('a verified-contact artifact cannot be interpreted as membership authority', async () => {
  const before = initial();
  const contactProof = {
    v: 1,
    eventId: 'contact-proof',
    actorId: minaId,
    actorAccountPublicKeyHex: account(minaPair),
    occurredAt: at,
    event: {type: 'CONTACT_VERIFIED', contactId: leoId},
    signature: `0x${'00'.repeat(64)}`,
  };
  const result = await applySignedMembershipEvent(before, contactProof as never);
  assert.equal(result.outcome, 'rejected');
  assert.equal(result.state, before);
  assert.equal(Object.keys(result.state.lifecycle.memberships).length, 3);
});

test('lost-account social re-grant preserves old events and uses remove, rotate, invite, accept, and organizer grant', async () => {
  const before = initial();
  const removedEvent = await signed({
    eventId: 'social-remove-old-leo', actorId: minaId, pair: minaPair,
    state: before,
    event: {
      type: 'MEMBERSHIP_REMOVED', groupId, participantId: leoId, nextKeyVersion: 2,
      groupKeyEnvelopes: {mina: binding('mina', minaPair, 2), nina: binding('nina', ninaPair, 2)},
    },
  });
  const removed = await applySignedMembershipEvent(before, removedEvent);
  assert.equal(removed.outcome, 'applied');

  const invitationEvent = await signed({
    eventId: 'social-invite-new-leo', actorId: minaId, pair: minaPair,
    occurredAt: '2026-08-23T12:01:00.000Z',
    state: removed.state,
    event: {
      type: 'INVITATION_CREATED',
      invitation: {
        invitationId: 'social-regrant-leo',
        groupId,
        inviterId: minaId,
        inviteeId: leoId,
        inviteeAccountPublicKeyHex: account(recoveredLeoPair),
        role: 'member',
        route: 'join_link',
        status: 'invited',
        createdAt: '2026-08-23T12:01:00.000Z',
        expiresAt: '2099-08-24T12:00:00.000Z',
      },
    },
  });
  const invited = await applySignedMembershipEvent(removed.state, invitationEvent);
  assert.equal(invited.outcome, 'applied');
  assert.equal(invited.state.lifecycle.memberships[`${groupId}:leo`], undefined);

  const pending = await createMembershipAcceptance({
    invitationId: 'social-regrant-leo',
    groupId,
    recipientId: leoId,
    recipientAccountPublicKeyHex: account(recoveredLeoPair),
    nonce: 'social-regrant-nonce',
    expiresAt: '2099-08-24T12:00:00.000Z',
    signer: signer(recoveredLeoPair),
  });
  const acceptanceEvent = await signed({
    eventId: 'social-accept-new-leo', actorId: leoId, pair: recoveredLeoPair,
    occurredAt: '2026-08-23T12:02:00.000Z',
    state: invited.state,
    event: {type: 'INVITATION_ACCEPTED', acceptance: pending.acceptance},
  });
  const accepted = await applySignedMembershipEvent(invited.state, acceptanceEvent);
  assert.equal(accepted.outcome, 'applied');
  assert.equal(accepted.state.lifecycle.memberships[`${groupId}:leo`], undefined);

  const handoff = await createGroupKeyHandoff({
    acceptance: pending.acceptance,
    verifyRecipient: verifyProductAccountSignature,
    groupKeyEnvelopeId: 'leo-recovered-v2',
    organizerId: minaId,
    organizerAccountPublicKeyHex: account(minaPair),
    role: 'member',
    keyVersion: 2,
    groupKey: new Uint8Array(32).fill(8),
    createdAt: '2026-08-23T12:03:00.000Z',
    expiresAt: '2099-08-24T12:00:00.000Z',
    signer: signer(minaPair),
  });
  const grantEvent = await signed({
    eventId: 'social-grant-new-leo', actorId: minaId, pair: minaPair,
    occurredAt: '2026-08-23T12:03:00.000Z',
    state: accepted.state,
    event: {type: 'MEMBERSHIP_GRANTED', handoff, groupKeyEnvelopeId: 'leo-recovered-v2'},
  });
  const granted = await applySignedMembershipEvent(accepted.state, grantEvent);
  assert.equal(granted.outcome, 'applied');
  assert.equal(granted.state.lifecycle.memberships[`${groupId}:leo`].accountPublicKeyHex, account(recoveredLeoPair));
  assert.notEqual(granted.state.lifecycle.memberships[`${groupId}:leo`].accountPublicKeyHex, account(leoPair));
  assert.deepEqual(Object.keys(granted.state.events).sort(), [
    'social-accept-new-leo',
    'social-grant-new-leo',
    'social-invite-new-leo',
    'social-remove-old-leo',
  ]);
});
