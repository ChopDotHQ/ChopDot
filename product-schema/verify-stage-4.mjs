import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveStage4 } from './stage-4-lib.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>JSON.parse(readFileSync(join(root,'product-schema',name),'utf8'));
const core=read('semantic-core.json'), graph=read('composition-graph.json'), frozen=read('frozen-baseline.json');
const actual=deriveStage4(core,graph,frozen);
const committedReport=JSON.parse(readFileSync(join(root,'product-schema/generated/completeness-report.json'),'utf8'));
const committedPacket=JSON.parse(readFileSync(join(root,'product-schema/generated/gate-b-construction.json'),'utf8'));

assert.deepEqual(committedReport,actual.report,'generated completeness report is stale');
assert.deepEqual(committedPacket,actual.packet,'generated Gate B packet is stale');
assert.equal(actual.report.status,'PASS');
assert.equal(actual.report.audits.objects.orphans.length,0);
assert.equal(actual.report.audits.views.unrendered.length,0);
assert.equal(actual.report.audits.operations.duplicate_journey_owners.length,0);
assert.equal(actual.report.audits.operations.unclassified_unowned.length,0);
assert.equal(actual.report.audits.operations.unwired.length,0);
assert.equal(actual.report.audits.routes.total,93);
assert.equal(actual.report.audits.routes.covered,93);
assert.equal(actual.report.audits.routes.gaps.length,0);
assert.equal(actual.report.audits.composition.journeys_covered,28);
assert.equal(actual.report.audits.composition.missing_journeys.length,0);
assert.equal(actual.report.audits.composition.unused_contexts.length,0);

const coordinated=new Set(actual.report.audits.operations.coordinated);
assert.deepEqual([...coordinated].sort(),['expense.resolve_issue','participant.link_account']);
assert.deepEqual([...actual.report.audits.operations.contract_only].sort(),['spend.authorize_execute','spend.materialize']);

const packet=actual.packet;
assert.equal(packet.authority,'DERIVED_ONLY');
assert.equal(packet.gate.implementation_authorized,false);
assert.deepEqual(packet.construction_order,['08','05','06','07']);
assert.equal(packet.schema_blockers.length,0);
assert.deepEqual(packet.gate_a_reuse.new_gate_b_contexts,['ctx.review']);
assert.ok(packet.gate_a_reuse.reusable_contexts.includes('ctx.expense'));
assert.ok(packet.gate_a_reuse.operation_delta.some(x=>x.id==='expense.create'&&x.status==='expand_bounded_gate_a_capability'));
for(const id of ['expense.create','expense.edit','expense.delete','expense.review_agree','expense.raise_issue','expense.resolve_issue']) assert.ok(packet.composition.operations.includes(id));
assert.ok(packet.semantic_objects.some(x=>x.id==='expense.expense'));
assert.ok(packet.semantic_objects.some(x=>x.id==='expense.review'));
assert.ok(packet.semantic_objects.some(x=>x.id==='expense.issue'));
assert.ok(packet.semantic_objects.some(x=>x.id==='position.position'));
assert.ok(packet.laws.some(x=>x.id==='LAW-EXP-01'));
assert.ok(packet.laws.some(x=>x.id==='LAW-ISSUE-01'));

const bset=new Set(packet.construction_order);
const frozenInternal=frozen.journeys.flatMap(j=>(j.next||[]).filter(to=>bset.has(j.id)&&bset.has(to)).map(to=>`${j.id}->${to}`)).sort();
const packetInternal=packet.handoffs.internal.map(x=>`${x.from}->${x.to}`).sort();
assert.deepEqual(packetInternal,frozenInternal);

console.log(JSON.stringify({stage:'product-schema-v1-stage-4',status:actual.report.status,objects:actual.report.audits.objects.total,operations:actual.report.audits.operations.total,routes:actual.report.audits.routes.total,journeys_covered:actual.report.audits.composition.journeys_covered,gate_b_journeys:packet.construction_order,schema_blockers:packet.schema_blockers.length,result:'PASS'},null,2));
