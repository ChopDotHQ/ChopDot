import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const model=JSON.parse(readFileSync(join(root,'product-schema/semantic-core.json'),'utf8'));
const blob=buf=>createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');
const byId=new Map();
const register=(items,label)=>{ for(const x of items){ assert.ok(x.id, `${label} missing id`); assert.ok(!byId.has(x.id), `duplicate semantic id ${x.id}`); byId.set(x.id,{label,item:x}); } };
register(model.objects,'object'); register(model.operations,'operation'); register(model.derived_models,'derived model'); register(model.laws,'law');

assert.equal(model.stage.id,2);
assert.equal(model.frozen_baseline.product_authority_commit,'4ba456e6595330e4ca8e21366e0d827f17e10881');
assert.equal(model.frozen_baseline.product_authority_tree,'cb424dafedff066fed433e106eb4468bec985d98');

for(const [id,source] of Object.entries(model.sources)){
  assert.ok(source.path && source.git_blob, `bad source ${id}`);
  const data=readFileSync(join(root,source.path));
  assert.equal(blob(data),source.git_blob,`source drift ${id}: ${source.path}`);
  assert.ok(!source.path.startsWith('research/product-ir'),`research source cannot be product authority: ${source.path}`);
}
const sourceIds=new Set(Object.keys(model.sources));
const checkSources=(x)=>{ assert.ok(Array.isArray(x.sources)&&x.sources.length>0,`${x.id} has no sources`); for(const s of x.sources) assert.ok(sourceIds.has(s),`${x.id} missing source ${s}`); };
for(const x of [...model.objects,...model.operations,...model.derived_models,...model.laws]) checkSources(x);

const objectIds=new Set(model.objects.map(x=>x.id));
for(const op of model.operations){
  assert.ok(objectIds.has(op.owner),`${op.id} owner missing: ${op.owner}`);
  for(const id of op.changes||[]) assert.ok(objectIds.has(id),`${op.id} changes missing object ${id}`);
}
for(const view of model.derived_models) for(const id of view.derived_from) assert.ok(objectIds.has(id),`${view.id} derives missing object ${id}`);
for(const law of model.laws) for(const id of law.applies_to) assert.ok(objectIds.has(id),`${law.id} applies to missing object ${id}`);
for(const pair of model.anti_collapse){ assert.ok(objectIds.has(pair.left)); assert.ok(objectIds.has(pair.right)); assert.notEqual(pair.left,pair.right); }

const journeyIds=new Set(Array.from({length:28},(_,i)=>String(i+1).padStart(2,'0')));
const covered=new Set();
for(const x of [...model.objects,...model.operations,...model.derived_models]){
  for(const j of x.source_journeys||[]){ assert.ok(journeyIds.has(j),`${x.id} invalid journey ${j}`); covered.add(j); }
}
assert.deepEqual([...covered].sort(),[...journeyIds].sort(),'all 28 frozen journeys must contribute to the normalized semantic core');

assert.ok(model.objects.some(x=>x.id==='identity.participant'));
assert.ok(model.objects.some(x=>x.id==='money.money_v1'));
assert.ok(model.objects.some(x=>x.id==='expense.expense'));
assert.ok(model.objects.some(x=>x.id==='position.position'));
assert.ok(model.objects.some(x=>x.id==='payment.intent'));
assert.ok(model.objects.some(x=>x.id==='spend.intent'));
assert.ok(model.objects.some(x=>x.id==='recovery.context'));
assert.ok(model.laws.some(x=>x.id==='LAW-OP-02'));
assert.ok(model.anti_collapse.some(x=>x.left==='payment.intent'&&x.right==='spend.intent'));

console.log(JSON.stringify({
 stage:'product-schema-v1-stage-2',
 domains:model.domains.length,
 objects:model.objects.length,
 operations:model.operations.length,
 derived_models:model.derived_models.length,
 laws:model.laws.length,
 journey_source_coverage:covered.size,
 known_gaps:model.known_gaps.length,
 result:'PASS'
},null,2));
