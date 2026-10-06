import {member} from '../create-join/model.js';
import {assertParticipantCommand,signFixture,consumeFixture,currentActor} from '../create-join/authority.js';
import {assertLocalSession} from '../session-guard.js';
import { allGroups, people, resolveScope, makePlan, lowerReceiptPlan, sources, unresolved, fail } from './ledger.js';
import { moneyFromMinorUnits } from '../money-v1.js';
import { upgrade as upgradeExpenses } from '../gate-b/model.js';
export const METHODS = ['TWINT','Bank transfer','PayPal','Cash','Wallet'];
export const STORAGE_KEY = 'chopdot.preview-v2.guest';
export function upgrade(input) {
  const s = structuredClone(input || {});
  s.groups = allGroups(s);
  s.gateC ||= { version: 1, sequence: 0, payments: [], operations: {}, history: [], drafts: {}, environment: {} };
  // Bind legacy expense drafts while their original selected group is still known.
  // Every Gate C repository write (including selecting a group) starts here.
  return upgradeExpenses(s);
}
const fingerprint = value => JSON.stringify(value);
export function scopeProof(p) {
  return { paymentId: p.id, idempotencyKey: p.idempotencyKey, attempt: p.attempt,
    payer: p.payer, recipient: p.recipient, currency: p.currency, exponent: p.exponent,
    amount: p.amount, method: p.method, groupIds: p.groupIds, sourceIds: p.sources.map(r => r.id),
    expiresAt: p.expiresAt, plan: p.plan, transfer: p.transfer };
}
function sameProof(p, proof) {
  if (fingerprint(scopeProof(p)) !== fingerprint(proof)) fail('PROOF', 'This result does not match the exact payment scope.');
}
function validateCurrent(s, p) {
  const nowRows = sources(s, p.payer, p.recipient);
  for (const r of p.sources) {
    const live = nowRows.find(x => x.id === r.id);
    if (!live || live.revision !== r.revision || live.minor !== r.minor || live.disputed) fail('CHANGED', 'Included balances changed or have an issue. Review their current state before continuing.');
  }
}
function online(s) { if (s.gateC.environment.offline || s.gateB?.environment.offline) fail('OFFLINE','Offline. Showing saved status; reconnect before changing this payment.'); }
function assertExclusive(s,p) {
  const other=s.gateC.payments.find(x=>x.id!==p.id&&x.state!=='partial'&&unresolved(s,x)&&x.sources.some(r=>p.sources.some(a=>a.id===r.id)));
  if(other)fail('IN_PROGRESS','Another payment is already in progress for these source items.',{paymentId:other.id});
}
export function transition(input, c, authority = 'user', now = new Date().toISOString()) {
  const s = upgrade(input), g = s.gateC;
  assertLocalSession(s,c.actor);
  if (!c.operationId) fail('OPERATION', 'An operation identity is required.');
  const fp = fingerprint({ command: c, authority });
  if (g.operations[c.operationId]) {
    if (g.operations[c.operationId] !== fp) fail('OPERATION','This operation identity belongs to another action.');
    return s;
  }
  assertParticipantCommand(s,c);
  if (!people(s).some(p => p.id === c.actor)) fail('PERMISSION','Choose a participant in this prototype.');
  if (c.type === 'prepare') {
    online(s);
    if (authority !== 'user' || c.actor !== c.scope?.payer) fail('PERMISSION','Only the payer can prepare this payment.');
    if (!c.id || !c.idempotencyKey || g.payments.some(p => p.id === c.id || p.idempotencyKey === c.idempotencyKey)) fail('IDENTITY','Reuse the existing payment identity.');
    if (!METHODS.includes(c.method)) fail('METHOD','Choose an available payment method.');
    if (g.environment.noMethod) fail('METHOD','Payment details are unavailable. Request details or choose another available method.');
    const scope = resolveScope(s,c.scope);
    moneyFromMinorUnits(c.amount, c.scope.currency, c.scope.exponent ?? 2);
    const plan = makePlan(scope.rows,c.amount,c.plan);
    if (!c.reviewed) fail('REVIEW','Review the amount and resulting group balances.');
    // Open partials allow a new, explicitly linked payment of their remainder.
    // They never permit retrying the previously accepted amount.
    const overlapping = g.payments.filter(p => unresolved(s,p) && [p.payer,p.recipient].includes(c.scope.payer) && [p.payer,p.recipient].includes(c.scope.recipient) && p.currency === c.scope.currency && p.exponent === (c.scope.exponent ?? 2) && p.sources.some(r=>scope.rows.some(x=>x.id===r.id)));
    if (overlapping.some(p => p.state !== 'partial')) fail('IN_PROGRESS','A payment is already in progress. Reopen its status.', { paymentId: overlapping.find(p=>p.state!=='partial').id });
    if (overlapping.length && fingerprint(c.remainderOf || []) !== fingerprint(overlapping.map(p=>p.id))) fail('REMAINDER','Review the open remainder before starting another payment.');
    const p = { id:c.id,idempotencyKey:c.idempotencyKey,payer:c.scope.payer,recipient:c.scope.recipient,
      currency:c.scope.currency,exponent:c.scope.exponent??2,groupIds:[...c.scope.groupIds],scopeKind:c.scope.kind||'person',
      amount:String(c.amount),original:scope.total,sources:scope.rows,plan,method:c.method,
      createdAt:now,expiresAt:new Date(Date.parse(now)+15*60*1000).toISOString(),attempt:1,
      state:'prepared',confirmed:'0',applications:[],retryEligible:false,remainderOf:c.remainderOf||[],
      transfer:c.method==='Wallet' ? { asset:'DOT',exponent:6,minorUnits:'7812500',quote:'approved-demo-5430-chf' } : null };
    if (p.method==='Wallet' && (p.currency!=='CHF'||p.exponent!==2||p.amount!=='5430')) fail('QUOTE','The available demo wallet quote covers CHF 54.30 only. Choose another method for this amount.');
    g.payments.push(p); delete g.drafts[c.actor];
  } else {
    const p = g.payments.find(p=>p.id===c.id);
    if (!p) fail('NOT_FOUND','This payment is no longer available.');
    if (![p.payer,p.recipient].includes(c.actor)) fail('PERMISSION','This payment belongs to its payer and recipient.');
    const payer = () => { if (authority!=='user'||c.actor!==p.payer) fail('PERMISSION','Only the payer can perform this action.'); };
    const simulator = () => { if(authority!=='prototype-fixture') fail('AUTHORITY','This transition needs a separately accepted result.'); sameProof(p,c.proof); };
    if (c.type === 'start') {
      payer();online(s);
      if(p.state!=='prepared') fail('STATE','Reopen the current payment status.');
      assertExclusive(s,p);
      if(Date.parse(now)>Date.parse(p.expiresAt)) fail('EXPIRED','The reviewed payment expired. Cancel it and review the current balance.');
      validateCurrent(s,p);
      if(p.method==='Wallet' && g.environment.walletProblem) fail('WALLET',g.environment.walletProblem);
      p.state=p.method==='Wallet'?'approval_waiting':'started';
    } else if(c.type==='sent') {
      payer();online(s);
      if(p.method==='Wallet'||p.state!=='started') fail('STATE','A sent claim is available only for a started external payment.');
      p.state='sent';p.sentAt=now;
    } else if(c.type==='not_received') {
      online(s);
      if(authority!=='user'||c.actor!==p.recipient||!['sent','not_received','unknown','recovering'].includes(p.state)||p.method==='Wallet') fail('PERMISSION','Only this recipient can report a pending external payment as not received.');
      if(!['unknown','recovering'].includes(p.state))p.state='not_received';
      p.lastRecipientReport={result:'not-received',at:now};
    } else if(c.type==='confirm') {
      online(s);
      if(authority!=='user'||c.actor!==p.recipient||!['sent','not_received','unknown','recovering'].includes(p.state)||p.method==='Wallet') fail('PERMISSION','Only the canonical recipient can confirm this external payment.');
      let received;try{received=moneyFromMinorUnits(c.amount,p.currency,p.exponent).minorUnits;}catch{fail('AMOUNT','Use an exact canonical minor-unit amount.');}
      validateCurrent(s,p);p.receiptPlan=lowerReceiptPlan(p,received);
      p.confirmed=received;p.confirmedAt=now;p.confirmation='recipient';p.state='received';
    } else if(c.type==='close') {
      simulator();online(s);
      if(p.state!=='received'||!p.receiptPlan) fail('STATE','An accepted exact receipt is required before closure.');
      validateCurrent(s,p);p.applications=structuredClone(p.receiptPlan.applications);p.closedAt=now;
      p.state=BigInt(p.original)===BigInt(p.confirmed)?'closed':'partial';p.retryEligible=false;
    } else if(c.type==='unknown') {
      simulator();
      if(!['started','sent','approval_waiting','submitted','checking'].includes(p.state)) fail('STATE','This payment cannot become unknown from its current state.');
      p.state='unknown';p.retryEligible=false;
    } else if(c.type==='recover') {
      payer();online(s);
      if(!['unknown','recovering'].includes(p.state)) fail('STATE','Recovery applies to the existing unknown payment.');
      p.state='recovering';p.retryEligible=false;
    } else if(c.type==='no_effect') {
      simulator();online(s);
      if(!['unknown','recovering','approval_waiting','prepared','started'].includes(p.state)) fail('STATE','Nonexecution cannot replace an accepted or received result.');
      if(!['failed','cancelled','expired'].includes(c.result)) fail('RESULT','Choose an exact known nonexecution result.');
      p.state=c.result;p.retryEligible=true;p.nonexecutionAt=now;
    } else if(c.type==='retry') {
      payer();online(s);
      if(!p.retryEligible||!['failed','cancelled','expired'].includes(p.state)) fail('RETRY','Recover the existing payment first. Retry requires proven nonexecution.');
      assertExclusive(s,p);
      validateCurrent(s,p);p.retryEligible=false;p.attempt++;p.state='prepared';
      p.expiresAt=new Date(Date.parse(now)+15*60*1000).toISOString();
    } else if(c.type==='cancel') {
      payer();online(s);
      if(p.state!=='prepared') fail('TOO_LATE','This payment may have started. Recover its result before changing methods or retrying.');
      p.state='cancelled';p.retryEligible=true;p.nonexecutionAt=now;
    } else if(c.type==='wallet_submitted') {
      simulator();online(s);validateCurrent(s,p);
      if(p.method!=='Wallet'||p.state!=='approval_waiting') fail('STATE','A matching approval result is required.');
      if(Date.parse(now)>Date.parse(p.expiresAt)) fail('EXPIRED','The wallet approval expired. Recover its exact outcome.');
      p.state='submitted';p.sentAt=now;
    } else if(c.type==='wallet_received') {
      simulator();online(s);validateCurrent(s,p);
      if(p.method!=='Wallet'||!['submitted','checking','unknown','recovering'].includes(p.state)) fail('STATE','Only the matching submitted wallet transfer can be received.');
      p.receiptPlan=lowerReceiptPlan(p,p.amount);p.confirmed=p.amount;p.confirmedAt=now;p.confirmation='simulated-wallet-result';p.state='received';
    } else if(c.type==='reverse') {
      simulator();online(s);
      if(!['closed','partial'].includes(p.state)) fail('STATE','Only an accepted payment can be reversed.');
      const affected=new Set(p.applications.filter(a=>BigInt(a.minor)!==0n).map(a=>a.sourceId));
      if(g.payments.some(x=>x.id!==p.id&&unresolved(s,x)&&x.sources.some(r=>affected.has(r.id)))) fail('DEPENDENCY','An unresolved payment depends on these source balances. Resolve that payment before reversing.');
      p.state='reversed';p.reversedAt=now;p.retryEligible=false;
    } else fail('OPERATION','Unknown payment operation.');
  }
  g.operations[c.operationId]=fp;g.sequence++;
  g.history.push({operationId:c.operationId,paymentId:c.id,actor:c.actor,type:c.type,authority,at:now,localOnly:true,after:structuredClone(g.payments.find(p=>p.id===c.id))});
  return s;
}
export function repository(storage, assertWriter=()=>{}) {
  const read=()=>upgrade(JSON.parse(storage.getItem(STORAGE_KEY)||'{}'));
  const write=s=>{assertWriter();storage.setItem(STORAGE_KEY,JSON.stringify(s));return s;};
  return { read, commit(c,authority='user'){const s=read();if(s.gateC.environment.failSave)fail('SAVE','Could not save. The accepted payment state is unchanged.');const signed=signFixture(s,c);const next=write(transition(s,signed,authority));consumeFixture(signed);return next;},
    saveDraft(actor,draft){const s=read();s.gateC.drafts[actor]=structuredClone(draft);return write(s);},
    setEnvironment(env){const s=read();s.gateC.environment=structuredClone(env);return write(s);},
    selectGroup(id){const s=read(),p=member(s,currentActor());if(p&&p.groupId!==id)fail('PERMISSION','This participant belongs to one joined group.');const g=allGroups(s).find(g=>g.id===id);if(!g)fail('GROUP','Group not found.');s.group=g;return write(s);},
    addFixture(fixture){const s=read();if(s.gateC.fixtureAdded)return s;const next=fixture(s);next.gateC.fixtureAdded=true;return write(next);}
  };
}
