import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'product-schema/frozen-baseline.json'), 'utf8'));
const gitBlob = buf => createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');
const read = path => readFileSync(join(root, path));
const verifyBlob = source => {
  assert.ok(source.git_blob, `missing pinned blob: ${source.path}`);
  assert.equal(gitBlob(read(source.path)), source.git_blob, `frozen source changed: ${source.path}`);
};

assert.equal(manifest.stage.id, 1);
assert.equal(manifest.authority.product.commit, '4ba456e6595330e4ca8e21366e0d827f17e10881');
assert.equal(manifest.authority.product.tree, 'cb424dafedff066fed433e106eb4468bec985d98');
assert.equal(manifest.journeys.length, 28);
assert.equal(new Set(manifest.journeys.map(j => j.id)).size, 28);

for (const source of manifest.source_groups.canonical_local_sources) verifyBlob(source);
for (const source of manifest.source_groups.phase_c1_overlays) verifyBlob(source);
for (const source of manifest.source_groups.reference_only) verifyBlob(source);
for (const journey of manifest.journeys) {
  verifyBlob(journey.spec);
  verifyBlob(journey.prototype);
  if (journey.qa?.git_blob) verifyBlob(journey.qa);
  for (const contract of journey.contracts) verifyBlob(contract);
  for (const next of journey.next) assert.ok(manifest.journeys.some(j => j.id === next), `bad next ref ${journey.id}->${next}`);
}
const locks = JSON.parse(readFileSync(join(root, 'prototypes/experience-workbench/registry/golden-artifact-locks.json'), 'utf8'));
assert.equal(locks.length, 28);
const lockById = new Map(locks.map(x => [x.journey, x]));
for (const journey of manifest.journeys) {
  assert.equal(journey.prototype.sha256, lockById.get(journey.id)?.sha256, `Golden SHA mismatch for J${journey.id}`);
}
const progress=JSON.parse(readFileSync(join(root,'prototypes/experience-workbench/registry/progress.json'),'utf8'));
assert.equal(progress.registered_journeys,28);
assert.equal(progress.golden_count,28);
assert.equal(progress.remaining_overall,0);
assert.equal(progress.paused_after_freeze,true);

assert.equal(manifest.accepted_integration.gate_a.closed,true);
assert.deepEqual(manifest.accepted_integration.gate_b.journeys,['08','05','06','07']);
assert.equal(manifest.inventory_checks.all_specs_pinned,true);
assert.equal(manifest.inventory_checks.all_prototypes_pinned,true);
assert.equal(manifest.inventory_checks.all_next_refs_resolve,true);

console.log(JSON.stringify({
  stage:'product-schema-v1-stage-1',
  frozen_product_commit:manifest.authority.product.commit,
  journeys:manifest.journeys.length,
  goldens:locks.length,
  gate_a:manifest.accepted_integration.gate_a.status,
  gate_b_journeys:manifest.accepted_integration.gate_b.journeys,
  result:'PASS'
}, null, 2));
