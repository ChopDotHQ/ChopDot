import {createCanonicalEvent, type CanonicalEventInput, type CanonicalEventV1, type CanonicalSigner, type CanonicalVerifier} from '../../src/core/moneyEventKernel.ts';
import {moneyFromDecimal} from '../../src/core/money.ts';
import {createAccountBoundGroupKeyEnvelope, type AccountEntropyProvider} from '../../src/environment/accountBoundKeyEnvelope.ts';
import {GroupRecoveryService, MemoryCheckpointArchive, MemoryRecoveryLocatorStore, ArrayLaterEventSource} from '../../src/recovery/groupRecovery.ts';

export const b3MinaKey = `0x${'11'.repeat(32)}`;
export const b3LeoKey = `0x${'22'.repeat(32)}`;
export const b3NinaKey = `0x${'33'.repeat(32)}`;
export const b3ProductId = 'app.chopdotproof02.dot';
export const b3GroupKey = Uint8Array.from({length:32}, (_, index) => index + 1);
export const b3Signer: CanonicalSigner = {sign: b3Digest};
export const b3Verify: CanonicalVerifier = async (bytes, signature) => Buffer.from(await b3Digest(bytes)).equals(Buffer.from(signature));

export async function candidateBatch3RecoveryData(participantId: 'leo' | 'nina') {
  const events = await candidateBatch3DinnerEvents();
  const accountPublicKeyHex = participantId === 'leo' ? b3LeoKey : b3NinaKey;
  const archive = new MemoryCheckpointArchive();
  const locators = new MemoryRecoveryLocatorStore();
  const recovery = new GroupRecoveryService({archive, locators, laterEvents:new ArrayLaterEventSource(events.slice(4)), verifyEvent:b3Verify, verifyCheckpoint:b3Verify});
  const keyEnvelope = await createAccountBoundGroupKeyEnvelope(b3Metadata(participantId, accountPublicKeyHex), b3GroupKey, b3Entropy(`${participantId}-account`));
  const {checkpoint, locator} = await recovery.publish({
    acceptedEvents:events.slice(0,4),groupKey:b3GroupKey,keyVersion:2,
    issuerId:'mina',issuerAccountPublicKeyHex:b3MinaKey,
    recipientId:participantId,recipientAccountPublicKeyHex:accountPublicKeyHex,
    createdAt:'2026-08-13T12:00:10.000Z',signer:b3Signer,
  });
  return {checkpoint,locator,keyEnvelope,laterEvents:events.slice(4),productId:b3ProductId,participantId,accountPublicKeyHex,minimumKeyVersion:2};
}

export async function candidateBatch3DinnerEvents(): Promise<CanonicalEventV1[]> {
  const rows: Array<Omit<CanonicalEventInput, 'groupId' | 'occurredAt'>> = [
    {eventId:'01-create',commandId:'c1',expectedVersion:0,parentEventId:null,actorId:'mina',actorAccountPublicKeyHex:b3MinaKey,actorRole:'organizer',eventType:'GROUP_CREATED',payload:{name:'Zurich Dinner',organizerId:'mina',members:[{participantId:'mina',accountPublicKeyHex:b3MinaKey,role:'organizer'},{participantId:'leo',accountPublicKeyHex:b3LeoKey,role:'member'},{participantId:'nina',accountPublicKeyHex:b3NinaKey,role:'member'}]}},
    {eventId:'02-expense',commandId:'c2',expectedVersion:1,parentEventId:'01-create',actorId:'mina',actorAccountPublicKeyHex:b3MinaKey,actorRole:'organizer',eventType:'EXPENSE_ADDED',payload:{expenseId:'e1',description:'Dinner',paidBy:'mina',total:moneyFromDecimal('120.00','CHF'),allocations:[{participantId:'mina',amount:moneyFromDecimal('40.00','CHF')},{participantId:'leo',amount:moneyFromDecimal('40.00','CHF')},{participantId:'nina',amount:moneyFromDecimal('40.00','CHF')}]}},
    {eventId:'03-request-leo',commandId:'c3',expectedVersion:2,parentEventId:'02-expense',actorId:'mina',actorAccountPublicKeyHex:b3MinaKey,actorRole:'organizer',eventType:'SHARE_REQUESTED',payload:{shareId:'share-leo'}},
    {eventId:'04-request-nina',commandId:'c4',expectedVersion:3,parentEventId:'03-request-leo',actorId:'mina',actorAccountPublicKeyHex:b3MinaKey,actorRole:'organizer',eventType:'SHARE_REQUESTED',payload:{shareId:'share-nina'}},
    {eventId:'05-paid-leo',commandId:'c5',expectedVersion:4,parentEventId:'04-request-nina',actorId:'leo',actorAccountPublicKeyHex:b3LeoKey,actorRole:'member',eventType:'SHARE_MARKED_PAID',payload:{shareId:'share-leo'}},
    {eventId:'06-received-leo',commandId:'c6',expectedVersion:5,parentEventId:'05-paid-leo',actorId:'mina',actorAccountPublicKeyHex:b3MinaKey,actorRole:'organizer',eventType:'SHARE_RECEIVED',payload:{shareId:'share-leo'}},
    {eventId:'07-paid-nina',commandId:'c7',expectedVersion:6,parentEventId:'06-received-leo',actorId:'nina',actorAccountPublicKeyHex:b3NinaKey,actorRole:'member',eventType:'SHARE_MARKED_PAID',payload:{shareId:'share-nina'}},
    {eventId:'08-received-nina',commandId:'c8',expectedVersion:7,parentEventId:'07-paid-nina',actorId:'mina',actorAccountPublicKeyHex:b3MinaKey,actorRole:'organizer',eventType:'SHARE_RECEIVED',payload:{shareId:'share-nina'}},
    {eventId:'09-close',commandId:'c9',expectedVersion:8,parentEventId:'08-received-nina',actorId:'mina',actorAccountPublicKeyHex:b3MinaKey,actorRole:'organizer',eventType:'GROUP_CLOSED',payload:{recordId:'record-dinner'}},
  ];
  return Promise.all(rows.map(row => createCanonicalEvent({...row,groupId:'g-dinner',occurredAt:'2026-08-13T12:00:00.000Z'},b3Signer)));
}

export async function b3Digest(bytes: Uint8Array): Promise<Uint8Array> {return new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))}
export function b3Entropy(account: string): AccountEntropyProvider {return {deriveAccountEntropy:async context => b3Digest(Buffer.concat([Buffer.from(account),Buffer.from(context)]))}}
function b3Metadata(recipientId:string,recipientAccountPublicKeyHex:string) {return {productId:b3ProductId,groupId:'g-dinner',recipientId,recipientAccountPublicKeyHex,keyVersion:2}}
