import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from '../../src/App.tsx';
import '../../src/index.css';
import {DinnerJourneyService, type DinnerJourneyDelivery, type DinnerJourneyParticipant} from '../../src/journey/dinnerJourney.ts';
import type {CanonicalEventV1, CanonicalSigner, CanonicalVerifier} from '../../src/core/moneyEventKernel.ts';
import type {KeyValueStorage} from '../../src/environment/livePayerSync.ts';

declare global {
  interface Window {
    __B4_ACTOR_CONFIG__: {actorId:'mina'|'leo'|'nina'};
    __b4Load(groupId:string):Promise<CanonicalEventV1[]>;
    __b4Publish(event:CanonicalEventV1):Promise<void>;
    __B4_RECEIVE__?: (event:CanonicalEventV1)=>void;
    __B4_SERVICE__?: DinnerJourneyService;
  }
}

const participants: DinnerJourneyParticipant[] = [
  {participantId:'mina',name:'Mina',accountPublicKeyHex:`0x${'11'.repeat(32)}`,role:'organizer'},
  {participantId:'leo',name:'Leo',accountPublicKeyHex:`0x${'22'.repeat(32)}`,role:'member'},
  {participantId:'nina',name:'Nina',accountPublicKeyHex:`0x${'33'.repeat(32)}`,role:'member'},
];
const actor = participants.find(person=>person.participantId===window.__B4_ACTOR_CONFIG__.actorId)!;
const digest = async (bytes:Uint8Array)=>new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
const signer:CanonicalSigner={sign:digest};
const verify:CanonicalVerifier=async(bytes,signature)=>equal(await digest(bytes),signature);
const storage:KeyValueStorage={read:key=>localStorage.getItem(key),write:(key,value)=>localStorage.setItem(key,value),remove:key=>localStorage.removeItem(key)};
const delivery:DinnerJourneyDelivery={
  load:groupId=>window.__b4Load(groupId),
  publish:event=>window.__b4Publish(event),
  subscribe:(_groupId,listener)=>{window.__B4_RECEIVE__=listener;return()=>{delete window.__B4_RECEIVE__}},
};
const service=new DinnerJourneyService({groupId:'zurich-dinner',actor,participants,signer,verify,storage,delivery});
window.__B4_SERVICE__=service;

createRoot(document.getElementById('root')!).render(<StrictMode><App dependencies={{dinnerJourney:{service}}}/></StrictMode>);

function equal(left:Uint8Array,right:Uint8Array){if(left.byteLength!==right.byteLength)return false;return left.every((value,index)=>value===right[index])}
