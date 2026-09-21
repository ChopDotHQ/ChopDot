import assert from 'node:assert/strict';import { readFileSync } from 'node:fs';import { execFileSync } from 'node:child_process';import { createHash } from 'node:crypto';import { dirname,join } from 'node:path';import { fileURLToPath } from 'node:url';import { validateHardening,evaluateExpenseContract,allocateEqualByConstraint } from './hardening-lib.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..'),read=n=>JSON.parse(readFileSync(join(root,'product-schema',n),'utf8'));const core=read('semantic-core.json'),graph=read('composition-graph.json'),frozen=read('frozen-baseline.json'),oracle=read('gate-b-authority-oracle.json');
const gitBlob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
for(const a of oracle.assertions)for(const e of a.evidence||[]){const b=e.commit?Buffer.from(execFileSync('git',['show',`${e.commit}:${e.path}`])):readFileSync(join(root,e.path));assert.equal(gitBlob(b),e.git_blob,`${a.id} evidence blob mismatch ${e.path}`);const t=b.toString('utf8');for(const phrase of e.contains||[])assert.ok(t.includes(phrase),`${a.id} evidence phrase missing: ${phrase}`);}
assert.deepEqual(validateHardening(core,graph,frozen,oracle),[]);
const valid={operation:'expense.create',locked:false,total_minor_units:1000,group_participants:['A','B','C'],selected_participants:['A','B'],allocations:[{participant_id:'A',minor_units:600},{participant_id:'B',minor_units:400}]};
assert.deepEqual(evaluateExpenseContract(core,valid),[]);
assert.deepEqual(evaluateExpenseContract(core,{...valid,allocations:[{participant_id:'A',minor_units:500},{participant_id:'B',minor_units:400}]}),['LAW-EXP-01']);
assert.deepEqual(evaluateExpenseContract(core,{...valid,allocations:[{participant_id:'A',minor_units:600},{participant_id:'C',minor_units:400}]}),['LAW-EXP-03']);
assert.deepEqual(evaluateExpenseContract(core,{...valid,allocations:[{participant_id:'A',minor_units:500},{participant_id:'A',minor_units:500}]}),['LAW-EXP-03']);
assert.deepEqual(evaluateExpenseContract(core,{...valid,operation:'expense.edit',locked:true}),['LAW-EXP-GUARD-01']);
const eq=frozen.accepted_integration.gate_a.inherited_integration_constraints.find(x=>x.id==='GATEA-MONEY-EQUAL-01').constraint;
assert.deepEqual(allocateEqualByConstraint(eq,1000,['C','A','B','A']),[{participant_id:'A',minor_units:334},{participant_id:'B',minor_units:333},{participant_id:'C',minor_units:333}]);
assert.deepEqual(allocateEqualByConstraint(eq,1001,['C','A','B']),[{participant_id:'A',minor_units:334},{participant_id:'B',minor_units:334},{participant_id:'C',minor_units:333}]);
console.log(JSON.stringify({hardening:'PASS',oracle_assertions:oracle.assertions.length,expense_contract_cases:5,equal_allocation_cases:2,product_decisions:core.known_gaps.filter(x=>x.classification==='requires_product_decision').map(x=>x.id)},null,2));
