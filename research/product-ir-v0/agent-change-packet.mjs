// Product IR V0 — generate a compact agent change packet.
// Combines semantic derivation with source-derived implementation candidates.
// Research-only; does not authorize or perform the product change.

import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root=new URL('../../',import.meta.url).pathname;
const model=readFileSync(new URL('./MODEL.yaml',import.meta.url),'utf8');
const list=v=>v.replace(/^\[/,'').replace(/\]$/,'').split(',').map(x=>x.trim()).filter(Boolean);
function section(name){const marker=`\n${name}:\n`;const i=model.indexOf(marker);assert.ok(i>=0,`missing ${name}`);const tail=model.slice(i+marker.length);const n=tail.search(/^\S/m);return n>=0?tail.slice(0,n):tail;}
function rules(){const out=[];let cur=null;for(const line of section('executable_rules').split('\n')){let m=line.match(/^  - id: (.+)$/);if(m){if(cur)out.push(cur);cur={id:m[1]};continue;}m=line.match(/^    ([a-z_]+): (.+)$/);if(m&&cur)cur[m[1]]=m[2];}if(cur)out.push(cur);return out;}
function deps(){const out=[];let from=null;for(const line of section('semantic_dependencies').split('\n')){let m=line.match(/^  - from: (.+)$/);if(m){from=m[1];continue;}m=line.match(/^    uses: (\[.*\])$/);if(m&&from)for(const to of list(m[1]))out.push({from,to});}return out;}
const allRules=rules(),edges=deps(),reverse=new Map();
for(const {from,to} of edges){if(!reverse.has(to))reverse.set(to,new Set());reverse.get(to).add(from);}
function downstream(seed){const seen=new Set([seed]),q=[seed];while(q.length){const x=q.shift();for(const y of reverse.get(x)||[]){if(!seen.has(y)){seen.add(y);q.push(y);}}}return [...seen].sort();}

const files=[];
function walk(dir){for(const n of readdirSync(dir)){const p=join(dir,n),s=statSync(p);if(s.isDirectory())walk(p);else if(/\.(ts|tsx)$/.test(n))files.push(p);}}
walk(join(root,'src'));
const signals={
  Funding:[{r:/\bpaidBy\b/,w:4,why:'single-payer field'},{r:/\bExpenseSchema\b/,w:4,why:'expense schema'},{r:/\bCreateExpenseDTO\b|\bUpdateExpenseDTO\b/,w:3,why:'expense DTO'}],
  'Expense.Create':[{r:/\baddExpense\b|\baddExpenseToPot\b/,w:6,why:'create operation'},{r:/\bCreateExpenseDTO\b/,w:5,why:'create DTO'},{r:/\bonSave\b/,w:1,why:'save boundary'}],
  'Expense.Edit':[{r:/\bupdateExpense\b/,w:7,why:'edit operation'},{r:/\bUpdateExpenseDTO\b/,w:5,why:'update DTO'},{r:/\bexistingExpense\b/,w:2,why:'edit state'}],
  'Position.Recompute':[{r:/\bcomputeBalances\b/,w:9,why:'balance derivation'},{r:/\bgetMemberBalance\b/,w:4,why:'position read'},{r:/\bsuggestSettlements\b/,w:2,why:'settlement consumer'}]
};
function discover(k){const out=[];for(const f of files){const t=readFileSync(f,'utf8');let score=0;const why=[];for(const s of signals[k]||[]){if(s.r.test(t)){score+=s.w;why.push(s.why);}}if(score)out.push({file:relative(root,f),score,evidence:why});}return out.sort((a,b)=>b.score-a.score||a.file.localeCompare(b.file)).slice(0,8);}

const subject='Funding',nodes=downstream(subject);
const packet={
  status:'EXPERIMENTAL_CHANGE_PACKET',
  authority:'research-only; no implementation authorization',
  task:'Explore Expense funding from one payer to one-or-more contributions',
  semantic_change:{
    from:'Expense.payer: ParticipantId',
    to:'Expense.funding: Contribution[]',
    subject
  },
  laws:allRules.filter(r=>r.subject===subject).map(r=>r.id),
  composition:nodes.filter(x=>x.endsWith('Accounting')),
  operations:nodes.filter(x=>x.includes('.')),
  derived_state:nodes.filter(x=>x==='Position'),
  core_journeys:nodes.filter(x=>['J05','J06','J08','J10','J11'].includes(x)),
  boundary_journeys:nodes.filter(x=>['J18','J24','J28'].includes(x)),
  implementation_candidates:{
    Funding:discover('Funding'),
    'Expense.Create':discover('Expense.Create'),
    'Expense.Edit':discover('Expense.Edit'),
    'Position.Recompute':discover('Position.Recompute')
  },
  acceptance:[
    'sum(funding contributions) equals expense total in exact currency units',
    'every funder belongs to the group',
    'beneficiary allocation remains independent from funding',
    'per-participant expense delta = funded - allocated',
    'sum(per-participant deltas) = 0 per expense/currency',
    'existing approved journey behavior is not silently redesigned'
  ],
  do_not_change:[
    'approved Goldens or journey authority',
    'production behavior from this research branch',
    'rounding/remainder policy without existing authority or explicit product decision',
    'settlement/recovery semantics merely to make tests pass'
  ],
  migration_hypothesis:'existing single payer becomes one contribution for 100% of the expense; hypothesis only until approved',
  open_questions:[
    'What is the authoritative minor-unit/remainder allocation policy?',
    'Should duplicate contributor rows be normalized or prohibited?',
    'Which persistence/repository representation is canonical for Expense?',
    'Which Activity/Export fields must preserve funding provenance?'
  ]
};
assert.ok(packet.laws.includes('FUND-001'));
assert.ok(packet.composition.includes('ExpenseAccounting'));
for(const x of ['Expense.Create','Expense.Edit','Position.Recompute'])assert.ok(packet.operations.includes(x));
for(const x of ['J05','J06','J08','J10','J11'])assert.ok(packet.core_journeys.includes(x));
assert.ok(packet.implementation_candidates['Position.Recompute'].some(x=>x.file==='src/services/settlement/calc.ts'));
console.log(JSON.stringify(packet,null,2));
