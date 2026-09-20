// Product IR V0 implementation discovery experiment.
// Uses source text as evidence to discover candidate implementation ownership.
// No mapping is written into MODEL.yaml and no production file is changed.

import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root=new URL('../../',import.meta.url).pathname;
const src=join(root,'src');
const allowExt=/\.(ts|tsx)$/;
function walk(dir,out=[]){for(const name of readdirSync(dir)){const p=join(dir,name);const st=statSync(p);if(st.isDirectory())walk(p,out);else if(allowExt.test(name))out.push(p);}return out;}
const files=walk(src);

const signals={
  Expense:[
    {pattern:/\bExpenseSchema\b/,weight:8,reason:'defines/uses ExpenseSchema'},
    {pattern:/\bCreateExpenseDTO\b|\bUpdateExpenseDTO\b/,weight:5,reason:'uses expense DTO'},
    {pattern:/\bpaidBy\b/,weight:2,reason:'uses payer field'},
    {pattern:/\bsplit\b/,weight:1,reason:'uses split field'}
  ],
  'Expense.Create':[
    {pattern:/\baddExpense\b|\baddExpenseToPot\b/,weight:7,reason:'create operation'},
    {pattern:/\bCreateExpenseDTO\b/,weight:6,reason:'create DTO'},
    {pattern:/\bonSave\b/,weight:1,reason:'save boundary'}
  ],
  'Expense.Edit':[
    {pattern:/\bupdateExpense\b/,weight:8,reason:'update operation'},
    {pattern:/\bUpdateExpenseDTO\b/,weight:6,reason:'update DTO'},
    {pattern:/\bexistingExpense\b/,weight:2,reason:'edit UI state'}
  ],
  'Position.Recompute':[
    {pattern:/\bcomputeBalances\b/,weight:10,reason:'balance derivation'},
    {pattern:/\bgetMemberBalance\b/,weight:5,reason:'position read'},
    {pattern:/\bsuggestSettlements\b/,weight:3,reason:'downstream settlement derivation'}
  ]
};
function discover(key){
 const defs=signals[key];assert.ok(defs,`unknown semantic target ${key}`);
 const hits=[];
 for(const file of files){
  const text=readFileSync(file,'utf8');let score=0;const reasons=[];
  for(const s of defs){if(s.pattern.test(text)){score+=s.weight;reasons.push(s.reason);}}
  if(score>0)hits.push({file:relative(root,file),score,reasons});
 }
 return hits.sort((a,b)=>b.score-a.score||a.file.localeCompare(b.file)).slice(0,12);
}
const result=Object.fromEntries(Object.keys(signals).map(k=>[k,discover(k)]));
assert.ok(result.Expense.some(x=>x.file==='src/schema/pot.ts'));
assert.ok(result['Position.Recompute'].some(x=>x.file==='src/services/settlement/calc.ts'));
assert.ok(result['Expense.Create'].some(x=>x.file==='src/services/data/services/ExpenseService.ts'));
console.log(JSON.stringify({mode:'derived-candidate-ownership',authority:false,result},null,2));
