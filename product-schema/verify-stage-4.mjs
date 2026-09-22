import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveStage4 } from './stage-4-lib.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..'),read=n=>JSON.parse(readFileSync(join(root,'product-schema',n),'utf8')),x=deriveStage4(read('semantic-core.json'),read('composition-graph.json'),read('frozen-baseline.json')),r=JSON.parse(readFileSync(join(root,'product-schema/generated/completeness-report.json'),'utf8')),p=JSON.parse(readFileSync(join(root,'product-schema/generated/gate-b-construction.json'),'utf8'));
assert.deepEqual(r,x.report);assert.deepEqual(p,x.packet);assert.equal(r.schema_status,'PASS');assert.equal(p.gate.pre_gate_b_readiness,'READY_FOR_HUMAN_AUTHORIZATION');assert.equal(p.authority_blockers.length,0);assert.equal(p.product_decisions_required.length,0);assert.ok(p.approved_product_decisions.some(x=>x.id==='DEC-EXPENSE-SETTLEMENT-LOCK-01'));assert.ok(p.semantic_objects.some(x=>x.id==='payment.closeout_context'));assert.ok(p.construction_requirements.some(x=>x.id==='REQ-J06-LOCK'));console.log(JSON.stringify({stage:4,schema_status:r.schema_status,pre_gate_b_readiness:r.pre_gate_b_readiness,approved_product_decisions:p.approved_product_decisions.map(x=>x.id),authority_blockers:0,product_decisions_required:0,result:'PASS'},null,2));
