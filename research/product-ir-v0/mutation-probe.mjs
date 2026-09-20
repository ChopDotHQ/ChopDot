// Product IR V0 mutation + blast-radius probe.
// Mutates valid semantic fixtures and derives downstream impact from
// violated-rule subjects + semantic dependencies.

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
function arr(v){ return v.replace(/^\[/,'').replace(/\]$/,'').split(',').map(x=>x.trim()).filter(Boolean); }

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
function parseDependencies(){
  const edges=[];let from=null;
  for(const line of section('semantic_dependencies').split('\n')){
    let m=line.match(/^  - from: (.+)$/);if(m){from=m[1];continue;}
    m=line.match(/^    uses: (\[.*\])$/);if(m&&from){for(const to of arr(m[1]))edges.push({from,to});}
  }
  return edges;
}
const rules=parseRules();
const byId=Object.fromEntries(rules.map(r=>[r.id,r]));
const reverse=new Map();
for(const {from,to} of parseDependencies()){if(!reverse.has(to))reverse.set(to,new Set());reverse.get(to).add(from);}

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
function downstream(seeds){
 const seen=new Set(seeds),queue=[...seeds];
 while(queue.length){const x=queue.shift();for(const dep of reverse.get(x)||[]){if(!seen.has(dep)){seen.add(dep);queue.push(dep);}}}
 return [...seen].sort();
}
function diagnose(e){
 const failed=rules.filter(r=>!evalRule(r,e)).map(r=>r.id);
 const subjects=[...new Set(failed.map(id=>byId[id].subject))];
 const nodes=downstream(subjects);
 return {
   failed,
   subjects:subjects.sort(),
   operations:nodes.filter(x=>x.includes('.')),
   projections:nodes.filter(x=>/^J\d+$/.test(x)),
   semantic:nodes.filter(x=>!x.includes('.')&&!/^J\d+$/.test(x))
 };
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
