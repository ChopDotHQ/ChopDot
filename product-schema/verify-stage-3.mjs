import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const core=JSON.parse(readFileSync(join(root,'product-schema/semantic-core.json'),'utf8'));
const frozen=JSON.parse(readFileSync(join(root,'product-schema/frozen-baseline.json'),'utf8'));
const graph=JSON.parse(readFileSync(join(root,'product-schema/composition-graph.json'),'utf8'));
const obj=new Set(core.objects.map(x=>x.id)), ops=new Set(core.operations.map(x=>x.id)), views=new Set(core.derived_models.map(x=>x.id)), laws=new Set(core.laws.map(x=>x.id)), ctx=new Set(graph.contexts.map(x=>x.id)), journeys=new Set(frozen.journeys.map(x=>x.id));
for(const c of graph.contexts){for(const id of c.objects)assert.ok(obj.has(id),`${c.id} missing object ${id}`);for(const id of c.laws||[])assert.ok(laws.has(id),`${c.id} missing law ${id}`);}
assert.equal(graph.journey_projections.length,28);
for(const j of graph.journey_projections){
 assert.ok(journeys.has(j.id)); assert.ok(!Object.hasOwn(j,'requires_contexts'),`legacy requires_contexts remains J${j.id}`);
 for(const id of [...j.entry_contexts_any,...j.ambient_contexts_required,...j.effect_contexts_required,...j.emits_contexts])assert.ok(ctx.has(id),`J${j.id} missing context ${id}`);
 for(const id of [...j.owns_operations,...j.participates_operations])assert.ok(ops.has(id),`J${j.id} bad op ${id}`);
 for(const id of j.renders_views)assert.ok(views.has(id),`J${j.id} bad view ${id}`);
}
const unitById=new Map(graph.composition_units.map(x=>[x.id,x]));
for(const g of graph.gates){if(g.id==='POST_D')continue;assert.ok(g.composition&&unitById.has(g.composition),`gate ${g.id} missing composition`);for(const f of ['journeys','contexts','operations'])assert.ok(!Object.hasOwn(g,f),`gate ${g.id} duplicates ${f}`);}
const b=graph.gates.find(x=>x.id==='B'), bu=unitById.get(b.composition);
assert.deepEqual(bu.journeys,['08','05','06','07']);
assert.deepEqual(bu.views_rendered,['view.group_home']);
assert.deepEqual(bu.views_refreshed_downstream.map(x=>x.id),['view.position','view.activity']);
const j7=graph.journey_projections.find(x=>x.id==='07');for(const id of ['expense.resolve_issue','expense.withdraw_issue','expense.reply_to_issue'])assert.ok(j7.owns_operations.includes(id));
assert.ok(!graph.coordinated_operations.some(x=>x.id==='expense.resolve_issue'));
const ambient=(graph.ambient_contexts||[]).map(x=>x.id), byJ=new Map(graph.journey_projections.map(x=>[x.id,x]));
let routes=0;
for(const from of frozen.journeys)for(const to of from.next||[]){routes++;const s=byJ.get(from.id),t=byJ.get(to);const available=new Set([...(s.emits_contexts||[]),...ambient]);assert.ok(t.entry_contexts_any.some(x=>available.has(x)),`route lacks entry context J${from.id}->J${to}`);for(const req of t.ambient_contexts_required||[])assert.ok(available.has(req),`route lacks ambient requirement ${req} J${from.id}->J${to}`);}
assert.equal(routes,93);
console.log(JSON.stringify({stage:3,contexts:graph.contexts.length,journeys:28,composition_units:graph.composition_units.length,routes,result:'PASS'},null,2));
