import { upgrade as upgradeLedger } from '../gate-c/model.js';
import { allGroups, sources, unresolved, fail } from '../gate-c/ledger.js';
export const KEY='chopdot.preview-v2.guest';
const clone=structuredClone;
export function upgrade(input){
 const s=upgradeLedger(input);s.gateD||={version:1,account:{displayName:'You',appearance:'System',activity:true,reminders:true,pushPreference:false,revision:1,status:'active'},session:{status:s.accountCreated?'active':'guest',participantId:'self'},operations:{},history:[],read:{},environment:{},draft:null};return s;
}
export const offline=s=>!!(s.gateD?.environment.offline||s.gateC?.environment.offline||s.gateB?.environment.offline);
export function available(s,actor='self'){if(!['self',...(s.people||[]).map(p=>p.id)].includes(actor))fail('PERMISSION','Unknown participant.');if(['signed-out','expired'].includes(s.gateD?.session.status)||s.gateD?.account.status==='deleted')fail('SESSION','Sign in through Entry before continuing. Your records are preserved.');}
function fresh(s){if(offline(s))fail('OFFLINE','Saved account view is read-only offline.');if(s.gateD.environment.readFailed)fail('READ','Could not refresh current account truth.');}
export function deletionBlockers(s){return {owners:allGroups(s).filter(g=>!g.archived&&(g.ownerId||'self')==='self'),money:sources(s,'self').filter(r=>BigInt(r.minor)!==0n),pending:(s.gateC?.payments||[]).filter(p=>[p.payer,p.recipient].includes('self')&&unresolved(s,p))};}
export const pending=s=>Object.values(s.gateD.operations).find(o=>['pending','unknown'].includes(o.status));
function validate(s,kind,values){
 if(kind==='profile'){if(typeof values.displayName!=='string'||!values.displayName.trim()||values.displayName.trim().length>60)fail('INVALID','Use a display name between 1 and 60 characters.');return {displayName:values.displayName.trim()};}
 if(kind==='appearance'){if(!['System','Light','Dark'].includes(values.appearance))fail('INVALID','Choose System, Light or Dark.');return {appearance:values.appearance};}
 if(kind==='notifications'){if(['activity','reminders','pushPreference'].some(k=>typeof values[k]!=='boolean'))fail('INVALID','Choose each notification preference.');return Object.fromEntries(['activity','reminders','pushPreference'].map(k=>[k,values[k]]));}
 if(kind==='signout')return {};
 if(kind==='deletion'){const b=deletionBlockers(s);if(b.owners.length)fail('OWNER','Transfer or resolve active group ownership first.');if(b.money.length||b.pending.length)fail('MONEY','Resolve outstanding money before deleting your account.');if(values.confirmation!==s.gateD.account.displayName)fail('CONFIRM','Type the exact current display name.');return {confirmation:values.confirmation};}
 fail('OPERATION','Unknown account operation.');
}
function accept(s,o,now){
 if(o.baseRevision!==s.gateD.account.revision)fail('CONFLICT','Newer account truth is preserved. Refresh and review again.');
 const v=validate(s,o.kind,o.values);
 if(o.kind==='signout')s.gateD.session.status='signed-out';
 else if(o.kind==='deletion'){s.gateD.account.status='deleted';s.gateD.session.status='signed-out';s.accountCreated=false;}
 else Object.assign(s.gateD.account,v);
 s.gateD.account.revision++;o.status='succeeded';o.acceptedAt=now;
 s.gateD.history.push({id:o.id,kind:o.kind,participantId:'self',at:now,after:clone(s.gateD.account)});s.gateD.draft=null;
}
export function transition(input,c,authority='user',now=new Date().toISOString()){
 const s=upgrade(input),d=s.gateD;
 if(c.type==='entry'){
  if(authority!=='entry-verified')fail('AUTHORITY','Entry owns the verified local session result.');
  if(d.account.status==='deleted')fail('DELETED','This prototype account working state was removed. Shared participant history is retained.');
  if(pending(s))fail('PENDING','Reconcile the existing account operation before restoring a session.');
  d.session={status:c.guest?'guest':'active',participantId:'self'};if(!c.guest)s.accountCreated=true;return s;
 }
 available(s,c.actor||'self');
 if(c.type==='read'){d.read[c.actor||'self']||={};for(const id of c.ids||[])d.read[c.actor||'self'][id]=true;return s;}
 if(c.type==='fixture'){
  if(authority!=='prototype-fixture')fail('AUTHORITY','Only explicit prototype fixtures can alter external preconditions.');
  Object.assign(d.environment,c.patch);return s;
 }
 if(c.actor&&c.actor!=='self')fail('PERMISSION','This account belongs to the local session participant.');
 if(d.session.status!=='active')fail('ACCOUNT','Sign in through Entry to change account preferences. Guest participation remains valid.');
 fresh(s);
 if(c.type==='draft'){if(pending(s))fail('PENDING','Reconcile the existing operation first.');d.draft={kind:c.kind,values:clone(c.values),baseRevision:c.baseRevision??d.account.revision};return s;}
 if(c.type==='discard'){d.draft=null;return s;}
 if(c.type==='begin'){
  if(!c.id)fail('IDENTITY','An operation reference is required.');
  const existing=d.operations[c.id];if(existing){if(existing.fingerprint!==JSON.stringify([c.kind,c.values||{},c.baseRevision]))fail('IDENTITY','This operation identity belongs to another action.');return s;}
  if(pending(s))fail('PENDING','Reconcile the same operation before starting another.');
  if(c.baseRevision!==d.account.revision)fail('CONFLICT','Account settings changed. Refresh and review the newer state.');
  const values=validate(s,c.kind,c.values||{});
  const o={id:c.id,kind:c.kind,values,fingerprint:JSON.stringify([c.kind,c.values||{},c.baseRevision]),baseRevision:c.baseRevision,status:'pending',createdAt:now};d.operations[c.id]=o;
  if(d.environment.failSave){o.status='no-effect';o.result='Known pre-effect failure';}
  else if(d.environment.unknown)o.status='unknown';
  else accept(s,o,now);
  return s;
 }
 if(c.type==='reconcile'){
  const o=d.operations[c.id];if(!o)fail('NOT_FOUND','The operation reference is unavailable. No replacement was started.');
  if(!['pending','unknown'].includes(o.status))return s;
  if(authority!=='prototype-fixture')return s; // A read alone cannot invent an external result.
  if(c.result==='no-effect'){o.status='no-effect';o.result='Verified no effect';}
  else if(c.result==='succeeded')accept(s,o,now);
  else if(c.result!=='pending')fail('RESULT','Unknown reconciliation result.');
  return s;
 }
 fail('OPERATION','Unknown account command.');
}
export function repository(storage,assertWriter=()=>{}){
 const read=()=>upgrade(JSON.parse(storage.getItem(KEY)||'{}'));
 const write=s=>{assertWriter();storage.setItem(KEY,JSON.stringify(s));return s;};
 return {read,commit(c,a='user'){return write(transition(read(),c,a));}};
}
// Read-only projections. Event identity belongs to the accepted owner history, not delivery order.
export function canOpenExpense(s,e,actor){return !!e&&!e.deleted&&!s.gateD?.environment.revokedGroups?.includes(e.groupId)&&[e.ownerId,e.payerId,...e.participantIds].includes(actor);}
export function activity(input,actor='self'){
 const s=upgrade(input);available(s,actor);const events=[],attention=[];
 for(const h of s.gateB.history){const current=s.expenses.find(e=>e.id===h.expenseId);if(!current||!canOpenExpense(s,{...current,deleted:false},actor))continue;
  const labels={create:'Expense added',edit:'Expense updated',delete:'Expense removed',agree:'Expense agreed',issue:'Issue raised',reply:'Issue reply',withdraw:'Issue withdrawn',still_off:'Issue reassessed'};
  if(labels[h.type])events.push({id:'expense:'+h.operationId,owner:'expense',recordId:h.expenseId,groupId:current.groupId,title:labels[h.type],detail:h.after.description,money:h.after.money,at:h.at,revision:h.after.revision});
 }
 for(const e of s.expenses.filter(e=>canOpenExpense(s,e,actor))){const issues=e.issues.filter(i=>i.status==='open');let title;
  if(issues.length&&(e.ownerId===actor||issues.some(i=>i.reviewerId===actor)))title='Open issue';else if(e.reviews[actor]&&e.reviews[actor].status!=='agreed')title='Expense needs your review';
  if(title)attention.push({id:`attention:expense:${e.id}`,owner:'expense',recordId:e.id,groupId:e.groupId,title,detail:e.description,money:e.money,revision:e.revision});
 }
 const labels={sent:'Payment waiting',unknown:'Payment result unknown',confirm:'Receipt confirmed',close:'Payment completed',wallet_submitted:'Payment waiting',wallet_received:'Receipt confirmed',no_effect:'Payment did not execute',cancel:'Payment cancelled',reverse:'Payment reversed'};
 for(const h of s.gateC.history){const p=s.gateC.payments.find(p=>p.id===h.paymentId);if(!p||![p.payer,p.recipient].includes(actor)||!labels[h.type])continue;
  events.push({id:'payment:'+h.operationId,owner:'payment',recordId:p.id,title:h.type==='close'&&h.after.state==='partial'?'Payment partly completed':labels[h.type],detail:p.method,money:{v:1,minorUnits:['confirm','wallet_received','close'].includes(h.type)?h.after.confirmed:h.after.amount,currency:p.currency,exponent:p.exponent},at:h.at,status:h.after.state});
 }
 for(const p of s.gateC.payments.filter(p=>[p.payer,p.recipient].includes(actor)&&unresolved(s,p)))attention.push({id:'attention:payment:'+p.id,owner:'payment',recordId:p.id,title:p.state==='partial'?'Open payment remainder':p.state==='sent'&&p.recipient===actor?'Confirm receipt':'Payment needs attention',detail:p.state,money:{v:1,minorUnits:p.state==='partial'?sources(s,p.payer,p.recipient).filter(r=>p.sources.some(a=>a.id===r.id)).reduce((n,r)=>n+BigInt(r.minor),0n).toString():p.amount,currency:p.currency,exponent:p.exponent},status:p.state});
 return {events:[...new Map(events.map(e=>[e.id,e])).values()].sort((a,b)=>(b.at||'').localeCompare(a.at||'')||a.id.localeCompare(b.id)),attention};
}
export function openItem(input,item,actor='self'){
 const s=upgrade(input);available(s,actor);
 if(s.gateD.environment.readFailed)fail('READ','Current record could not be loaded. Retry reading its owner.');
 if(offline(s))fail('OFFLINE','Reconnect to check the current record. Saved activity may be out of date.');
 if(item.owner==='expense'){const e=s.expenses.find(e=>e.id===item.recordId);if(!canOpenExpense(s,e,actor))fail('ACCESS','Access changed. This group record is unavailable.');return {owner:'expense',id:e.id,group:e.groupId,stale:item.revision!==e.revision};}
 const p=s.gateC.payments.find(p=>p.id===item.recordId);if(!p||![p.payer,p.recipient].includes(actor))fail('ACCESS','This payment record is unavailable.');return {owner:'payment',id:p.id,stale:item.status!==p.state};
}
