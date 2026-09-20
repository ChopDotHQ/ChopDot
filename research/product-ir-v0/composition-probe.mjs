// Product IR V0 decomposition/recomposition probe.
// Demonstrates that one composition contract can be inspected, executed and
// explained in both directions without loading journey UI artifacts.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const text=readFileSync(new URL('./MODEL.yaml',import.meta.url),'utf8');

function block(name){
 const marker=`\n${name}:\n`; const i=text.indexOf(marker); assert.ok(i>=0,`missing ${name}`);
 const tail=text.slice(i+marker.length); const n=tail.search(/^\S/m); return n>=0?tail.slice(0,n):tail;
}
function list(v){return v.replace(/^\[/,'').replace(/\]$/,'').split(',').map(x=>x.trim()).filter(Boolean);}
function parseImpact(){
 const out={};let id=null;
 for(const line of block('impact_rules').split('\n')){
  let m=line.match(/^  ([A-Z0-9-]+):$/);if(m){id=m[1];out[id]={};continue;}
  m=line.match(/^    ([a-z_]+): (\[.*\])$/);if(m&&id)out[id][m[1]]=list(m[2]);
 } return out;
}
function parseContract(){
 const b=block('composition_contracts'); const lines=b.split('\n'); const c={}; let inContract=false;
 for(const line of lines){
  if(/^  ExpenseAccounting:$/.test(line)){inContract=true;continue;}
  if(!inContract)continue;
  let m=line.match(/^    (inputs|requires|outputs|consumers|observers): (\[.*\])$/); if(m)c[m[1]]=list(m[2]);
  m=line.match(/^    recovery_governor: (.+)$/); if(m)c.recovery_governor=m[1];
  m=line.match(/^        formula: (.+)$/); if(m&&!c.delta_formula)c.delta_formula=m[1];
 }
 return c;
}
const impact=parseImpact(), contract=parseContract();
assert.deepEqual(contract.requires,['FUND-001','FUND-002','FUND-003','SPLIT-002','SPLIT-003']);

function downstreamForRules(ruleIds){
 const projections=new Set([...contract.consumers,...contract.observers,contract.recovery_governor]);
 const operations=new Set(), invalidates=new Set();
 for(const id of ruleIds){
  const x=impact[id]||{};
  for(const p of x.affects_projections||[])projections.add(p);
  for(const o of x.affects_operations||[])operations.add(o);
  for(const v of x.invalidates||[])invalidates.add(v);
 }
 return {invalidates:[...invalidates].sort(),operations:[...operations].sort(),projections:[...projections].sort()};
}

// Decompose: one semantic component can explain its ingredients.
const decomposition={
 component:'ExpenseAccounting',
 inputs:contract.inputs,
 laws:contract.requires,
 outputs:contract.outputs,
 consumers:contract.consumers,
 observers:contract.observers,
 recovery:contract.recovery_governor
};

// Recompose: funding + allocation produce a Position delta deterministically.
const funding={dev:7000,jeanine:3000,marc:0};
const allocation={dev:2000,jeanine:4000,marc:4000};
const delta=Object.fromEntries(Object.keys(funding).map(id=>[id,funding[id]-allocation[id]]));
assert.deepEqual(delta,{dev:5000,jeanine:-1000,marc:-4000});
assert.equal(Object.values(delta).reduce((a,b)=>a+b,0),0);

// Reverse explanation: a failed split law tells us why Position is untrusted.
const whyPositionUntrusted=downstreamForRules(['SPLIT-003']);
assert.ok(whyPositionUntrusted.invalidates.includes('Position'));
assert.ok(whyPositionUntrusted.projections.includes('J10'));
assert.ok(whyPositionUntrusted.projections.includes('J11'));

// Forward impact: funding law changes identify downstream surfaces.
const fundingImpact=downstreamForRules(['FUND-001','FUND-002','FUND-003']);
for(const p of ['J05','J06','J08','J10','J11','J18','J24','J28']) assert.ok(fundingImpact.projections.includes(p),`missing ${p}`);

console.log(JSON.stringify({decomposition,recomposition:{funding,allocation,delta},whyPositionUntrusted,fundingImpact},null,2));
