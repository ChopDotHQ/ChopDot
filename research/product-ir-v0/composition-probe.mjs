// Product IR V0 decomposition/recomposition probe.
// Demonstrates that one composition contract can be inspected, executed and
// explained in both directions without hand-authored blast-radius lists.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const text=readFileSync(new URL('./MODEL.yaml',import.meta.url),'utf8');

function block(name){
 const marker=`\n${name}:\n`; const i=text.indexOf(marker); assert.ok(i>=0,`missing ${name}`);
 const tail=text.slice(i+marker.length); const n=tail.search(/^\S/m); return n>=0?tail.slice(0,n):tail;
}
const list=v=>v.replace(/^\[/,'').replace(/\]$/,'').split(',').map(x=>x.trim()).filter(Boolean);

function ruleSubjects(){
 const out={};let id=null;
 for(const line of block('executable_rules').split('\n')){
  let m=line.match(/^  - id: (.+)$/);if(m){id=m[1];continue;}
  m=line.match(/^    subject: (.+)$/);if(m&&id)out[id]=m[1];
 }
 return out;
}
function dependencies(){
 const edges=[];let from=null;
 for(const line of block('semantic_dependencies').split('\n')){
  let m=line.match(/^  - from: (.+)$/);if(m){from=m[1];continue;}
  m=line.match(/^    uses: (\[.*\])$/);if(m&&from){for(const to of list(m[1]))edges.push({from,to});}
 }
 return edges;
}
const reverse=new Map();
for(const {from,to} of dependencies()){if(!reverse.has(to))reverse.set(to,new Set());reverse.get(to).add(from);}
function downstream(seeds){
 const seen=new Set(seeds),queue=[...seeds];
 while(queue.length){const x=queue.shift();for(const dep of reverse.get(x)||[]){if(!seen.has(dep)){seen.add(dep);queue.push(dep);}}}
 return [...seen].sort();
}
function contract(name){
 const b=block('composition_contracts'); const lines=b.split('\n'); const c={}; let inContract=false;
 for(const line of lines){
  if(new RegExp(`^  ${name}:$`).test(line)){inContract=true;continue;}
  if(inContract && /^  [A-Za-z0-9_]+:$/.test(line)) break;
  if(!inContract)continue;
  let m=line.match(/^    (inputs|requires|outputs|consumers|observers): (\[.*\])$/); if(m)c[m[1]]=list(m[2]);
  m=line.match(/^    recovery_governor: (.+)$/); if(m)c.recovery_governor=m[1];
  m=line.match(/^        formula: (.+)$/); if(m&&!c.delta_formula)c.delta_formula=m[1];
 }
 return c;
}
const subjects=ruleSubjects();
const accounting=contract('ExpenseAccounting');
assert.deepEqual(accounting.requires,['FUND-001','FUND-002','FUND-003','SPLIT-002','SPLIT-003']);

const decomposition={
 component:'ExpenseAccounting',
 inputs:accounting.inputs,
 laws:accounting.requires,
 outputs:accounting.outputs,
 consumers:accounting.consumers,
 observers:accounting.observers,
 recovery:accounting.recovery_governor
};

const funding={dev:7000,jeanine:3000,marc:0};
const allocation={dev:2000,jeanine:4000,marc:4000};
const delta=Object.fromEntries(Object.keys(funding).map(id=>[id,funding[id]-allocation[id]]));
assert.deepEqual(delta,{dev:5000,jeanine:-1000,marc:-4000});
assert.equal(Object.values(delta).reduce((a,b)=>a+b,0),0);

function traceRules(ruleIds){
 const seeds=[...new Set(ruleIds.map(id=>subjects[id]))];
 assert.ok(seeds.every(Boolean),`missing rule subject for ${ruleIds}`);
 return downstream(seeds);
}
const splitTrace=traceRules(['SPLIT-003']);
for(const x of ['Position','J10','J11']) assert.ok(splitTrace.includes(x),`SPLIT-003 should reach ${x}`);

const fundingTrace=traceRules(['FUND-001','FUND-002','FUND-003']);
for(const p of ['J05','J06','J08','J10','J11','J18','J24','J28']) assert.ok(fundingTrace.includes(p),`missing ${p}`);

console.log(JSON.stringify({
 decomposition,
 recomposition:{funding,allocation,delta},
 whyPositionUntrusted:{rule:'SPLIT-003',trace:splitTrace},
 fundingImpact:{rules:['FUND-001','FUND-002','FUND-003'],trace:fundingTrace}
},null,2));
