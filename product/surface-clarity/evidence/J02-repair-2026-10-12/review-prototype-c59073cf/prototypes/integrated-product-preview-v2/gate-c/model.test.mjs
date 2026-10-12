import test from '../test-runner.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transition, upgrade, scopeProof, repository } from './model.js';
import { sources, pairs, balances, resolveScope, makePlan, unresolved } from './ledger.js';
import { addGoldenExample } from './fixtures.js';
import { transition as expenseTransition, editDraft, newDraft, position as groupPosition, upgrade as upgradeB, repository as repositoryB, savedDraft } from '../gate-b/model.js';
const core=JSON.parse(readFileSync(new URL('../gate-b/contract/semantic-core.json',import.meta.url)));
const now='2026-10-03T11:00:00.000Z';
const seed=()=>addGoldenExample({},core);
const scope=(groupIds=['gc-apartment','gc-ski'])=>({payer:'self',recipient:'gc-jeanine',currency:'CHF',exponent:2,groupIds,kind:groupIds.length===1?'group':'person'});
const command=(type,extra={})=>({type,actor:'self',id:'payment-1',operationId:crypto.randomUUID(),...extra});
const step=(s,c,authority='user')=>transition(s,c,authority,now);
const payment=s=>s.gateC.payments.at(-1);
const prepare=(s=seed(),extra={})=>step(s,command('prepare',{idempotencyKey:crypto.randomUUID(),scope:scope(),amount:'5430',method:'TWINT',reviewed:true,plan:{useOffsets:true},...extra}));
const start=s=>step(s,command('start',{id:payment(s).id}));
const sent=s=>step(s,command('sent',{id:payment(s).id}));
const confirm=(s,amount=payment(s).amount)=>step(s,command('confirm',{id:payment(s).id,actor:payment(s).recipient,amount}));
const fixture=(s,type,extra={})=>step(s,command(type,{id:payment(s).id,proof:scopeProof(payment(s)),...extra}),'prototype-fixture');
const close=s=>fixture(s,'close');
const finish=s=>close(confirm(sent(start(s))));
const debt=(s,g=null)=>pairs(s,'self',g).find(p=>p.other==='gc-jeanine'&&p.currency==='CHF')?.minor||'0';
const rejected=(fn,code)=>assert.throws(fn,e=>e.code===code);

test('GC-SEC-006: legacy expense draft keeps original group/currency through Gate C group selection',()=>{
 let initial=upgradeB({group:{id:'old',name:'Old',currency:'CHF'},people:[{id:'p',name:'Person'}],expenses:[]});
 const legacy={...newDraft(initial,'self','legacy-draft'),amountText:'12.34',description:'CHF draft'};delete legacy.groupId;
 initial.gateB.drafts.self=legacy;
 let data=JSON.stringify(initial);const storage={getItem:()=>data,setItem:(_,v)=>{data=v;}},c=repository(storage),b=repositoryB(storage,core);
 c.addFixture(s=>{s.groups.push({id:'new',name:'New',currency:'EUR'});return s;});c.selectGroup('new');
 assert.equal(savedDraft(b.read(),'self'),undefined);
 const eur={...newDraft(b.read(),'self','eur-draft'),amountText:'9.00',description:'EUR draft'};b.saveDraft('self',eur);
 c.selectGroup('old');assert.deepEqual(savedDraft(b.read(),'self'),{...legacy,groupId:'old'});
 c.selectGroup('new');assert.deepEqual(savedDraft(b.read(),'self'),eur);
 const accepted=b.commit({type:'create',id:eur.id,actor:'self',operationId:eur.operationId,draft:eur});
 assert.equal(accepted.expenses.at(-1).money.currency,'EUR');assert.equal(savedDraft(accepted,'self'),undefined);
 c.selectGroup('old');assert.equal(savedDraft(b.read(),'self').operationId,legacy.operationId);
});

test('Golden obligations derive from accepted expenses; currencies remain separate',()=>{
 const s=seed();assert.equal(debt(s),'5430');assert.equal(debt(s,'gc-apartment'),'7430');assert.equal(debt(s,'gc-ski'),'-2000');
 assert.equal(balances(s,'self')['CHF:2'],'13220');assert.equal(balances(s,'self')['EUR:2'],'-1800');
 assert.equal(s.gateB.history.filter(h=>h.type==='create').length,9);
});
test('group full settlement leaves other group untouched and group active',()=>{
 const s=finish(prepare(seed(),{scope:scope(['gc-apartment']),amount:'7430'}));
 assert.equal(debt(s,'gc-apartment'),'0');assert.equal(debt(s,'gc-ski'),'-2000');assert.equal(debt(s),'-2000');
 assert.equal(s.groups.find(g=>g.id==='gc-apartment').archived,undefined);
});
test('person full settlement consumes explained offsets and clears both group residuals',()=>{
 const s=finish(prepare());assert.equal(debt(s),'0');assert.equal(debt(s,'gc-apartment'),'0');assert.equal(debt(s,'gc-ski'),'0');
 assert.equal(payment(s).applications.reduce((n,a)=>n+BigInt(a.minor),0n),5430n);
});
test('group partial payment applies only inside selected group',()=>{
 const s=finish(prepare(seed(),{scope:scope(['gc-apartment']),amount:'2000'}));
 assert.equal(debt(s,'gc-apartment'),'5430');assert.equal(debt(s,'gc-ski'),'-2000');assert.equal(payment(s).state,'partial');
});
test('reviewed person partial can consume offsets',()=>{
 const s=finish(prepare(seed(),{amount:'2000'}));assert.equal(debt(s),'3430');assert.equal(debt(s,'gc-apartment'),'3430');assert.equal(debt(s,'gc-ski'),'0');
});
test('reviewed person partial can retain offset credit',()=>{
 const s=finish(prepare(seed(),{amount:'2000',plan:{useOffsets:false}}));assert.equal(debt(s),'3430');assert.equal(debt(s,'gc-apartment'),'5430');assert.equal(debt(s,'gc-ski'),'-2000');
});
test('custom per-source amounts conserve money and reject over-allocation',()=>{
 const rows=[{id:'a',minor:'1001',recordedOrder:0},{id:'b',minor:'1002',recordedOrder:1}];
 const p=makePlan(rows,'1001',{cashBySource:{a:'500',b:'501'}});assert.deepEqual(p.after.map(r=>r.minor),['501','501']);
 rejected(()=>makePlan(rows,'1001',{cashBySource:{a:'500',b:'500'}}),'ALLOCATION');
 rejected(()=>makePlan(rows,'1001',{cashBySource:{a:'1002',b:'-1'}}),'ALLOCATION');
 rejected(()=>makePlan(rows,'1001',{order:['a','a']}),'ALLOCATION');
});
test('changing reviewed source order changes distribution without changing total',()=>{
 const rows=[{id:'a',minor:'1000'},{id:'b',minor:'1000'}];
 assert.deepEqual(makePlan(rows,'1200',{order:['b','a']}).after.map(r=>r.minor),['800','0']);
});
test('prepared, sent, received and closed are distinct and only closure updates position',()=>{
 let s=prepare();assert.equal(debt(s),'5430');s=start(s);assert.equal(payment(s).state,'started');
 s=sent(s);assert.equal(payment(s).state,'sent');assert.equal(debt(s),'5430');
 s=confirm(s);assert.equal(payment(s).state,'received');assert.equal(debt(s),'5430');
 s=close(s);assert.equal(debt(s),'0');
});
test('only recipient can confirm; lower amount retains reviewed source limits',()=>{
 let s=sent(start(prepare()));rejected(()=>step(s,command('confirm',{amount:'5430'})),'PERMISSION');
 rejected(()=>step(s,command('confirm',{actor:'gc-marc',amount:'5430'})),'PERMISSION');
 rejected(()=>confirm(s,'5431'),'AMOUNT');s=close(confirm(s,'4000'));assert.equal(debt(s),'1430');assert.equal(payment(s).confirmed,'4000');
});
test('recipient not-yet does not close or grant payer confirmation authority',()=>{
 let s=sent(start(prepare()));s=step(s,command('not_received',{actor:'gc-jeanine'}));assert.equal(payment(s).state,'not_received');assert.equal(debt(s),'5430');
 s=close(confirm(s));assert.equal(debt(s),'0');
});
test('closure requires separate accepted authority and exact proof',()=>{
 const s=confirm(sent(start(prepare())));rejected(()=>step(s,command('close',{proof:scopeProof(payment(s))})),'AUTHORITY');
 rejected(()=>fixture(s,'close',{proof:{...scopeProof(payment(s)),amount:'100'}}),'PROOF');
 rejected(()=>fixture(s,'close',{proof:{...scopeProof(payment(s)),groupIds:['gc-apartment']}}),'PROOF');
});
test('payment operation replay is idempotent and altered replay is rejected',()=>{
 const original=prepare();const c=command('start');const once=step(original,c);assert.deepEqual(step(once,c),once);
 rejected(()=>step(once,{...c,type:'sent'}),'OPERATION');
 let s=confirm(sent(once));const closeCommand=command('close',{proof:scopeProof(payment(s))});s=step(s,closeCommand,'prototype-fixture');
 assert.deepEqual(step(s,closeCommand,'prototype-fixture'),s);
});
test('possible effect blocks duplicate payment, including reversed pair preparation',()=>{
 const s=start(prepare());rejected(()=>prepare(s,{id:'new'}),'IN_PROGRESS');
 const other=scope(['gc-ski']);other.payer='gc-jeanine';other.recipient='self';
 rejected(()=>prepare(s,{id:'new',actor:'gc-jeanine',scope:other,amount:'2000'}),'IN_PROGRESS');
});
test('unknown must reconcile the same identity before one retry',()=>{
 let s=fixture(start(prepare()),'unknown');rejected(()=>step(s,command('retry')),'RETRY');
 s=step(s,command('recover'));assert.equal(payment(s).id,'payment-1');assert.equal(payment(s).state,'recovering');
 const oldProof=scopeProof(payment(s));s=fixture(s,'no_effect',{result:'failed'});s=step(s,command('retry'));
 assert.equal(payment(s).id,'payment-1');assert.equal(payment(s).attempt,2);assert.equal(payment(s).retryEligible,false);
 rejected(()=>step(s,command('retry')),'RETRY');rejected(()=>fixture(s,'no_effect',{result:'failed',proof:oldProof}),'PROOF');
});
test('unknown and post-start cancellation cannot create method-change escape',()=>{
 let s=start(prepare());rejected(()=>step(s,command('cancel')),'TOO_LATE');s=fixture(s,'unknown');rejected(()=>prepare(s,{id:'other',method:'Cash'}),'IN_PROGRESS');
});
test('known pre-execution cancellation allows fresh reviewed method choice',()=>{
 let s=step(prepare(),command('cancel'));s=prepare(s,{id:'other',method:'Cash'});assert.equal(payment(s).method,'Cash');
});
test('offline and failed storage keep accepted state unchanged',()=>{
 let s=prepare();s.gateC.environment.offline=true;const before=structuredClone(s);rejected(()=>start(s),'OFFLINE');assert.deepEqual(s,before);
 s.gateC.environment.offline=false;s.gateC.environment.failSave=true;let data=JSON.stringify(s);const repo=repository({getItem:()=>data,setItem:(_,v)=>{data=v;}});rejected(()=>repo.commit(command('start')),'SAVE');assert.equal(JSON.stringify(repo.read()),data);
});
test('storage round trip preserves actor identities, payment, scope, history and result',()=>{
 const s=finish(prepare());assert.deepEqual(upgrade(JSON.parse(JSON.stringify(s))),s);assert.equal(payment(s).recipient,'gc-jeanine');assert.equal(payment(s).sources.length,2);
});
test('wallet button requests approval only; exact simulated result advances separately',()=>{
 let s=start(prepare(seed(),{method:'Wallet'}));assert.equal(payment(s).state,'approval_waiting');assert.equal(debt(s),'5430');
 rejected(()=>step(s,command('sent')),'STATE');rejected(()=>confirm(s),'PERMISSION');
 rejected(()=>fixture(s,'wallet_submitted',{proof:{...scopeProof(payment(s)),transfer:{asset:'DOT',minorUnits:'1',exponent:6}}}),'PROOF');
 s=fixture(s,'wallet_submitted');s=fixture(s,'wallet_received');assert.equal(debt(s),'5430');s=close(s);assert.equal(debt(s),'0');
});
test('unsupported wallet quote and unavailable method fail before preparing',()=>{
 rejected(()=>prepare(seed(),{method:'Wallet',amount:'2000'}),'QUOTE');const s=seed();s.gateC.environment.noMethod=true;rejected(()=>prepare(s),'METHOD');
});
test('expired intent cannot start and expired wallet approval cannot submit',()=>{
 const s=prepare();rejected(()=>transition(s,command('start'),'user','2026-10-03T12:00:00Z'),'EXPIRED');
 const w=start(prepare(seed(),{method:'Wallet'}));rejected(()=>transition(w,command('wallet_submitted',{proof:scopeProof(payment(w))}),'prototype-fixture','2026-10-03T12:00:00Z'),'EXPIRED');
});
test('post-start source issue blocks closure while unrelated person remains usable',()=>{
 let s=confirm(sent(start(prepare())));const e=s.expenses.find(e=>e.id==='gc-example-apartment-jeanine');
 s=expenseTransition(s,{type:'issue',id:e.id,revision:e.revision,actor:'self',operationId:crypto.randomUUID(),reason:'My share',note:'Check it'},core,now);
 rejected(()=>close(s),'CHANGED');const independent={payer:'self',recipient:'gc-nina',currency:'CHF',exponent:2,groupIds:['gc-geneva']};
 s=prepare(s,{id:'independent',scope:independent,amount:'3000'});assert.equal(payment(s).recipient,'gc-nina');
});
test('source edits and new dependent expenses are blocked during possible effect',()=>{
 const s=start(prepare());const e=s.expenses.find(e=>e.id==='gc-example-apartment-jeanine');s.group=s.groups.find(g=>g.id===e.groupId);
 const d={...editDraft(e),amountText:'75.30',exact:{self:'75.30','gc-jeanine':'0'}};
 rejected(()=>expenseTransition(s,{type:'edit',id:e.id,revision:1,actor:e.ownerId,operationId:d.operationId,draft:d},core,now),'GUARD');
 const n={...newDraft(s,'self','new'),amountText:'2',description:'Another',date:'2026-10-03',payerId:'gc-jeanine',participantIds:['self','gc-jeanine'],method:'exact',exact:{self:'2','gc-jeanine':'0'}};
 rejected(()=>expenseTransition(s,{type:'create',id:n.id,actor:'self',operationId:n.operationId,draft:n},core,now),'GUARD');
});
test('settled group home derives from same source applications',()=>{
 const s=finish(prepare());s.group=s.groups.find(g=>g.id==='gc-apartment');assert.equal(groupPosition(s,'self')['CHF:2'],'2000');
});
test('partial remainder permits linked new payment but never retries accepted amount',()=>{
 let s=finish(prepare(seed(),{amount:'2000'}));rejected(()=>step(s,command('retry')),'RETRY');rejected(()=>prepare(s,{id:'next',amount:'3430'}),'REMAINDER');
 s=finish(prepare(s,{id:'next',amount:'3430',remainderOf:['payment-1']}));assert.equal(debt(s),'0');assert.ok(s.gateC.payments.every(p=>!unresolved(s,p)));
});
test('verified reversal restores exactly the original source applications',()=>{
 let s=finish(prepare(seed(),{amount:'2000'}));const expenses=structuredClone(s.expenses);s=fixture(s,'reverse');assert.equal(debt(s),'5430');assert.equal(debt(s,'gc-ski'),'-2000');assert.deepEqual(s.expenses,expenses);assert.equal(payment(s).state,'reversed');
});
test('reversing a partial with an unresolved descendant is blocked',()=>{
 let s=finish(prepare(seed(),{amount:'2000'}));s=prepare(s,{id:'next',amount:'3430',remainderOf:['payment-1']});
 const p=s.gateC.payments[0];rejected(()=>step(s,command('reverse',{id:p.id,proof:scopeProof(p)}),'prototype-fixture'),'DEPENDENCY');
});
test('exact integer allocation remains correct above safe floating point range',()=>{
 const rows=[{id:'a',minor:'90071992547409993'},{id:'b',minor:'-2'}];const p=makePlan(rows,'90071992547409990');assert.equal(p.remaining,'1');assert.equal(p.after[0].minor,'1');
});
test('invalid scopes and unreviewed distribution cannot prepare',()=>{
 rejected(()=>prepare(seed(),{scope:scope([])}),'SCOPE');rejected(()=>prepare(seed(),{reviewed:false}),'REVIEW');rejected(()=>prepare(seed(),{amount:'0'}),'AMOUNT');
 rejected(()=>prepare(seed(),{amount:'5431'}),'AMOUNT');rejected(()=>prepare(seed(),{scope:{...scope(),recipient:'missing'}}),'PARTICIPANT');
});
test('GC-SEC-001 retry cannot overlap a successor payment',()=>{
 let s=step(prepare(),command('cancel'));s=start(prepare(s,{id:'successor'}));
 rejected(()=>step(s,command('retry',{id:'payment-1'})),'IN_PROGRESS');
 assert.equal(s.gateC.payments.filter(p=>p.state==='started').length,1);
});
test('GC-SEC-002 included description edit is rejected before stranding receipt',()=>{
 let s=sent(start(prepare()));const e=s.expenses.find(e=>e.id==='gc-example-apartment-jeanine');s.group=s.groups.find(g=>g.id===e.groupId);
 const d={...editDraft(e),description:'Renamed only'};
 rejected(()=>expenseTransition(s,{type:'edit',actor:e.ownerId,id:e.id,revision:e.revision,operationId:d.operationId,draft:d},core,now),'GUARD');
 s=close(confirm(s));assert.equal(debt(s),'0');
});
test('GC-SEC-003 canonical recipient can positively reconcile an unknown external payment',()=>{
 let s=fixture(sent(start(prepare())),'unknown');s=step(s,command('recover'));
 s=step(s,command('not_received',{actor:'gc-jeanine'}));assert.equal(payment(s).state,'recovering');assert.equal(payment(s).retryEligible,false);
 s=close(confirm(s));assert.equal(debt(s),'0');assert.equal(payment(s).id,'payment-1');
});
test('GC-SEC-004 noncanonical receipt amount is rejected at the trusted transition',()=>{
 const s=sent(start(prepare()));for(const bad of ['0x10','01','1e2','1.0',16,1.5,Number.MAX_SAFE_INTEGER+1])rejected(()=>confirm(s,bad),'AMOUNT');
 assert.equal(payment(s).state,'sent');
});
test('GC-SEC-005 reversal cannot strand a newer payment on corrected sources',()=>{
 let s=finish(prepare());const first=s.gateC.payments[0],e=s.expenses.find(e=>e.id==='gc-example-apartment-jeanine');s.group=s.groups.find(g=>g.id===e.groupId);
 const d={...editDraft(e),amountText:'84.30',exact:{self:'84.30','gc-jeanine':'0'}};
 s=expenseTransition(s,{type:'edit',id:e.id,revision:1,actor:e.ownerId,operationId:d.operationId,draft:d},core,now);
 s=sent(start(prepare(s,{id:'second',amount:'1000',scope:scope(['gc-apartment'])})));
 rejected(()=>step(s,command('reverse',{id:first.id,proof:scopeProof(first)}),'prototype-fixture'),'DEPENDENCY');
 s=close(confirm(s));assert.equal(debt(s),'0');
});
test('GC-SEC-005 independent unresolved payment does not prevent exact reversal',()=>{
 let s=finish(prepare());const first=s.gateC.payments[0];
 s=prepare(s,{id:'independent',amount:'3000',scope:{payer:'self',recipient:'gc-nina',currency:'CHF',exponent:2,groupIds:['gc-geneva']}});
 s=step(s,command('reverse',{id:first.id,proof:scopeProof(first)}),'prototype-fixture');assert.equal(debt(s),'5430');assert.equal(payment(s).state,'prepared');
});
