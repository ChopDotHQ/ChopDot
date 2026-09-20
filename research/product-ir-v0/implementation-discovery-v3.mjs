// Product IR V0 — implementation discovery V3.
// Goal: preserve V2 recall while enforcing a practical agent context budget.
// V2 may discover broadly; V3 ranks evidence into MUST / REVIEW / DEFER.

import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root=new URL('../../',import.meta.url).pathname, src=join(root,'src'), files=[];
function walk(d){for(const n of readdirSync(d)){const p=join(d,n),s=statSync(p);if(s.isDirectory())walk(p);else if(/\.(ts|tsx)$/.test(n))files.push(p);}} walk(src);

function role(rel){
 if(/\.test\.(ts|tsx)$/.test(rel))return'test';
 if(rel.includes('/repositories/'))return'persistence';
 if(rel.includes('/crdt/'))return'sync';
 if(/export/i.test(rel))return'serialization';
 if(rel.includes('/schema/')||rel.includes('/types/'))return'domain';
 if(rel.includes('/services/settlement/'))return'calculation';
 if(rel.includes('/services/data/services/'))return'operation';
 if(rel.includes('/hooks/'))return'derived';
 if(rel.includes('/components/'))return'projection';
 if(rel.includes('/routing/'))return'routing';
 if(rel.includes('/utils/'))return'utility';
 return'other';
}
const scored=[];
for(const f of files){
 const rel=relative(root,f),t=readFileSync(f,'utf8'),r=role(rel);
 let score=0;const evidence=[];
 const add=(n,why)=>{score+=n;evidence.push(why);};
 if(/\bExpenseSchema\b/.test(t))add(9,'ExpenseSchema');
 if(/\bCreateExpenseDTO\b|\bUpdateExpenseDTO\b/.test(t))add(7,'expense DTO');
 if(/\bcomputeBalances\b/.test(t))add(9,'Position calculation');
 if(/\bpaidBy\b/.test(t))add(4,'legacy payer field');
 if(/\baddExpense\b|\bupdateExpense\b|\baddExpenseToPot\b/.test(t))add(5,'expense operation');
 if(/\bsplit\b/.test(t)&&/\bpaidBy\b/.test(t))add(2,'payer + split coupling');
 if(['domain','persistence','operation','calculation','sync','serialization'].includes(r)&&score)add(3,'semantic boundary role');
 if(r==='test'&&score)add(2,'direct regression evidence');
 if(score)scored.push({file:rel,role:r,score,evidence});
}
scored.sort((a,b)=>b.score-a.score||a.file.localeCompare(b.file));

const must=[],review=[],defer=[];
for(const x of scored){
 const structural=['domain','persistence','operation','calculation','sync','serialization'].includes(x.role);
 if((structural&&x.score>=7)||x.score>=13)must.push(x);
 else if(x.score>=6)review.push(x);
 else defer.push(x);
}
// Context budget: keep must complete; cap review to 15. Deferred remains discoverable metadata only.
const packet={must,review:review.slice(0,15),defer_count:defer.length+Math.max(0,review.length-15)};
const required=[
 'src/schema/pot.ts',
 'src/services/data/types/dto.ts',
 'src/services/data/repositories/ExpenseRepository.ts',
 'src/services/data/services/ExpenseService.ts',
 'src/services/settlement/calc.ts',
 'src/services/crdt/types.ts',
 'src/services/crdt/automergeUtils.ts',
 'src/utils/export.ts'
];
for(const f of required)assert.ok(packet.must.some(x=>x.file===f),`critical owner not MUST: ${f}`);
assert.ok(packet.must.length<=25,`MUST context too large: ${packet.must.length}`);
assert.ok(packet.review.length<=15);
console.log(JSON.stringify({mode:'ranked-context-budget',authority:false,counts:{must:packet.must.length,review:packet.review.length,deferred:packet.defer_count},...packet},null,2));
