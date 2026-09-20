// Product IR V0 mutation + blast-radius probe.
// Mutates valid semantic fixtures and asks the model which laws fail and
// which product surfaces become untrustworthy.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const text = readFileSync(new URL('./MODEL.yaml', import.meta.url), 'utf8');

function section(name) {
  const marker = `\n${name}:\n`;
  const i = text.indexOf(marker);
  assert.ok(i >= 0, `missing ${name}`);
  const tail = text.slice(i + marker.length);
  const next = tail.search(/^\S/m);
  return next >= 0 ? tail.slice(0,next) : tail;
}
function parseRules() {
  const lines=section('executable_rules').split('\n');
  const out=[]; let cur=null;
  for(const line of lines){
    const id=line.match(/^  - id: (.+)$/);
    if(id){ if(cur)out.push(cur); cur={id:id[1]}; continue; }
    const kv=line.match(/^    ([a-z_]+): (.+)$/);
    if(kv&&cur)cur[kv[1]]=kv[2];
  }
  if(cur)out.push(cur); return out;
}
function arr(v){ return v.replace(/^\[/,'').replace(/\]$/,'').split(',').map(x=>x.trim()).filter(Boolean); }
function parseImpact(){
  const lines=section('impact_rules').split('\n'); const out={}; let id=null;
  for(const line of lines){
    const m=line.match(/^  ([A-Z0-9-]+):$/); if(m){id=m[1];out[id]={};continue;}
    const kv=line.match(/^    ([a-z_]+): (\[.*\])$/); if(kv&&id)out[id][kv[1]]=arr(kv[2]);
  } return out;
}
const rules=parseRules(), impacts=parseImpact();
const get=(o,p)=>p.split('.').reduce((v,k)=>v?.[k],o);
function evalRule(r,e){
 if(r.kind==='sum_equals') return e[r.collection].reduce((n,x)=>n+get(x,r.value_path),0)===get(e,r.equals_path);
 if(r.kind==='all_equal_path') return e[r.collection].every(x=>get(x,r.value_path)===get(e,r.equals_path));
 if(r.kind==='all_members_in'){const s=new Set(get(e,r.set_path));return e[r.collection].every(x=>s.has(get(x,r.member_path)));}
 if(r.kind==='participant_delta_zero_sum'){
   const a=e[r.funding_collection].reduce((n,x)=>n+get(x,r.value_path),0);
   const b=e[r.allocation_collection].reduce((n,x)=>n+get(x,r.value_path),0);
   return a-b===0;
 }
 throw new Error('unsupported '+r.kind);
}
function diagnose(e){
 const failed=rules.filter(r=>!evalRule(r,e)).map(r=>r.id);
 const invalidates=new Set(), operations=new Set(), projections=new Set();
 for(const id of failed){
   const impact=impacts[id]||{};
   for(const x of impact.invalidates||[])invalidates.add(x);
   for(const x of impact.affects_operations||[])operations.add(x);
   for(const x of impact.affects_projections||[])projections.add(x);
 }
 return {failed,invalidates:[...invalidates].sort(),operations:[...operations].sort(),projections:[...projections].sort()};
}
const CHF=n=>({currency:'CHF',minor_units:n});
const base={
 amount:CHF(10000),
 group_participants:['dev','jeanine','marc'],
 funding:[{participant:'dev',amount:CHF(7000)},{participant:'jeanine',amount:CHF(3000)}],
 allocations:[{participant:'dev',amount:CHF(2000)},{participant:'jeanine',amount:CHF(4000)},{participant:'marc',amount:CHF(4000)}]
};
const clone=o=>structuredClone(o);
const mutations=[
 {name:'short funding',mutate:e=>e.funding[0].amount.minor_units-=1,expect:['FUND-001','POSITION-CONSERVATION'],projection:'J11'},
 {name:'wrong funding currency',mutate:e=>e.funding[0].amount.currency='EUR',expect:['FUND-002'],projection:'J24'},
 {name:'outsider funder',mutate:e=>e.funding[0].participant='outsider',expect:['FUND-003'],projection:'J05'},
 {name:'short beneficiary allocation',mutate:e=>e.allocations[2].amount.minor_units-=1,expect:['SPLIT-003','POSITION-CONSERVATION'],projection:'J10'},
 {name:'wrong allocation currency',mutate:e=>e.allocations[1].amount.currency='EUR',expect:['SPLIT-002'],projection:'J11'}
];
assert.deepEqual(diagnose(base).failed,[]);
const results=[];
for(const mutation of mutations){
 const e=clone(base); mutation.mutate(e); const d=diagnose(e);
 for(const id of mutation.expect) assert.ok(d.failed.includes(id), `${mutation.name} should fail ${id}: ${d.failed}`);
 assert.ok(d.projections.includes(mutation.projection), `${mutation.name} should impact ${mutation.projection}`);
 results.push({mutation:mutation.name,...d});
}
console.log(JSON.stringify({mutations:results.length,results},null,2));
