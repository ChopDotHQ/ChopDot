import test from '../test-runner.mjs';
import assert from 'node:assert/strict';
import {upgrade,guestDraftView,putGuestDraft,savedDraft,repository,newDraft} from './model.js';
const seed=()=>({group:{id:'g',name:'Local',currency:'CHF'},people:[],expenses:[]});
const legacy={version:2,expenseId:'expense-1',operationId:'op-1',groupId:'g',currency:'CHF',amountText:'12.34',description:'Coffee',payerId:'self',participantIds:['self'],method:'equal',receipt:null};
test('guest legacy draft migrates once with identity and raw input intact',()=>{
 const s=upgrade({...seed(),expenseDraft:legacy});assert.equal(Object.hasOwn(s,'expenseDraft'),false);
 assert.equal(savedDraft(s,'self').id,legacy.expenseId);assert.equal(savedDraft(s,'self').operationId,legacy.operationId);
 assert.equal(guestDraftView(s).allocation.total.minorUnits,'1234');assert.deepEqual(upgrade(s),s);
});
test('guest writes are readable by the integrated editor and vice versa',()=>{
 let raw=JSON.stringify(seed());const storage={getItem:()=>raw,setItem:(k,v)=>{raw=v;}};
 const repo=repository(storage,{}),s=repo.read();putGuestDraft(s,legacy);raw=JSON.stringify(s);
 const d=savedDraft(repo.read(),'self');d.amountText='23.45';d.description='Updated';repo.saveDraft('self',d);
 const view=guestDraftView(repo.read());assert.equal(view.amountText,'23.45');assert.equal(view.description,'Updated');assert.equal(view.expenseId,'expense-1');
 assert.equal(Object.hasOwn(JSON.parse(raw),'expenseDraft'),false);
});
test('invalid raw amount survives migration without manufacturing an allocation',()=>{
 const s=upgrade({...seed(),expenseDraft:{...legacy,amountText:'not money'}});assert.equal(guestDraftView(s).amountText,'not money');assert.equal(guestDraftView(s).allocation,null);
});
test('guest compatibility view never flattens an exact split or correction',()=>{
 const s=upgrade(seed()),d=newDraft(s);d.method='exact';s.gateB.drafts.self=d;assert.equal(guestDraftView(s),null);
 d.method='equal';d.baseRevision=2;assert.equal(guestDraftView(s),null);
});
test('clearing guest draft leaves accepted records and other group drafts intact',()=>{
 const s=upgrade({...seed(),gateC:{},expenseDraft:legacy});s.gateB.drafts[JSON.stringify(['self','other'])]={id:'other'};
 const before=structuredClone(s.expenses);putGuestDraft(s,null);assert.equal(savedDraft(s,'self'),undefined);assert.deepEqual(s.expenses,before);assert.equal(s.gateB.drafts[JSON.stringify(['self','other'])].id,'other');
});
test('guest compatibility round-trip preserves a chosen date and receipt',()=>{
 const s=upgrade(seed());putGuestDraft(s,{...legacy,date:'2026-01-02',receipt:{name:'receipt.txt'}});
 const view=guestDraftView(s);putGuestDraft(s,view);assert.equal(savedDraft(s,'self').date,'2026-01-02');assert.deepEqual(savedDraft(s,'self').receipt,{name:'receipt.txt'});
});
test('an existing integrated draft and older guest draft both survive upgrade',async()=>{
 const {restoreRecoveredDraft}=await import('./model.js');const s=upgrade(seed());s.gateB.drafts.self={...newDraft(s),id:'integrated',description:'Keep me'};s.expenseDraft=legacy;
 const migrated=upgrade(s);assert.equal(savedDraft(migrated,'self').id,'integrated');assert.equal(migrated.gateB.recoveredDrafts[0].draft.id,'expense-1');assert.equal(upgrade(migrated).gateB.recoveredDrafts.length,1);
 restoreRecoveredDraft(migrated,'self','expense-1');assert.equal(savedDraft(migrated,'self').id,'expense-1');assert.equal(migrated.gateB.recoveredDrafts[0].draft.description,'Keep me');
 assert.throws(()=>restoreRecoveredDraft(migrated,'other','integrated'),/unavailable/);
});
test('recovered drafts are unavailable after sign-out, expiry or group deletion',async()=>{
 const {recoverableDrafts,restoreRecoveredDraft}=await import('./model.js');const s=upgrade(seed());s.gateB.recoveredDrafts=[{actor:'self',groupId:'g',draft:{id:'recovered'}}];
 assert.equal(recoverableDrafts(s,'self').length,1);
 for(const status of ['signed-out','expired']){const blocked=structuredClone(s);blocked.gateD={session:{status},account:{status:'active'}};assert.deepEqual(recoverableDrafts(blocked,'self'),[]);assert.throws(()=>restoreRecoveredDraft(blocked,'self','recovered'),/Sign in/);}
 s.group.deleted=true;assert.deepEqual(recoverableDrafts(s,'self'),[]);assert.throws(()=>restoreRecoveredDraft(s,'self','recovered'),/unavailable/);
});
