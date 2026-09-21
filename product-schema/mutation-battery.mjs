import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateHardening } from './hardening-lib.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=n=>JSON.parse(readFileSync(join(root,'product-schema',n),'utf8'));
const base={core:read('semantic-core.json'),graph:read('composition-graph.json'),frozen:read('frozen-baseline.json'),oracle:read('gate-b-authority-oracle.json')};
const clone=x=>structuredClone(x);
const mutations=[
 ['resolution-owner',x=>{x.graph.journey_projections.find(j=>j.id==='07').owns_operations=x.graph.journey_projections.find(j=>j.id==='07').owns_operations.filter(id=>id!=='expense.resolve_issue');}],
 ['missing-reply',x=>{x.graph.journey_projections.find(j=>j.id==='07').owns_operations=x.graph.journey_projections.find(j=>j.id==='07').owns_operations.filter(id=>id!=='expense.reply_to_issue');x.core.operations=x.core.operations.filter(o=>o.id!=='expense.reply_to_issue');}],
 ['allocation-identity',x=>{x.core.objects.find(o=>o.id==='expense.allocation').identity=[];}],
 ['remove-attribution-law',x=>{x.core.laws=x.core.laws.filter(l=>l.id!=='LAW-EXP-03');}],
 ['remove-settlement-guard',x=>{delete x.core.operations.find(o=>o.id==='expense.create').guards;}],
 ['group-home-fake-fixture',x=>{x.core.derived_models.find(v=>v.id==='view.group_home').derived_from=x.core.derived_models.find(v=>v.id==='view.group_home').derived_from.filter(id=>id!=='activity.item');}],
 ['no-expense-event',x=>{x.core.operations.find(o=>o.id==='expense.edit').emits=[];}],
 ['write-position-directly',x=>{x.core.operations.find(o=>o.id==='expense.delete').changes.push('position.position');}],
 ['drop-tier4-authority',x=>{x.frozen.journeys.find(j=>j.id==='06').authority_files=x.frozen.journeys.find(j=>j.id==='06').authority_files.filter(a=>a.kind!=='state_inventory');}],
 ['duplicate-gate-scope',x=>{x.graph.gates.find(g=>g.id==='B').journeys=['08','05','06','07'];}],
 ['drop-gate-a-caveat',x=>{delete x.graph.gates.find(g=>g.id==='A').provenance_caveat;}],
 ['hide-j05-blocker',x=>{x.frozen.authority_blockers=[];}]
];
const results=[];
for(const [name,mutate] of mutations){
 const x=clone(base); mutate(x); const errors=validateHardening(x.core,x.graph,x.frozen,x.oracle);
 assert.ok(errors.length>0,`mutation escaped: ${name}`);
 results.push({name,detected_by:errors.map(e=>e.id)});
}
console.log(JSON.stringify({mutations:results.length,detected:results.length,results,result:'PASS'},null,2));
