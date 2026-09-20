// Product IR V0 change planner.
// Produces an ordered semantic change plan from model structure, not a hand-written
// implementation checklist. Research-only.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const text=readFileSync(new URL('./MODEL.yaml',import.meta.url),'utf8');

function section(name){const marker=`\n${name}:\n`;const i=text.indexOf(marker);assert.ok(i>=0,`missing ${name}`);const tail=text.slice(i+marker.length);const n=tail.search(/^\S/m);return n>=0?tail.slice(0,n):tail;}
const list=v=>v.replace(/^\[/,'').replace(/\]$/,'').split(',').map(x=>x.trim()).filter(Boolean);
function rules(){const out=[];let cur=null;for(const line of section('executable_rules').split('\n')){let m=line.match(/^  - id: (.+)$/);if(m){if(cur)out.push(cur);cur={id:m[1]};continue;}m=line.match(/^    ([a-z_]+): (.+)$/);if(m&&cur)cur[m[1]]=m[2];}if(cur)out.push(cur);return out;}
function deps(){const out=[];let from=null;for(const line of section('semantic_dependencies').split('\n')){let m=line.match(/^  - from: (.+)$/);if(m){from=m[1];continue;}m=line.match(/^    uses: (\[.*\])$/);if(m&&from)for(const to of list(m[1]))out.push({from,to});}return out;}
const allRules=rules(), edges=deps();
const reverse=new Map();for(const {from,to} of edges){if(!reverse.has(to))reverse.set(to,new Set());reverse.get(to).add(from);}
function downstream(seed){const seen=new Set([seed]),q=[seed];while(q.length){const x=q.shift();for(const y of reverse.get(x)||[]){if(!seen.has(y)){seen.add(y);q.push(y);}}}return [...seen];}
function plan(subject){
 const nodes=downstream(subject);
 const laws=allRules.filter(r=>r.subject===subject).map(r=>r.id);
 const compositions=nodes.filter(x=>x.endsWith('Accounting'));
 const operations=nodes.filter(x=>x.includes('.'));
 const derived=nodes.filter(x=>['Position'].includes(x));
 const journeys=nodes.filter(x=>/^J\d+$/.test(x));
 const coreJourneys=journeys.filter(x=>['J05','J06','J08','J10','J11'].includes(x));
 const boundaryJourneys=journeys.filter(x=>!coreJourneys.includes(x));
 return {
  change_subject:subject,
  ordered_plan:[
   {step:1,action:'change semantic shape',targets:[subject]},
   {step:2,action:'preserve or deliberately revise subject laws',targets:laws},
   {step:3,action:'revalidate compositions consuming subject',targets:compositions},
   {step:4,action:'update affected operations',targets:operations},
   {step:5,action:'recompute and validate derived state',targets:derived},
   {step:6,action:'revalidate core user projections',targets:coreJourneys},
   {step:7,action:'revalidate boundary projections/recovery',targets:boundaryJourneys}
  ],
  all_downstream:nodes.sort()
 };
}
const result=plan(process.argv[2]||'Funding');
assert.ok(result.ordered_plan[1].targets.includes('FUND-001'));
assert.ok(result.ordered_plan[2].targets.includes('ExpenseAccounting'));
for(const x of ['Expense.Create','Expense.Edit','Position.Recompute'])assert.ok(result.ordered_plan[3].targets.includes(x));
for(const x of ['J05','J06','J08','J10','J11'])assert.ok(result.ordered_plan[5].targets.includes(x));
for(const x of ['J18','J24','J28'])assert.ok(result.ordered_plan[6].targets.includes(x));
console.log(JSON.stringify(result,null,2));
