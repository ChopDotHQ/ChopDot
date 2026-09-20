// Product IR V0 tiny query surface.
// Derives blast radius from rule subjects + semantic dependencies.
//
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

function ruleSubjects(){
 const out={};let id=null;
 for(const line of section('executable_rules').split('\n')){
  let m=line.match(/^  - id: (.+)$/);if(m){id=m[1];continue;}
  m=line.match(/^    subject: (.+)$/);if(m&&id)out[id]=m[1];
 }
 return out;
}
function dependencies(){
 const edges=[];let from=null;
 for(const line of section('semantic_dependencies').split('\n')){
  let m=line.match(/^  - from: (.+)$/);if(m){from=m[1];continue;}
  m=line.match(/^    uses: (\[.*\])$/);if(m&&from){for(const to of list(m[1]))edges.push({from,to});}
 }
 return edges;
}
function downstream(seeds){
 const reverse=new Map();
 for(const {from,to} of dependencies()){if(!reverse.has(to))reverse.set(to,new Set());reverse.get(to).add(from);}
 const seen=new Set(seeds),queue=[...seeds];
 while(queue.length){const x=queue.shift();for(const dep of reverse.get(x)||[]){if(!seen.has(dep)){seen.add(dep);queue.push(dep);}}}
 return [...seen].sort();
}
function trace(ruleIds){
 const subjects=ruleSubjects();
 const seeds=[...new Set(ruleIds.map(id=>{assert.ok(subjects[id],`unknown rule ${id}`);return subjects[id];}))];
 const nodes=downstream(seeds);
 return {
  rules:ruleIds,
  subjects:seeds.sort(),
  operations:nodes.filter(x=>x.includes('.')),
  projections:nodes.filter(x=>/^J\d+$/.test(x)),
  semantic:nodes.filter(x=>!x.includes('.')&&!/^J\d+$/.test(x))
 };
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
let result;
if(command==='decompose') result=contract(target);
else if(command==='why-untrusted'){const t=trace(arg.split(',').filter(Boolean));assert.ok([...t.semantic,...t.operations,...t.projections].includes(target),`${target} not downstream of supplied rules`);result={target,...t};}
else if(command==='impact') result={change:target,...trace(arg.split(',').filter(Boolean))};
else throw new Error(`unknown command ${command}`);
console.log(JSON.stringify(result,null,2));
