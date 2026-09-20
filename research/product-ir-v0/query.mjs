// Product IR V0 tiny query surface.
// Usage:
//   node query.mjs decompose ExpenseAccounting
//   node query.mjs why-untrusted Position SPLIT-003
//   node query.mjs impact Expense.funding FUND-001,FUND-002,FUND-003

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const text=readFileSync(new URL('./MODEL.yaml',import.meta.url),'utf8');
const [command,target,arg='']=process.argv.slice(2);
assert.ok(command,'command required');

function section(name){
 const marker=`\n${name}:\n`; const i=text.indexOf(marker); assert.ok(i>=0,`missing section ${name}`);
 const tail=text.slice(i+marker.length); const n=tail.search(/^\S/m); return n>=0?tail.slice(0,n):tail;
}
const list=v=>v.replace(/^\[/,'').replace(/\]$/,'').split(',').map(x=>x.trim()).filter(Boolean);
function impacts(){
 const out={};let id;
 for(const line of section('impact_rules').split('\n')){
  let m=line.match(/^  ([A-Z0-9-]+):$/);if(m){id=m[1];out[id]={};continue;}
  m=line.match(/^    ([a-z_]+): (\[.*\])$/);if(m&&id)out[id][m[1]]=list(m[2]);
 } return out;
}
function contract(name){
 const lines=section('composition_contracts').split('\n');let active=false;const out={name};
 for(const line of lines){
  const h=line.match(/^  ([A-Za-z0-9_]+):$/);
  if(h){active=h[1]===name;continue;} if(!active)continue;
  let m=line.match(/^    (inputs|requires|outputs|consumers|observers): (\[.*\])$/);if(m)out[m[1]]=list(m[2]);
  m=line.match(/^    recovery_governor: (.+)$/);if(m)out.recovery_governor=m[1];
 }
 assert.ok(out.inputs,`unknown composition contract ${name}`);return out;
}
function trace(ruleIds){
 const map=impacts();const invalidates=new Set(),operations=new Set(),projections=new Set();
 for(const id of ruleIds){assert.ok(map[id],`unknown rule ${id}`);for(const x of map[id].invalidates||[])invalidates.add(x);for(const x of map[id].affects_operations||[])operations.add(x);for(const x of map[id].affects_projections||[])projections.add(x);}
 return {rules:ruleIds,invalidates:[...invalidates].sort(),operations:[...operations].sort(),projections:[...projections].sort()};
}
let result;
if(command==='decompose') result=contract(target);
else if(command==='why-untrusted'){const t=trace(arg.split(',').filter(Boolean));assert.ok(t.invalidates.includes(target),`${target} not invalidated by supplied rules`);result={target,...t};}
else if(command==='impact'){const t=trace(arg.split(',').filter(Boolean));result={change:target,...t};}
else throw new Error(`unknown command ${command}`);
console.log(JSON.stringify(result,null,2));
