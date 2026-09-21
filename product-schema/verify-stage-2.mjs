import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const core=JSON.parse(readFileSync(join(root,'product-schema/semantic-core.json'),'utf8'));
const frozen=JSON.parse(readFileSync(join(root,'product-schema/frozen-baseline.json'),'utf8'));
const blob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
for(const [id,s] of Object.entries(core.sources)){const b=readFileSync(join(root,s.path));assert.equal(blob(b),s.git_blob,`source drift ${id}`);}
const all=[...core.objects,...core.operations,...core.derived_models,...core.laws], ids=new Set();
for(const x of all){assert.ok(x.id);assert.ok(!ids.has(x.id),`duplicate id ${x.id}`);ids.add(x.id);for(const s of x.sources||[])assert.ok(core.sources[s],`${x.id} missing source ${s}`);}
const objectIds=new Set(core.objects.map(x=>x.id));
for(const o of core.objects)for(const d of o.derived_from||[])assert.ok(objectIds.has(d),`${o.id} derived_from missing ${d}`);
for(const op of core.operations){assert.ok(objectIds.has(op.owner),`${op.id} missing owner object`);for(const id of [...(op.changes||[]),...(op.invalidates||[]),...(op.emits||[]),...(op.guards||[])])assert.ok(objectIds.has(id),`${op.id} missing object ${id}`);}
for(const v of core.derived_models)for(const id of v.derived_from)assert.ok(objectIds.has(id),`${v.id} missing dependency ${id}`);
const jSet=new Set(frozen.journeys.map(j=>j.id));
for(const x of [...core.objects,...core.operations,...core.derived_models])for(const j of x.source_journeys||[])assert.ok(jSet.has(j),`${x.id} bad journey ${j}`);
const split=core.objects.find(x=>x.id==='expense.split'), alloc=core.objects.find(x=>x.id==='expense.allocation');
assert.ok(split.contains.includes('expense.allocation'));assert.deepEqual(alloc.identity,['expense_id','participant_id']);
assert.equal(core.laws.find(x=>x.id==='LAW-EXP-01').constraint.kind,'sum_allocations_equals_expense_total');
assert.equal(core.laws.find(x=>x.id==='LAW-EXP-03').constraint.kind,'allocation_participant_membership');
const driftGap=core.known_gaps.find(x=>x.id==='DOC-DRIFT-01');assert.equal(driftGap.detection,'derive from frozen spec headers versus higher-authority registry/approval state');
const drifted=[];
for(const j of frozen.journeys){const h=readFileSync(join(root,j.spec.path),'utf8').split('\n').slice(0,10).join(' ');if(/candidate|review pending|definition stage|prototype not built|unapproved/i.test(h)&&j.product_status==='golden')drifted.push(j.id);}
assert.ok(drifted.includes('08'),'J08 status drift must be detected');
assert.ok(!drifted.includes('20'),'J20 must not be falsely classified as drift');
console.log(JSON.stringify({stage:2,objects:core.objects.length,operations:core.operations.length,laws:core.laws.length,drifted_specs:drifted,result:'PASS'},null,2));
