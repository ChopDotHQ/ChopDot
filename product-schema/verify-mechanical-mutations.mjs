import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveMechanicalMutationCoverage,validateSafetyContracts } from './stage-5-safety-lib.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=n=>JSON.parse(readFileSync(join(root,'product-schema',n),'utf8'));
const core=read('semantic-core.json');
const graph=read('composition-graph.json');
const reconstruction=read('reconstruction-map-v1.json');
const x=deriveMechanicalMutationCoverage(core,graph,reconstruction);
const generated=JSON.parse(readFileSync(join(root,'product-schema/generated/mutation-coverage.json'),'utf8'));

assert.deepEqual(generated,x);
assert.deepEqual(validateSafetyContracts(core,graph,reconstruction),[]);
assert.equal(x.baseline_errors.length,0);
assert.ok(x.total.applicable>0);
assert.equal(x.total.detected,x.total.applicable);
assert.equal(x.total.score,100);
for(const [k,v] of Object.entries(x.domains)){
  assert.ok(v.applicable>0,'safety domain has no mutation denominator: '+k);
  assert.equal(v.detected,v.applicable,'escaped mechanical mutation in '+k);
  assert.equal(v.score,100);
}
console.log(JSON.stringify({mechanical_mutations:x.total.applicable,detected:x.total.detected,score:x.total.score,domains:x.domains,result:'PASS'},null,2));
