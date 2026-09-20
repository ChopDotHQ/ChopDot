// Product IR V0 derived-impact experiment.
// Goal: derive downstream blast radius from composition + dependency declarations,
// then compare it with the older hand-authored impact projection lists.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const text=readFileSync(new URL('./MODEL.yaml',import.meta.url),'utf8');

function section(name){const marker=`\n${name}:\n`;const i=text.indexOf(marker);assert.ok(i>=0,`missing ${name}`);const tail=text.slice(i+marker.length);const n=tail.search(/^\S/m);return n>=0?tail.slice(0,n):tail;}
const list=v=>v.replace(/^\[/,'').replace(/\]$/,'').split(',').map(x=>x.trim()).filter(Boolean);

function dependencies(){
 const edges=[];let from=null;
 for(const line of section('semantic_dependencies').split('\n')){
  let m=line.match(/^  - from: (.+)$/);if(m){from=m[1];continue;}
  m=line.match(/^    uses: (\[.*\])$/);if(m&&from){for(const to of list(m[1]))edges.push({from,to});}
 }
 return edges;
}
function impactRules(){
 const out={};let id=null;
 for(const line of section('impact_rules').split('\n')){
  let m=line.match(/^  ([A-Z0-9-]+):$/);if(m){id=m[1];out[id]={};continue;}
  m=line.match(/^    ([a-z_]+): (\[.*\])$/);if(m&&id)out[id][m[1]]=list(m[2]);
 }return out;
}
const edges=dependencies();
const reverse=new Map();
for(const {from,to} of edges){if(!reverse.has(to))reverse.set(to,new Set());reverse.get(to).add(from);}
function downstream(seeds){
 const seen=new Set(seeds),queue=[...seeds];
 while(queue.length){const x=queue.shift();for(const dep of reverse.get(x)||[]){if(!seen.has(dep)){seen.add(dep);queue.push(dep);}}}
 return [...seen].sort();
}
const old=impactRules();
const cases=[
 {rule:'FUND-001',seeds:['Funding','ExpenseAccounting']},
 {rule:'FUND-002',seeds:['Funding','ExpenseAccounting']},
 {rule:'FUND-003',seeds:['Funding','ExpenseAccounting']},
 {rule:'SPLIT-002',seeds:['Split','ExpenseAccounting']},
 {rule:'SPLIT-003',seeds:['Split','ExpenseAccounting']}
];
const report=[];
for(const c of cases){
 const derived=downstream(c.seeds);
 const derivedJourneys=derived.filter(x=>/^J\d+$/.test(x));
 const declared=(old[c.rule]?.affects_projections||[]).sort();
 const missingDeclared=declared.filter(x=>!derivedJourneys.includes(x));
 const extraDerived=derivedJourneys.filter(x=>!declared.includes(x));
 report.push({rule:c.rule,seeds:c.seeds,derivedJourneys,declared,missingDeclared,extraDerived});
}
// The derived graph must cover every journey previously named by the hand-authored oracle.
// Extra derived journeys are intentionally reported for review: they may reveal that the
// oracle was under-specified, but they do not automatically become product authority.
for (const row of report) {
  assert.deepEqual(
    row.missingDeclared,
    [],
    `${row.rule} failed to derive oracle journeys: ${row.missingDeclared.join(', ')}`
  );
}
console.log(JSON.stringify({
  edgeCount: edges.length,
  oracleCoverage: 'complete',
  report
}, null, 2));
