// Bounded seeded checks. No dependency, fuzzing service or product rule is added.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {allocationFor, upgrade, newDraft, editDraft, repository, position, STORAGE_KEY} from './model.js';
const core = JSON.parse(readFileSync(new URL('./contract/semantic-core.json', import.meta.url)));
const seeds = [1, 17, 20261002, 0xabcdef, 0xffffffff];
const report = {seeds, moneyCases:0, allocations:0, lifecycleRounds:0, acceptedCommands:0, rejectedCommands:0, replays:0, reloads:0, participantCounts:{}, lifecycleBranches:{}};
// Project upper bits: low LCG bits alternate and correlate bounded choices.
function random(seed) { let x=seed>>>0; return n => { x=(Math.imul(x,1664525)+1013904223)>>>0; return (x>>>8)%n; }; }
const decimal = n => `${n/100n}.${String(n%100n).padStart(2,'0')}`;
const sum = xs => xs.reduce((a,b)=>a+b,0n);
const ordered = a => a.allocations.map(r=>[r.participantId, BigInt(r.amount.minorUnits)]);
function base(currency='CHF') { return upgrade({group:{id:'generated-group',name:'Generated',currency},people:[1,2,3,4,5,6,7].map(n=>({id:`p${n}`,name:`Person ${n}`})),expenses:[]}); }
function checkPartition(a, ids, total, currency) {
  assert.equal(BigInt(a.total.minorUnits),total);
  assert.equal(a.total.currency,currency); assert.equal(a.total.exponent,2);
  assert.deepEqual(a.allocations.map(r=>r.participantId).sort(),[...ids].sort());
  assert.equal(sum(a.allocations.map(r=>BigInt(r.amount.minorUnits))),total);
  for (const r of a.allocations) { assert.ok(BigInt(r.amount.minorUnits)>=0n); assert.equal(r.amount.currency,currency); assert.equal(r.amount.exponent,2); }
  report.allocations++;
}
for (const seed of seeds) test(`generated money partitions seed=${seed}`, t=>{
  const r=random(seed), all=['self','p1','p2','p3','p4','p5','p6','p7'];
  for(let i=0;i<80;i++) {
    const ids=all.slice(0,1+(i+seed)%8), currency=['CHF','EUR','USD'][r(3)];
    const total=i%13===0 ? 90071992547409993n+BigInt(r(99)) : BigInt(1+r(10000000));
    const d={amountText:decimal(total),participantIds:ids,method:'equal'};
    try {
      const a=allocationFor(d,currency); checkPartition(a,ids,total,currency);
      const amounts=ordered(a).map(([,n])=>n), low=amounts.reduce((a,b)=>a<b?a:b), high=amounts.reduce((a,b)=>a>b?a:b);
      assert.ok(high-low<=1n,'equal spread never exceeds one minor unit');
      assert.deepEqual(allocationFor({...d,participantIds:[...ids].reverse()},currency),a,'identity owns remainder independently of input order');
      const weights=Object.fromEntries(ids.map(id=>[id,String(r(11))])); weights[ids[r(ids.length)]]='1';
      const weighted=allocationFor({...d,method:'shares',shares:weights},currency); checkPartition(weighted,ids,total,currency);
      const weightTotal=sum(ids.map(id=>BigInt(weights[id])));
      for(const [id,n] of ordered(weighted)) {
        const idealFloor=total*BigInt(weights[id])/weightTotal;
        assert.ok(n===idealFloor || n===idealFloor+1n,'whole-unit residual bound');
        if(weights[id]==='0') assert.equal(n,0n,'zero weight owns no money');
      }
      assert.deepEqual(allocationFor({...d,method:'shares',shares:weights,participantIds:[...ids].reverse()},currency),weighted);
      // Supply an independently constructed exact partition: all money belongs to one chosen participant.
      const chosen=ids[r(ids.length)], exact=Object.fromEntries(ids.map(id=>[id,decimal(id===chosen?total:0n)]));
      const explicit=allocationFor({...d,method:'exact',exact},currency); checkPartition(explicit,ids,total,currency);
      for(const [id,n] of ordered(explicit)) assert.equal(n,id===chosen?total:0n);
      const bad={...exact,[chosen]:decimal(total+1n)};
      assert.throws(()=>allocationFor({...d,method:'exact',exact:bad},currency),e=>e.code==='ALLOCATION');
      assert.throws(()=>allocationFor({...d,participantIds:[...ids,ids[0]]},currency),e=>e.code==='MISSING');
      assert.throws(()=>allocationFor({...d,amountText:decimal(total)+'1'},currency));
      report.moneyCases++;
      report.participantCounts[ids.length]=(report.participantCounts[ids.length]||0)+1;
    } catch(e) { e.message=`seed=${seed} money case=${i} total=${total} ids=${ids}: ${e.message}`; throw e; }
  }
  t.diagnostic('80 reproducible cases × Equal/Exact/Shares; conservation, identity, precision, invalid partitions');
});
for (const seed of seeds) test(`generated lifecycle sequences seed=${seed}`,t=>{
  const r=random(seed), storage={value:JSON.stringify(base()),getItem(k){assert.equal(k,STORAGE_KEY);return this.value;},setItem(k,v){assert.equal(k,STORAGE_KEY);this.value=v;}};
  let repo=repository(storage,core), sequence=0, history=[], serial=0;
  const op=()=>`seed-${seed}-op-${++serial}`;
  function assertState(expected) {
    const s=repo.read(), e=s.expenses.at(-1);
    assert.equal(s.gateB.sequence,sequence); assert.deepEqual(s.gateB.history.map(h=>h.type),history);
    if(expected) {
      assert.equal(e.id,expected.id); assert.equal(e.ownerId,'self'); assert.equal(e.revision,expected.revision);
      assert.equal(e.deleted===true,expected.deleted===true);
      assert.deepEqual(Object.fromEntries(Object.entries(e.reviews).map(([id,v])=>[id,v.status])),expected.reviews);
      assert.deepEqual(e.issues.map(i=>[i.reviewerId,i.status,i.replies.length]),expected.issues);
      // Independent ledger oracle: only this round's undeleted expense remains active.
      const positions=Object.fromEntries(['self','p1','p2','p3','p4','p5','p6','p7'].map(id=>[id,0n]));
      if(!expected.deleted) {positions[expected.payer]+=expected.amount;for(const id of expected.ids) positions[id]-=expected.shares[id];}
      for(const [id,n] of Object.entries(positions)) assert.equal(BigInt(position(s,id)['CHF:2']||0),n);
      assert.equal(sum(Object.values(positions)),0n);
    }
  }
  function accept(c,expected) {
    const input=storage.value, before=JSON.parse(input);repo.commit(c);sequence++;history.push(c.type);report.acceptedCommands++;assertState(expected);assert.notEqual(storage.value,input);
    const after=repo.read(), event=after.gateB.history.at(-1);
    assert.deepEqual(after.gateB.history.slice(0,-1),before.gateB.history,'accepted history prefix is immutable');
    assert.equal(event.actor,c.actor);assert.equal(event.expenseId,c.id);assert.equal(event.operationId,c.operationId);
    assert.equal(event.localOnly,true);assert.equal(event.offline,before.gateB.environment.offline===true);
    assert.deepEqual(event.before,before.expenses.find(e=>e.id===c.id)||null);
    assert.deepEqual(event.after,after.expenses.find(e=>e.id===c.id));return c;
  }
  function reject(c,code,expected) {const before=storage.value;assert.throws(()=>repo.commit(c),e=>e.code===code);assert.equal(storage.value,before,'rejection is no-effect');report.rejectedCommands++;assertState(expected);}
  function replay(c,expected) {const before=storage.value;repo.commit(c);assert.equal(storage.value,before,'exact command replay is no-effect');report.replays++;assertState(expected);}
  const partition=(ids,total)=>Object.fromEntries([...ids].sort().map((id,i)=>[id,total/BigInt(ids.length)+(BigInt(i)<total%BigInt(ids.length)?1n:0n)]));
  for(let round=0;round<12;round++) {
    try {
      const id=`seed-${seed}-expense-${round}`, ids=['self',...['p1','p2','p3','p4','p5','p6','p7'].slice(0,1+r(7))], payer=ids[r(ids.length)], amount=BigInt(1+r(1000000));
      const operationId=op(), d={...newDraft(repo.read(),'self',id),operationId,amountText:decimal(amount),description:`Round ${round}`,date:'2026-10-02',participantIds:ids,payerId:payer};
      const exp={id,revision:1,payer,amount,ids,shares:partition(ids,amount),reviews:Object.fromEntries(ids.filter(id=>id!=='self').map(id=>[id,'pending'])),issues:[]};
      const create={type:'create',actor:'self',id,operationId,draft:d}; accept(create,exp); replay(create,exp);
      reject({...create,draft:{...d,description:'Changed replay'}},'OPERATION',exp);
      const reviewer=ids[1], cmd=(type,actor=reviewer,extra={})=>({type,actor,id,revision:exp.revision,operationId:op(),...extra});
      reject(cmd('delete',reviewer),'PERMISSION',exp);
      exp.reviews[reviewer]='agreed';accept(cmd('agree'),exp);
      // Schedule all 2×2×2 meaningful branches; seeds vary amounts, IDs and weights.
      const branch=(round+seed)%8, retainReviewer=(branch&1)!==0, stillOff=(branch&2)!==0, withdraw=(branch&4)!==0;
      const editOp=op(), updated=amount+BigInt(1+r(1000)), nextIds=retainReviewer?ids:ids.filter(x=>x!==reviewer);
      const edit={type:'edit',actor:'self',id,revision:1,operationId:editOp,draft:{...editDraft(repo.read().expenses.at(-1)),operationId:editOp,amountText:decimal(updated),participantIds:nextIds,description:`Correction ${round}`}};
      // Persistence failure is independent from transition acceptance; the next retry must accept once.
      repo.setEnvironment({offline:r(2)===1,settlements:[],failSave:true});const failed=storage.value;
      assert.throws(()=>repo.commit(edit),e=>e.code==='SAVE');assert.equal(storage.value,failed);report.rejectedCommands++;
      repo.setEnvironment({offline:false,settlements:[],failSave:false});
      exp.revision=2;exp.amount=updated;exp.ids=nextIds;exp.shares=partition(nextIds,updated);
      exp.reviews=Object.fromEntries(Object.keys(exp.reviews).map(id=>[id,'needs_review_again']));accept(edit,exp);replay(edit,exp);
      reject(cmd('agree',reviewer,{revision:1}),'CONFLICT',exp);
      exp.reviews[reviewer]='issue';exp.issues=[[reviewer,'open',0]];
      const issue=accept(cmd('issue',reviewer,{reason:'My share',note:`Generated ${round}`}),exp);
      reject(cmd('issue',reviewer,{reason:'My share'}),'CONFLICT',exp);
      reject(cmd('withdraw','self',{issueId:issue.operationId}),'PERMISSION',exp);
      exp.issues[0][2]++;accept(cmd('reply','self',{issueId:issue.operationId,note:'Owner reply'}),exp);
      if(stillOff) {exp.issues[0][2]++;accept(cmd('still_off',reviewer,{issueId:issue.operationId,reason:'Expense details',note:'Still checking'}),exp);}
      if(withdraw) {exp.issues[0][1]='withdrawn';exp.reviews[reviewer]='pending';accept(cmd('withdraw',reviewer,{issueId:issue.operationId}),exp);}
      else {exp.issues[0][1]='resolved';exp.reviews[reviewer]='agreed';accept(cmd('agree'),exp);}
      repo=repository(storage,core);report.reloads++;assertState(exp);
      exp.revision++;exp.deleted=true;const deleted=accept(cmd('delete','self',{revision:2}),exp);replay(deleted,exp);
      replay(create,exp);
      reject(cmd('agree',reviewer),'NOT_FOUND',exp);
      repo=repository(storage,core);report.reloads++;assertState(exp);report.lifecycleRounds++;
      const key=`${retainReviewer?'retained':'removed'}:${stillOff?'still_off':'reply_only'}:${withdraw?'withdraw':'resolve'}`;
      report.lifecycleBranches[key]=(report.lifecycleBranches[key]||0)+1;
    } catch(e) {e.message=`seed=${seed} lifecycle round=${round} serial=${serial}: ${e.message}`;throw e;}
  }
  t.diagnostic('12 sequences; independent revision/review/issue/position/history oracle; failures, retries and reloads');
});
test('generated sample covers every bounded participant count and lifecycle branch',()=>{
  assert.deepEqual(Object.keys(report.participantCounts).map(Number).sort((a,b)=>a-b),[1,2,3,4,5,6,7,8]);
  assert.equal(Object.keys(report.lifecycleBranches).length,8);
  for(const count of Object.values(report.lifecycleBranches)) assert.ok(count>=5);
});
test.after(()=>{if(process.env.CHOPDOT_PROPERTY_REPORT) writeFileSync(process.env.CHOPDOT_PROPERTY_REPORT,JSON.stringify(report,null,2)); console.log('Generated coverage: '+JSON.stringify(report));});
