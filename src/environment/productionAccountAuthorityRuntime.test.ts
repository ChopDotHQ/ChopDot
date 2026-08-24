import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDeferredProductAccountActivation,
  ProductionAccountAuthorityRuntime,
} from './productionAccountAuthorityRuntime.ts';

const account = `0x${'11'.repeat(32)}`;

test('stable account authority seams fail closed before explicit attachment and route after attachment', async () => {
  const runtime = new ProductionAccountAuthorityRuntime();
  assert.equal(runtime.sharedGroupCreationAccount('mina'), null);
  assert.equal(await runtime.resolveExternalIdentity('mina'), null);
  assert.equal(await runtime.resolve('group', 'leo'), null);
  assert.equal(await runtime.authorize({groupId: 'group', type: 'add', grant: {
    groupId: 'group', participantId: 'leo', accountPublicKeyHex: `0x${'22'.repeat(32)}`,
    role: 'member', acceptedAt: '2026-08-23T12:00:00.000Z', invitationId: 'invite',
    keyVersion: 1, groupKeyEnvelopeId: `sha256:${'aa'.repeat(32)}`,
  }}, 'mina'), false);
  await assert.rejects(runtime.provision({
    groupId: 'group', organizerId: 'mina', organizerAccountPublicKeyHex: account,
    eventId: 'origin', acceptedAt: '2026-08-23T12:00:00.000Z', signer: {sign: async () => new Uint8Array(64)},
  }), /Product Account/u);

  const identity = {participantId: 'mina', publicKeyHex: account, signer: {sign: async () => new Uint8Array(64)}};
  runtime.attachIdentity(identity);
  assert.equal(runtime.sharedGroupCreationAccount('mina'), null);
  runtime.attachGroupAccess({async provision() { return {keyVersion: 1, groupKeyEnvelopeId: `sha256:${'bb'.repeat(32)}`}; }});
  runtime.attachMembershipAuthority({
    async resolve() { return null; },
    async authorize() { return true; },
  });
  assert.equal((await runtime.resolveExternalIdentity('mina'))?.publicKeyHex, account);
  assert.deepEqual(runtime.sharedGroupCreationAccount('mina'), {accountPublicKeyHex: account});
  assert.equal(runtime.sharedGroupCreationAccount('leo'), null);
  assert.equal(await runtime.authorize({groupId: 'group', type: 'rotate_key', nextKeyVersion: 2, groupKeyEnvelopeIds: {}}, 'mina'), true);
  assert.equal((await runtime.provision({
    groupId: 'group', organizerId: 'mina', organizerAccountPublicKeyHex: account,
    eventId: 'origin', acceptedAt: '2026-08-23T12:00:00.000Z', signer: identity.signer,
  })).keyVersion, 1);
  runtime.detachAccount();
  assert.equal(runtime.sharedGroupCreationAccount('mina'), null);
});

test('canonical delivery does not fall back to legacy secrets when active recipients exist', async () => {
  const runtime = new ProductionAccountAuthorityRuntime();
  const state = {
    v: 1 as const, groupId: 'group', name: 'Group', version: 1, currentEventId: 'origin', organizerId: 'mina',
    members: {
      mina: {participantId: 'mina', accountPublicKeyHex: account, role: 'organizer' as const, active: true},
      leo: {participantId: 'leo', accountPublicKeyHex: `0x${'22'.repeat(32)}`, role: 'member' as const, active: true},
    }, expenses: {}, shares: {}, closed: null, successorRecords: [], eventIds: ['origin'],
  };
  const event = {
    v: 1 as const, eventId: 'origin', commandId: 'command', groupId: 'group', eventType: 'GROUP_CREATED' as const,
    expectedVersion: 0, parentEventId: null, actorId: 'mina', actorAccountPublicKeyHex: account,
    actorRole: 'organizer' as const, occurredAt: '2026-08-23T12:00:00.000Z', acceptedAt: '2026-08-23T12:00:00.000Z',
    eventVersion: 1 as const, keyVersion: 1, visibility: 'group_encrypted' as const,
    payload: {name: 'Group', organizerId: 'mina', members: []}, payloadHash: `0x${'aa'.repeat(32)}`, signatureHex: `0x${'bb'.repeat(64)}`,
  };
  await assert.rejects(runtime.publish(event, state), /conversation/u);
  const published: string[] = [];
  runtime.attachDelivery({async publish(value) { published.push(value.eventId); }});
  await runtime.publish(event, state);
  assert.deepEqual(published, ['origin']);
});

test('a cancelled or rejected Product Account candidate attaches no signer or group capability', async () => {
  const runtime = new ProductionAccountAuthorityRuntime();
  let sideEffects = 0;
  const candidate = createDeferredProductAccountActivation({
    runtime,
    identity: {participantId: 'mina', publicKeyHex: account, signer: {sign: async () => new Uint8Array(64)}},
    groupAccess: {async provision() { return {keyVersion: 1, groupKeyEnvelopeId: `sha256:${'bb'.repeat(32)}`}; }},
    activateSideEffects() { sideEffects += 1; },
    discardSideEffects() { sideEffects -= 1; },
  });

  candidate.discard();
  assert.equal(sideEffects, 0);
  assert.equal(candidate.isActive(), false);
  assert.equal(runtime.sharedGroupCreationAccount('mina'), null);
  assert.equal(await runtime.resolveExternalIdentity('mina'), null);

  candidate.activate();
  assert.equal(sideEffects, 1);
  assert.deepEqual(runtime.sharedGroupCreationAccount('mina'), {accountPublicKeyHex: account});
  candidate.discard();
  assert.equal(sideEffects, 0);
  assert.equal(runtime.sharedGroupCreationAccount('mina'), null);
});
