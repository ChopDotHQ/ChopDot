import assert from 'node:assert/strict';
import test from 'node:test';
import {DinnerJourneyService, MemoryDinnerJourneyDelivery, MemoryKeyValueStorage, type DinnerJourneyParticipant} from './dinnerJourney.ts';
import type {CanonicalSigner, CanonicalVerifier} from '../core/moneyEventKernel.ts';

const participants: DinnerJourneyParticipant[] = [
  {participantId:'mina',name:'Mina',accountPublicKeyHex:`0x${'11'.repeat(32)}`,role:'organizer'},
  {participantId:'leo',name:'Leo',accountPublicKeyHex:`0x${'22'.repeat(32)}`,role:'member'},
  {participantId:'nina',name:'Nina',accountPublicKeyHex:`0x${'33'.repeat(32)}`,role:'member'},
];
const signer: CanonicalSigner = {sign:digest};
const verify: CanonicalVerifier = async (bytes,signature) => Buffer.from(await digest(bytes)).equals(Buffer.from(signature));

test('full dinner journey preserves requested, marked paid, received, closed, and exact CHF states',async()=>{
  const delivery = new MemoryDinnerJourneyDelivery();
  const mina = service('mina',delivery,new MemoryKeyValueStorage());
  const leo = service('leo',delivery,new MemoryKeyValueStorage());
  const nina = service('nina',delivery,new MemoryKeyValueStorage());
  await Promise.all([mina.start(),leo.start(),nina.start()]);

  await mina.createDinner({groupName:'Zurich Dinner',description:'Gusto',totalDecimal:'120.00',currency:'CHF'});
  await Promise.all([leo.reconnect(),nina.reconnect()]);
  assert.equal(mina.getSnapshot().status,'waiting');
  assert.equal(leo.getSnapshot().status,'payment_requested');
  assert.equal(nina.getSnapshot().ownShare?.minorUnits,'4000');

  await leo.markPaid();
  assert.equal(leo.getSnapshot().status,'marked_paid');
  assert.equal(mina.getSnapshot().status,'needs_confirmation');
  await mina.confirmReceived('leo');
  await nina.markPaid();
  await mina.confirmReceived('nina');
  assert.equal(mina.getSnapshot().status,'ready_to_close');
  await mina.close();
  await Promise.all([leo.reconnect(),nina.reconnect()]);

  for (const actor of [mina,leo,nina]) {
    assert.equal(actor.getSnapshot().status,'closed');
    assert.equal(actor.getSnapshot().total?.minorUnits,'12000');
    assert.equal(actor.getCanonicalState().closed?.recordId,'record-zurich-dinner');
  }
  assert.equal(mina.getAcceptedEvents().length,9);
});

test('offline payer intent survives provider restart and is applied exactly once after reconnect',async()=>{
  const backend = new MemoryDinnerJourneyDelivery();
  const mina = service('mina',backend,new MemoryKeyValueStorage());
  const ninaStorage = new MemoryKeyValueStorage();
  const ninaDelivery = new SwitchableDelivery(backend);
  let nina = service('nina',ninaDelivery,ninaStorage);
  await mina.start(); await nina.start();
  await mina.createDinner({groupName:'Zurich Dinner',description:'Gusto',totalDecimal:'120.00',currency:'CHF'});
  await nina.reconnect();
  ninaDelivery.online=false;
  await nina.markPaid();
  assert.equal(nina.getSnapshot().status,'sending');
  nina.stop();

  nina = service('nina',ninaDelivery,ninaStorage);
  ninaDelivery.online=true;
  await nina.start();
  assert.equal(nina.getSnapshot().status,'marked_paid');
  await nina.reconnect();
  assert.equal(nina.getAcceptedEvents().filter(event=>event.eventType==='SHARE_MARKED_PAID').length,1);
});

test('wrong roles, incomplete close, and repeated close fail without changing canonical truth',async()=>{
  const delivery = new MemoryDinnerJourneyDelivery();
  const mina = service('mina',delivery,new MemoryKeyValueStorage());
  const leo = service('leo',delivery,new MemoryKeyValueStorage());
  await mina.start(); await leo.start();
  await mina.createDinner({groupName:'Zurich Dinner',description:'Gusto',totalDecimal:'120.00',currency:'CHF'});
  await assert.rejects(()=>leo.confirmReceived('leo'),/Only the receiver/);
  await mina.close();
  assert.equal(mina.getCanonicalState().closed,null);
  await leo.markPaid(); await mina.confirmReceived('leo');
  assert.equal(mina.getCanonicalState().closed,null);
});

function service(actorId:string,delivery:any,storage:MemoryKeyValueStorage){
  const actor=participants.find(person=>person.participantId===actorId)!;
  return new DinnerJourneyService({groupId:'zurich-dinner',actor,participants,signer,verify,storage,delivery,now:()=> '2026-08-13T12:00:00.000Z'});
}
async function digest(bytes:Uint8Array){return new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))}

class SwitchableDelivery {
  online=true;
  constructor(private readonly backend:MemoryDinnerJourneyDelivery){}
  load(groupId:string){if(!this.online) return Promise.reject(new Error('delivery_offline'));return this.backend.load(groupId)}
  publish(event:any){if(!this.online) return Promise.reject(new Error('delivery_offline'));return this.backend.publish(event)}
  subscribe(groupId:string,listener:(event:any)=>void){return this.backend.subscribe(groupId,event=>{if(this.online) listener(event)})}
}
