import assert from 'node:assert/strict';
import test from 'node:test';
import type {KeyValueStorage} from '../environment/livePayerSync.ts';
import {ProductionAccountAuthorityRuntime} from '../environment/productionAccountAuthorityRuntime.ts';
import {
  GroupCreationEntryService,
  type GroupCreationAuthoritySink,
} from './groupCreationEntryService.ts';

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  read(key: string) { return this.values.get(key) ?? null; }
  write(key: string, value: string) { this.values.set(key, value); }
  remove(key: string) { this.values.delete(key); }
}

const minaAccount = `0x${'11'.repeat(32)}`;
const identity = {
  participantId: 'mina',
  publicKeyHex: minaAccount,
  signer: {sign: async () => new Uint8Array(64)},
};
const sharedInput = {
  draftId: 'draft-zurich-dinner',
  candidateGroupId: 'zurich-dinner',
  name: 'Zurich dinner',
  mode: 'normal_pot' as const,
  intent: 'shared' as const,
};

test('regression: guest shared creation is intercepted before the late Product Account provisioner failure', async () => {
  const runtime = new ProductionAccountAuthorityRuntime();
  await assert.rejects(runtime.provision({
    groupId: sharedInput.candidateGroupId,
    organizerId: 'mina',
    organizerAccountPublicKeyHex: minaAccount,
    eventId: 'origin',
    acceptedAt: '2026-08-24T12:00:00.000Z',
    signer: identity.signer,
  }), /Use your Product Account before creating a shared group/u);

  const storage = new MemoryStorage();
  const appended: unknown[] = [];
  const service = createService({
    storage,
    runtime,
    sink: sink({append: async input => { appended.push(input); return true; }}),
  });
  const result = await service.createOrResume(sharedInput, '2026-08-24T12:01:00.000Z');

  assert.equal(result.status, 'account_setup_required');
  assert.equal(appended.length, 0);
  assert.equal(result.draft.stage, 'account_setup_required');
  assert.deepEqual(createService({storage, runtime, sink: rejectingSink}).read('draft-zurich-dinner'), result.draft);
});

test('a guest can save a durable local private draft without creating a group, membership, or organizer authority', async () => {
  const storage = new MemoryStorage();
  const runtime = new ProductionAccountAuthorityRuntime();
  let appendCalls = 0;
  const service = createService({
    storage,
    runtime,
    sink: sink({append: async () => { appendCalls += 1; return true; }}),
  });
  const result = await service.createOrResume({...sharedInput, intent: 'local_private'}, '2026-08-24T12:02:00.000Z');

  assert.equal(result.status, 'local_private_draft_saved');
  assert.equal(result.draft.stage, 'local_private_draft');
  assert.equal(appendCalls, 0);
  assert.deepEqual(service.list(), [result.draft]);
  const serialized = [...storage.values.values()].join('\n');
  assert.doesNotMatch(serialized, /organizer|accountPublicKeyHex|contact|personhood|members/iu);
});

test('the same durable draft becomes one organizer-only shared authority proposal after account setup', async () => {
  const storage = new MemoryStorage();
  const runtime = new ProductionAccountAuthorityRuntime();
  const appended: Parameters<GroupCreationAuthoritySink['appendShared']>[0][] = [];
  let canonical: ReturnType<typeof canonicalGroup> | null = null;
  const authority = sink({
    append: async input => {
      appended.push(input);
      canonical = canonicalGroup();
      return true;
    },
    read: async () => canonical,
  });
  const beforeAccount = createService({storage, runtime, sink: authority});
  assert.equal((await beforeAccount.createOrResume(sharedInput, '2026-08-24T12:03:00.000Z')).status, 'account_setup_required');

  runtime.attachIdentity(identity);
  runtime.attachGroupAccess({async provision() {
    return {keyVersion: 1, groupKeyEnvelopeId: `sha256:${'aa'.repeat(32)}`};
  }});
  const afterAccount = createService({storage, runtime, sink: authority});
  const result = await afterAccount.createOrResume(sharedInput, '2026-08-24T12:04:00.000Z');

  assert.equal(result.status, 'shared_group_created');
  assert.equal(result.draft.stage, 'shared_created');
  assert.equal(appended.length, 1);
  assert.deepEqual(appended[0], {
    actorId: 'mina',
    action: {
      type: 'CREATE_GROUP',
      payload: {group: {
        id: 'zurich-dinner',
        name: 'Zurich dinner',
        memberIds: ['mina'],
        mode: 'normal_pot',
      }},
    },
  });
  assert.equal((await afterAccount.createOrResume(sharedInput, '2026-08-24T12:05:00.000Z')).status, 'shared_group_created');
  assert.equal(appended.length, 1, 'a completed shared creation is idempotent');
});

test('an append response and a persisted completed stage cannot impersonate canonical creation', async () => {
  const storage = new MemoryStorage();
  const runtime = new ProductionAccountAuthorityRuntime();
  runtime.attachIdentity(identity);
  runtime.attachGroupAccess({async provision() {
    return {keyVersion: 1, groupKeyEnvelopeId: `sha256:${'aa'.repeat(32)}`};
  }});
  let appendCalls = 0;
  const service = createService({
    storage,
    runtime,
    sink: sink({append: async () => { appendCalls += 1; return true; }}),
  });

  const first = await service.createOrResume(sharedInput, '2026-08-24T12:05:30.000Z');
  assert.equal(first.status, 'shared_creation_failed');
  assert.equal(first.draft.stage, 'shared_append_pending');

  storage.values.set('chopdot-group-creation-draft-v1:mina', JSON.stringify([{
    ...first.draft,
    stage: 'shared_created',
  }]));
  const resumed = await service.createOrResume(sharedInput, '2026-08-24T12:05:45.000Z');
  assert.equal(resumed.status, 'shared_creation_failed');
  assert.equal(resumed.draft.stage, 'shared_append_pending');
  assert.equal(appendCalls, 2);
});

test('identity for another participant and group access alone cannot authorize this organizer', async () => {
  const storage = new MemoryStorage();
  const runtime = new ProductionAccountAuthorityRuntime();
  runtime.attachIdentity({...identity, participantId: 'leo'});
  runtime.attachGroupAccess({async provision() {
    return {keyVersion: 1, groupKeyEnvelopeId: `sha256:${'aa'.repeat(32)}`};
  }});
  const service = createService({storage, runtime, sink: rejectingSink});
  assert.equal((await service.createOrResume(sharedInput, '2026-08-24T12:06:00.000Z')).status, 'account_setup_required');
});

test('a rejected append leaves a durable pending draft and a later exact retry can finish it', async () => {
  const storage = new MemoryStorage();
  const runtime = new ProductionAccountAuthorityRuntime();
  runtime.attachIdentity(identity);
  runtime.attachGroupAccess({async provision() {
    return {keyVersion: 1, groupKeyEnvelopeId: `sha256:${'aa'.repeat(32)}`};
  }});
  let accepted = false;
  let calls = 0;
  let canonical: ReturnType<typeof canonicalGroup> | null = null;
  const service = createService({
    storage,
    runtime,
    sink: sink({
      append: async () => {
        calls += 1;
        if (accepted) canonical = canonicalGroup();
        return accepted;
      },
      read: async () => canonical,
    }),
  });
  const failed = await service.createOrResume(sharedInput, '2026-08-24T12:07:00.000Z');
  assert.equal(failed.status, 'shared_creation_failed');
  assert.equal(failed.draft.stage, 'shared_append_pending');
  assert.equal(createService({storage, runtime, sink: rejectingSink}).read('draft-zurich-dinner')?.stage, 'shared_append_pending');
  await assert.rejects(
    () => service.createOrResume({...sharedInput, intent: 'local_private'}, '2026-08-24T12:07:30.000Z'),
    /shared creation attempt waiting/u,
  );

  accepted = true;
  const retried = await service.createOrResume(sharedInput, '2026-08-24T12:08:00.000Z');
  assert.equal(retried.status, 'shared_group_created');
  assert.equal(calls, 2);
});

test('restart recognizes the exact account-bound canonical creation after a false delivery result and does not append twice', async () => {
  const storage = new MemoryStorage();
  const runtime = new ProductionAccountAuthorityRuntime();
  runtime.attachIdentity(identity);
  runtime.attachGroupAccess({async provision() {
    return {keyVersion: 1, groupKeyEnvelopeId: `sha256:${'aa'.repeat(32)}`};
  }});
  let appendCalls = 0;
  let canonical: Awaited<ReturnType<GroupCreationAuthoritySink['readCanonicalGroup']>> = null;
  const authority = sink({
    append: async () => {
      appendCalls += 1;
      canonical = canonicalGroup();
      return false;
    },
    read: async () => canonical,
  });
  const first = await createService({storage, runtime, sink: authority})
    .createOrResume(sharedInput, '2026-08-24T12:08:30.000Z');
  assert.equal(first.status, 'shared_group_created');

  const restarted = await createService({storage, runtime, sink: authority})
    .createOrResume(sharedInput, '2026-08-24T12:09:00.000Z');
  assert.equal(restarted.status, 'shared_group_created');
  assert.equal(appendCalls, 1);
});

test('a colliding canonical group signed by another account never completes this draft', async () => {
  const storage = new MemoryStorage();
  const runtime = new ProductionAccountAuthorityRuntime();
  runtime.attachIdentity(identity);
  runtime.attachGroupAccess({async provision() {
    return {keyVersion: 1, groupKeyEnvelopeId: `sha256:${'aa'.repeat(32)}`};
  }});
  const otherAccountGroup = canonicalGroup();
  otherAccountGroup.members.mina.accountPublicKeyHex = `0x${'99'.repeat(32)}`;
  let appendCalls = 0;
  const result = await createService({
    storage,
    runtime,
    sink: sink({
      append: async () => { appendCalls += 1; return false; },
      read: async () => otherAccountGroup,
    }),
  }).createOrResume(sharedInput, '2026-08-24T12:09:30.000Z');
  assert.equal(result.status, 'shared_creation_failed');
  assert.equal(result.draft.stage, 'shared_append_pending');
  assert.equal(appendCalls, 1);
});

test('identifier conflicts, malformed persisted state, and unsupported modes fail closed', async () => {
  const storage = new MemoryStorage();
  const runtime = new ProductionAccountAuthorityRuntime();
  const service = createService({storage, runtime, sink: rejectingSink});
  await service.createOrResume({...sharedInput, intent: 'local_private'}, '2026-08-24T12:09:00.000Z');
  await assert.rejects(() => service.createOrResume({...sharedInput, name: 'Different group'}, '2026-08-24T12:10:00.000Z'), /identifier is already in use/u);
  await assert.rejects(() => service.createOrResume({...sharedInput, candidateGroupId: 'bad\nvalue'}, '2026-08-24T12:10:00.000Z'), /identifier/u);
  await assert.rejects(() => service.createOrResume({...sharedInput, draftId: 'other', candidateGroupId: 'other', mode: 'unknown' as never}, '2026-08-24T12:10:00.000Z'), /mode/u);

  storage.values.set('chopdot-group-creation-draft-v1:mina', JSON.stringify([
    {v: 1, groupId: 'corrupt'},
    service.read('draft-zurich-dinner'),
  ]));
  assert.deepEqual(createService({storage, runtime, sink: rejectingSink}).list().map(row => row.draftId), ['draft-zurich-dinner']);
});

const rejectingSink = sink({append: async () => false});

function sink(input: {
  append: GroupCreationAuthoritySink['appendShared'];
  read?: GroupCreationAuthoritySink['readCanonicalGroup'];
}): GroupCreationAuthoritySink {
  return {
    appendShared: input.append,
    readCanonicalGroup: input.read ?? (async () => null),
  };
}

function canonicalGroup() {
  return {
    v: 1 as const,
    groupId: 'zurich-dinner',
    name: 'Zurich dinner',
    mode: 'normal_pot' as const,
    version: 1,
    currentEventId: 'event-origin',
    organizerId: 'mina',
    groupKeyVersion: 1,
    members: {
      mina: {
        participantId: 'mina', accountPublicKeyHex: minaAccount, role: 'organizer' as const, active: true,
        acceptedAt: '2026-08-24T12:08:30.000Z', invitationId: 'group-origin:event-origin',
        keyVersion: 1, groupKeyEnvelopeId: `sha256:${'aa'.repeat(32)}`,
      },
    },
    expenses: {}, shares: {}, closed: null, successorRecords: [], eventIds: ['event-origin'],
  };
}

function createService(input: {
  storage: KeyValueStorage;
  runtime: ProductionAccountAuthorityRuntime;
  sink: GroupCreationAuthoritySink;
}) {
  return new GroupCreationEntryService({
    participantId: 'mina',
    storage: input.storage,
    readiness: input.runtime,
    authority: input.sink,
  });
}
