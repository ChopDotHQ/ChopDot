import assert from 'node:assert/strict';
import test from 'node:test';
import {createCanonicalEvent, projectCanonicalEvents, type CanonicalEventInput, type CanonicalEventV1, type CanonicalSigner, type CanonicalVerifier} from '../src/core/moneyEventKernel.ts';
import {moneyFromDecimal} from '../src/core/money.ts';
import {createAccountBoundGroupKeyEnvelope, type AccountEntropyProvider} from '../src/environment/accountBoundKeyEnvelope.ts';
import type {KeyValueStorage} from '../src/environment/livePayerSync.ts';
import {
  ArrayLaterEventSource,
  CanonicalEventStore,
  GroupRecoveryService,
  KeyValueCheckpointArchive,
  KeyValueRecoveryLocatorStore,
  MemoryCheckpointArchive,
  MemoryRecoveryLocatorStore,
} from '../src/recovery/groupRecovery.ts';
import {createSharedEnvelope} from '../src/environment/hostSessionSync.ts';
import {DeferredSharedEventInbox, SharedActionOutbox, restoreDeferredSharedEvents} from '../src/environment/sharedActionDelivery.ts';

const minaKey = `0x${'11'.repeat(32)}`;
const leoKey = `0x${'22'.repeat(32)}`;
const ninaKey = `0x${'33'.repeat(32)}`;
const groupKey = Uint8Array.from({length: 32}, (_, index) => index + 1);
const productId = 'app.chopdotproof02.dot';
const signer: CanonicalSigner = {sign: digest};
const verify: CanonicalVerifier = async (bytes, signature) => Buffer.from(await digest(bytes)).equals(Buffer.from(signature));

test('fresh same-account recovery beyond 300 seconds replays later events to the exact full state', async () => {
  const events = await dinnerEvents();
  const archive = new MemoryCheckpointArchive();
  const locators = new MemoryRecoveryLocatorStore();
  const first = service(archive, locators, events.slice(4));
  const envelope = await createAccountBoundGroupKeyEnvelope(metadata('leo', leoKey, 2), groupKey, entropy('leo-account'));
  const published = await first.publish({
    acceptedEvents: events.slice(0, 4), groupKey, keyVersion: 2,
    issuerId: 'mina', issuerAccountPublicKeyHex: minaKey,
    recipientId: 'leo', recipientAccountPublicKeyHex: leoKey,
    createdAt: '2026-08-13T12:00:10.000Z', signer,
  });

  // A recreated service and entropy provider represent a fresh profile more
  // than five minutes later. Neither object retains the original group key.
  const recreated = service(archive, locators, [...events.slice(4)].reverse());
  const recovered = await recreated.recover({
    productId, groupId: 'g-dinner', participantId: 'leo', accountPublicKeyHex: leoKey,
    minimumKeyVersion: 2, keyEnvelope: envelope, entropy: entropy('leo-account'),
  });
  const full = await projectCanonicalEvents(events, verify);
  assert.equal(Date.parse('2026-08-13T12:10:10.000Z') - Date.parse(published.checkpoint.createdAt) > 300_000, true);
  assert.equal(recovered.stateHash, full.stateHash);
  assert.equal(recovered.state.version, 9);
  assert.equal(recovered.state.closed?.recordId, 'record-dinner');
  assert.equal(recovered.state.closed?.total.minorUnits, '12000');
  assert.deepEqual(recovered.rejected, []);
  assert.deepEqual(recovered.conflicts, []);
});

test('wrong account, stale key, locator tamper, ciphertext tamper, and rollback fail closed', async () => {
  const events = await dinnerEvents();
  const archive = new MemoryCheckpointArchive();
  const locators = new MemoryRecoveryLocatorStore();
  const recovery = service(archive, locators, events.slice(4));
  const envelope = await createAccountBoundGroupKeyEnvelope(metadata('leo', leoKey, 2), groupKey, entropy('leo-account'));
  const {checkpoint, locator} = await recovery.publish({
    acceptedEvents: events.slice(0, 4), groupKey, keyVersion: 2,
    issuerId: 'mina', issuerAccountPublicKeyHex: minaKey,
    recipientId: 'leo', recipientAccountPublicKeyHex: leoKey,
    createdAt: '2026-08-13T12:00:10.000Z', signer,
  });
  await assert.rejects(() => recovery.recover({productId, groupId: 'g-dinner', participantId: 'leo', accountPublicKeyHex: ninaKey, minimumKeyVersion: 2, keyEnvelope: envelope, entropy: entropy('nina-account')}));
  await assert.rejects(() => recovery.recover({productId, groupId: 'g-dinner', participantId: 'leo', accountPublicKeyHex: leoKey, minimumKeyVersion: 3, keyEnvelope: envelope, entropy: entropy('leo-account')}));

  locators.replace({...locator, checkpointStateHash: `0x${'aa'.repeat(32)}`});
  await assert.rejects(() => recovery.recover({productId, groupId: 'g-dinner', participantId: 'leo', accountPublicKeyHex: leoKey, minimumKeyVersion: 2, keyEnvelope: envelope, entropy: entropy('leo-account')}), /signature/u);
  locators.replace(locator);

  const ref = locator.checkpointRef;
  const changedCiphertextPrefix = checkpoint.ciphertext.startsWith('A') ? 'B' : 'A';
  archive.replace(ref, {...checkpoint, ciphertext: `${changedCiphertextPrefix}${checkpoint.ciphertext.slice(1)}`});
  await assert.rejects(() => recovery.recover({productId, groupId: 'g-dinner', participantId: 'leo', accountPublicKeyHex: leoKey, minimumKeyVersion: 2, keyEnvelope: envelope, entropy: entropy('leo-account')}));
  archive.replace(ref, checkpoint);

  await assert.rejects(() => locators.put({...locator, checkpointVersion: 1, keyVersion: 1}), /rollback/u);
});

test('compaction requires a verified checkpoint prefix and rejects replay of compacted events', async () => {
  const events = await dinnerEvents();
  const archive = new MemoryCheckpointArchive();
  const locators = new MemoryRecoveryLocatorStore();
  const recovery = service(archive, locators, events.slice(4));
  const {checkpoint, locator} = await recovery.publish({
    acceptedEvents: events.slice(0, 4), groupKey, keyVersion: 2,
    issuerId: 'mina', issuerAccountPublicKeyHex: minaKey,
    recipientId: 'leo', recipientAccountPublicKeyHex: leoKey,
    createdAt: '2026-08-13T12:00:10.000Z', signer,
  });
  const storage = memoryStorage();
  const store = new CanonicalEventStore(storage, 'dinner');
  for (const event of events) store.append(event);
  assert.throws(() => store.compact({checkpointRef: locator.checkpointRef, checkpoint: {...checkpoint, sourceEventIds: [...checkpoint.sourceEventIds].reverse()}}));
  store.compact({checkpointRef: locator.checkpointRef, checkpoint});
  assert.equal(store.list().length, 5);
  assert.deepEqual(store.compacted()?.eventIds, events.slice(0, 4).map(event => event.eventId));
  assert.throws(() => store.append(events[0]), /replay/u);
  store.append(events[4]);
  assert.equal(store.list().length, 5, 'exact retry of the retained suffix stays idempotent');
});

test('a checkpoint does not replace event authority and closed history remains immutable', async () => {
  const events = await dinnerEvents();
  const archive = new MemoryCheckpointArchive();
  const locators = new MemoryRecoveryLocatorStore();
  const postClose = await event({
    eventId: '10-late', commandId: 'c10', expectedVersion: 9, parentEventId: '09-close',
    actorId: 'mina', actorAccountPublicKeyHex: minaKey, actorRole: 'organizer',
    eventType: 'SHARE_ADJUSTED', payload: {shareId: 'share:e1:leo', kind: 'fee', delta: moneyFromDecimal('1.00', 'CHF'), reason: 'late'},
  });
  const recovery = service(archive, locators, [...events.slice(4), postClose]);
  const envelope = await createAccountBoundGroupKeyEnvelope(metadata('leo', leoKey, 2), groupKey, entropy('leo-account'));
  await recovery.publish({
    acceptedEvents: events.slice(0, 4), groupKey, keyVersion: 2,
    issuerId: 'mina', issuerAccountPublicKeyHex: minaKey,
    recipientId: 'leo', recipientAccountPublicKeyHex: leoKey,
    createdAt: '2026-08-13T12:00:10.000Z', signer,
  });
  await assert.rejects(() => recovery.recover({productId, groupId: 'g-dinner', participantId: 'leo', accountPublicKeyHex: leoKey, minimumKeyVersion: 2, keyEnvelope: envelope, entropy: entropy('leo-account')}), /Later group events/u);
});

test('archive, locator, outbound action, and deferred inbound event survive provider recreation', async () => {
  const events=await dinnerEvents();
  const storage=memoryStorage();
  const first=new GroupRecoveryService({archive:new KeyValueCheckpointArchive(storage),locators:new KeyValueRecoveryLocatorStore(storage),laterEvents:new ArrayLaterEventSource(events.slice(4)),verifyEvent:verify,verifyCheckpoint:verify});
  const envelope=await createAccountBoundGroupKeyEnvelope(metadata('leo',leoKey,2),groupKey,entropy('leo-account'));
  await first.publish({acceptedEvents:events.slice(0,4),groupKey,keyVersion:2,issuerId:'mina',issuerAccountPublicKeyHex:minaKey,recipientId:'leo',recipientAccountPublicKeyHex:leoKey,createdAt:'2026-08-13T12:00:10.000Z',signer});
  const recreated=new GroupRecoveryService({archive:new KeyValueCheckpointArchive(storage),locators:new KeyValueRecoveryLocatorStore(storage),laterEvents:new ArrayLaterEventSource(events.slice(4)),verifyEvent:verify,verifyCheckpoint:verify});
  assert.equal((await recreated.recover({productId,groupId:'g-dinner',participantId:'leo',accountPublicKeyHex:leoKey,minimumKeyVersion:2,keyEnvelope:envelope,entropy:entropy('leo-account')})).state.version,9);

  const shared=createSharedEnvelope({type:'CREATE_GROUP',payload:{group:{id:'g-dinner',name:'Zurich Dinner',memberIds:['mina','leo','nina']}}},{userId:'mina',publicKeyHex:minaKey,username:'Mina'});
  const session={roomId:'room-dinner',secret:'transport-secret'};
  const queued=new SharedActionOutbox(storage,'b3-outbox').enqueue({session,envelope:shared,queuedAt:'2026-08-13T12:00:11.000Z'});
  assert.deepEqual(new SharedActionOutbox(storage,'b3-outbox').list(),[queued]);
  const inbox=new DeferredSharedEventInbox(storage,'b3-inbox');
  inbox.defer({envelope:shared,signerHex:minaKey,receivedAt:'2026-08-13T12:00:12.000Z'});
  assert.equal(restoreDeferredSharedEvents(new DeferredSharedEventInbox(storage,'b3-inbox'),new Set()).get(shared.eventId)?.signerHex,minaKey);
});

test('newer account-bound key version replaces the locator and old envelopes cannot recover it', async () => {
  const events=await dinnerEvents();
  const archive=new MemoryCheckpointArchive();
  const locators=new MemoryRecoveryLocatorStore();
  const recovery=service(archive,locators,events.slice(4));
  const oldEnvelope=await createAccountBoundGroupKeyEnvelope(metadata('leo',leoKey,1),groupKey,entropy('leo-account'));
  await recovery.publish({acceptedEvents:events.slice(0,4),groupKey,keyVersion:1,issuerId:'mina',issuerAccountPublicKeyHex:minaKey,recipientId:'leo',recipientAccountPublicKeyHex:leoKey,createdAt:'2026-08-13T12:00:10.000Z',signer});
  const rotatedKey=Uint8Array.from({length:32},(_,index)=>255-index);
  const newEnvelope=await createAccountBoundGroupKeyEnvelope(metadata('leo',leoKey,2),rotatedKey,entropy('leo-account'));
  await recovery.publish({acceptedEvents:events.slice(0,4),groupKey:rotatedKey,keyVersion:2,issuerId:'mina',issuerAccountPublicKeyHex:minaKey,recipientId:'leo',recipientAccountPublicKeyHex:leoKey,createdAt:'2026-08-13T12:06:00.000Z',signer});
  await assert.rejects(()=>recovery.recover({productId,groupId:'g-dinner',participantId:'leo',accountPublicKeyHex:leoKey,minimumKeyVersion:2,keyEnvelope:oldEnvelope,entropy:entropy('leo-account')}));
  assert.equal((await recovery.recover({productId,groupId:'g-dinner',participantId:'leo',accountPublicKeyHex:leoKey,minimumKeyVersion:2,keyEnvelope:newEnvelope,entropy:entropy('leo-account')})).state.version,9);
});

function service(archive: MemoryCheckpointArchive, locators: MemoryRecoveryLocatorStore, later: CanonicalEventV1[]) {
  return new GroupRecoveryService({archive, locators, laterEvents: new ArrayLaterEventSource(later), verifyEvent: verify, verifyCheckpoint: verify});
}

async function dinnerEvents(): Promise<CanonicalEventV1[]> {
  const rows: Array<Omit<CanonicalEventInput, 'groupId' | 'occurredAt'>> = [
    {eventId:'01-create',commandId:'c1',expectedVersion:0,parentEventId:null,actorId:'mina',actorAccountPublicKeyHex:minaKey,actorRole:'organizer',eventType:'GROUP_CREATED',payload:{name:'Zurich Dinner',organizerId:'mina',members:[{participantId:'mina',accountPublicKeyHex:minaKey,role:'organizer'},{participantId:'leo',accountPublicKeyHex:leoKey,role:'member'},{participantId:'nina',accountPublicKeyHex:ninaKey,role:'member'}]}},
    {eventId:'02-expense',commandId:'c2',expectedVersion:1,parentEventId:'01-create',actorId:'mina',actorAccountPublicKeyHex:minaKey,actorRole:'organizer',eventType:'EXPENSE_ADDED',payload:{expenseId:'e1',description:'Dinner',paidBy:'mina',total:moneyFromDecimal('120.00','CHF'),allocations:[{participantId:'mina',amount:moneyFromDecimal('40.00','CHF')},{participantId:'leo',amount:moneyFromDecimal('40.00','CHF')},{participantId:'nina',amount:moneyFromDecimal('40.00','CHF')}]}},
    {eventId:'03-request-leo',commandId:'c3',expectedVersion:2,parentEventId:'02-expense',actorId:'mina',actorAccountPublicKeyHex:minaKey,actorRole:'organizer',eventType:'SHARE_REQUESTED',payload:{shareId:'share:e1:leo'}},
    {eventId:'04-request-nina',commandId:'c4',expectedVersion:3,parentEventId:'03-request-leo',actorId:'mina',actorAccountPublicKeyHex:minaKey,actorRole:'organizer',eventType:'SHARE_REQUESTED',payload:{shareId:'share:e1:nina'}},
    {eventId:'05-paid-leo',commandId:'c5',expectedVersion:4,parentEventId:'04-request-nina',actorId:'leo',actorAccountPublicKeyHex:leoKey,actorRole:'member',eventType:'SHARE_MARKED_PAID',payload:{shareId:'share:e1:leo'}},
    {eventId:'06-received-leo',commandId:'c6',expectedVersion:5,parentEventId:'05-paid-leo',actorId:'mina',actorAccountPublicKeyHex:minaKey,actorRole:'organizer',eventType:'SHARE_RECEIVED',payload:{shareId:'share:e1:leo'}},
    {eventId:'07-paid-nina',commandId:'c7',expectedVersion:6,parentEventId:'06-received-leo',actorId:'nina',actorAccountPublicKeyHex:ninaKey,actorRole:'member',eventType:'SHARE_MARKED_PAID',payload:{shareId:'share:e1:nina'}},
    {eventId:'08-received-nina',commandId:'c8',expectedVersion:7,parentEventId:'07-paid-nina',actorId:'mina',actorAccountPublicKeyHex:minaKey,actorRole:'organizer',eventType:'SHARE_RECEIVED',payload:{shareId:'share:e1:nina'}},
    {eventId:'09-close',commandId:'c9',expectedVersion:8,parentEventId:'08-received-nina',actorId:'mina',actorAccountPublicKeyHex:minaKey,actorRole:'organizer',eventType:'GROUP_CLOSED',payload:{recordId:'record-dinner'}},
  ];
  return Promise.all(rows.map(event));
}

function event(input: Omit<CanonicalEventInput, 'groupId' | 'occurredAt'>) {
  return createCanonicalEvent({...input, groupId:'g-dinner', occurredAt:'2026-08-13T12:00:00.000Z'}, signer);
}
async function digest(bytes: Uint8Array): Promise<Uint8Array> {return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))}
function entropy(account: string): AccountEntropyProvider {
  return {deriveAccountEntropy: async context => digest(Buffer.concat([Buffer.from(account), Buffer.from(context)]))};
}
function metadata(recipientId: string, recipientAccountPublicKeyHex: string, keyVersion: number) {
  return {productId, groupId:'g-dinner', recipientId, recipientAccountPublicKeyHex, keyVersion};
}
function memoryStorage(): KeyValueStorage {
  const rows = new Map<string,string>();
  return {
    read:key => rows.get(key) ?? null,
    write:(key,value) => {rows.set(key,value)},
    remove:key => {rows.delete(key)},
  };
}
