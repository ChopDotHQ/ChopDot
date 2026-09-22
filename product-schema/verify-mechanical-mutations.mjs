import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveStage5 } from './stage-5-lib.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=n=>JSON.parse(readFileSync(join(root,'product-schema',n),'utf8'));
const x=deriveStage5({
  root,
  core:read('semantic-core.json'),
  graph:read('composition-graph.json'),
  frozen:read('frozen-baseline.json'),
  registry:read('golden-mapping-sources.json'),
  bindings:read('domain-event-bindings-v1.json'),
  reconstruction:read('reconstruction-map-v1.json'),
  ui:JSON.parse(readFileSync(join(root,'product-schema/generated/ui-surface-inventory.json'),'utf8')),
  tasks:read('task-paths-v1.json')
});
const generated=JSON.parse(readFileSync(join(root,'product-schema/generated/mutation-coverage.json'),'utf8'));
assert.deepEqual(generated,x.mutations);
assert.equal(x.mutations.baseline_errors.length,0);
assert.ok(x.mutations.detector.includes('independent'));
assert.ok(x.mutations.total.applicable>=50);
assert.equal(x.mutations.total.detected,x.mutations.total.applicable);
assert.equal(x.mutations.total.score,100);
for(const [domain,v] of Object.entries(x.mutations.domains)){
  assert.ok(v.applicable>0,'independent safety domain has no mutation denominator: '+domain);
  assert.equal(v.detected,v.applicable,'escaped independent co-mutation in '+domain);
  assert.equal(v.score,100);
}
console.log(JSON.stringify({independent_mutations:x.mutations.total.applicable,detected:x.mutations.total.detected,score:x.mutations.total.score,domains:x.mutations.domains,result:'PASS'},null,2));
