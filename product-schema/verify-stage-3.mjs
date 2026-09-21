import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const core=JSON.parse(readFileSync(join(root,'product-schema/semantic-core.json'),'utf8'));
const frozen=JSON.parse(readFileSync(join(root,'product-schema/frozen-baseline.json'),'utf8'));
const graph=JSON.parse(readFileSync(join(root,'product-schema/composition-graph.json'),'utf8'));

assert.equal(graph.stage.id,3);
assert.equal(graph.frozen_baseline.product_authority_commit,frozen.authority.product.commit);
assert.equal(graph.frozen_baseline.stage_2_parent_commit,'2e2b6a211af62af687586a7aa2d783b606323693');

const objectIds=new Set(core.objects.map(x=>x.id));
const opIds=new Set(core.operations.map(x=>x.id));
const viewIds=new Set(core.derived_models.map(x=>x.id));
const lawIds=new Set(core.laws.map(x=>x.id));
const journeyIds=new Set(frozen.journeys.map(x=>x.id));
const contextIds=new Set(graph.contexts.map(x=>x.id));
assert.equal(contextIds.size,graph.contexts.length,'context IDs unique');

for(const c of graph.contexts){
  assert.ok(c.objects.length>0,`${c.id} empty`);
  for(const id of c.objects) assert.ok(objectIds.has(id),`${c.id} missing object ${id}`);
  for(const id of c.laws||[]) assert.ok(lawIds.has(id),`${c.id} missing law ${id}`);
}
assert.equal(graph.journey_projections.length,28);
assert.equal(new Set(graph.journey_projections.map(x=>x.id)).size,28);
for(const j of graph.journey_projections){
  assert.ok(journeyIds.has(j.id),`unknown journey ${j.id}`);
  for(const id of j.requires_contexts) assert.ok(contextIds.has(id),`${j.id} missing required context ${id}`);
  for(const id of j.emits_contexts) assert.ok(contextIds.has(id),`${j.id} missing emitted context ${id}`);
  for(const id of [...j.owns_operations,...j.participates_operations]) assert.ok(opIds.has(id),`${j.id} missing operation ${id}`);
  for(const id of j.renders_views) assert.ok(viewIds.has(id),`${j.id} missing view ${id}`);
  if(j.recovery) assert.equal(j.recovery.cross_cutting_owner,'28');
}
assert.deepEqual(graph.journey_projections.map(x=>x.id).sort(),[...journeyIds].sort());

const coveredOps=new Set(graph.contract_only_operations);
for(const j of graph.journey_projections) for(const id of [...j.owns_operations,...j.participates_operations]) coveredOps.add(id);
for(const unit of graph.composition_units) for(const id of unit.operations||[]) coveredOps.add(id);
const missingOps=[...opIds].filter(id=>!coveredOps.has(id));
assert.deepEqual(missingOps,[],`unwired semantic operations: ${missingOps.join(', ')}`);

for(const id of graph.contract_only_operations) assert.ok(opIds.has(id),`bad contract-only op ${id}`);
for(const unit of graph.composition_units){
  for(const id of unit.journeys||[]) assert.ok(journeyIds.has(id),`${unit.id} bad journey ${id}`);
  for(const id of unit.boundary_journeys||[]) assert.ok(journeyIds.has(id),`${unit.id} bad boundary journey ${id}`);
  for(const id of unit.contexts||[]) assert.ok(contextIds.has(id),`${unit.id} bad context ${id}`);
  for(const id of unit.operations||[]) assert.ok(opIds.has(id),`${unit.id} bad operation ${id}`);
  for(const id of unit.views||[]) assert.ok(viewIds.has(id),`${unit.id} bad view ${id}`);
}

const routeEdges=frozen.journeys.flatMap(j=>(j.next||[]).map(to=>({from:j.id,to})));
assert.equal(routeEdges.length,93);
for(const e of routeEdges){ assert.ok(journeyIds.has(e.from)); assert.ok(journeyIds.has(e.to)); }

const a=graph.gates.find(x=>x.id==='A'), b=graph.gates.find(x=>x.id==='B');
assert.equal(a.status,'accepted-materialized-verified');
assert.equal(a.closed,true);
assert.deepEqual(a.primary_journeys,['01','02']);
assert.ok(a.partial_journey_capabilities.some(x=>x.journey==='05'));
assert.ok(a.scope_exclusions.some(x=>x.includes('J08')));
assert.deepEqual(b.journeys,['08','05','06','07']);
assert.equal(b.status,'planned_not_implemented_by_schema');
assert.equal(b.composition,'composition.core_expense_loop');

const expenseUnit=graph.composition_units.find(x=>x.id==='composition.core_expense_loop');
assert.deepEqual(expenseUnit.journeys,['08','05','06','07']);
for(const id of ['expense.create','expense.edit','expense.delete','expense.review_agree','expense.raise_issue','expense.resolve_issue']) assert.ok(expenseUnit.operations.includes(id));

assert.ok(core.operations.some(x=>x.id==='notification.set_read_state'),'Stage 3 normalized J18 read-state operation');
const j18=graph.journey_projections.find(x=>x.id==='18');
assert.ok(j18.owns_operations.includes('notification.set_read_state'));

console.log(JSON.stringify({
 stage:'product-schema-v1-stage-3',
 contexts:graph.contexts.length,
 journeys:graph.journey_projections.length,
 registry_routes_derived:routeEdges.length,
 composition_units:graph.composition_units.length,
 semantic_operations_wired:opIds.size,
 gates:graph.gates.length,
 gate_b_journeys:b.journeys,
 result:'PASS'
},null,2));
