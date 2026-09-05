import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from '../../src/App.tsx';
import '../../src/index.css';
import {DinnerJourneyService, type DinnerJourneyDelivery, type DinnerJourneyParticipant} from '../../src/journey/dinnerJourney.ts';
import type {CanonicalEventV1, CanonicalSigner, CanonicalVerifier} from '../../src/core/moneyEventKernel.ts';
import type {KeyValueStorage} from '../../src/environment/livePayerSync.ts';

const participant:DinnerJourneyParticipant={participantId:'mina',name:'Mina',accountPublicKeyHex:`0x${'11'.repeat(32)}`,role:'organizer'};
const digest=async(bytes:Uint8Array)=>new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
const signer:CanonicalSigner={sign:digest};
const verify:CanonicalVerifier=async(bytes,signature)=>equal(await digest(bytes),signature);
const storage:KeyValueStorage={read:()=>null,write:()=>undefined,remove:()=>undefined};
const mode=new URLSearchParams(window.location.search).get('state');
const delivery:DinnerJourneyDelivery={
  load:async()=>{
    if(mode==='loading') return await new Promise<CanonicalEventV1[]>(()=>undefined);
    throw new Error('This dinner could not be opened safely.');
  },
  publish:async()=>undefined,
  subscribe:()=>()=>undefined,
};
const service=new DinnerJourneyService({groupId:'hard-state-dinner',actor:participant,participants:[participant],signer,verify,storage,delivery});

createRoot(document.getElementById('root')!).render(<StrictMode><App dependencies={{dinnerJourney:{service}}}/></StrictMode>);

function equal(left:Uint8Array,right:Uint8Array){return left.byteLength===right.byteLength&&left.every((value,index)=>value===right[index])}
