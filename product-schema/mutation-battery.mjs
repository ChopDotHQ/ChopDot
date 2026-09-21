import assert from 'node:assert/strict';import { readFileSync } from 'node:fs';import { dirname,join } from 'node:path';import { fileURLToPath } from 'node:url';import { validateHardening } from './hardening-lib.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..'),read=n=>JSON.parse(readFileSync(join(root,'product-schema',n),'utf8'));const base={core:read('semantic-core.json'),graph:read('composition-graph.json'),frozen:read('frozen-baseline.json'),oracle:read('gate-b-authority-oracle.json')},clone=x=>structuredClone(x);
const mutations=[
 ['resolution-owner',x=>x.graph.journey_projections.find(j=>j.id==='07').owns_operations=x.graph.journey_projections.find(j=>j.id==='07').owns_operations.filter(id=>id!=='expense.resolve_issue')],
 ['missing-reply',x=>{x.graph.journey_projections.find(j=>j.id==='07').owns_operations=x.graph.journey_projections.find(j=>j.id==='07').owns_operations.filter(id=>id!=='expense.reply_to_issue');x.core.operations=x.core.operations.filter(o=>o.id!=='expense.reply_to_issue');}],
 ['allocation-identity',x=>x.core.objects.find(o=>o.id==='expense.allocation').identity=[]],
 ['invert-attribution-law',x=>x.core.laws.find(l=>l.id==='LAW-EXP-03').constraint.kind='sum_only_no_attribution'],
 ['invert-issue-scope',x=>x.core.laws.find(l=>l.id==='LAW-ISSUE-01').constraint.kind='block_all_payment_items'],
 ['remove-settlement-guard',x=>delete x.core.operations.find(o=>o.id==='expense.create').guards],
 ['group-home-global-activity-coupling',x=>{const v=x.core.derived_models.find(v=>v.id==='view.group_home');v.derived_from=v.derived_from.filter(id=>id!=='group.recent_item');v.derived_from.push('activity.item');}],
 ['write-position-directly',x=>x.core.operations.find(o=>o.id==='expense.delete').changes.push('position.position')],
 ['hide-review-gap',x=>x.core.known_gaps=x.core.known_gaps.filter(g=>g.id!=='POLICY-EXPENSE-REVIEW-INVALIDATION')],
 ['wrong-equal-remainder',x=>x.frozen.accepted_integration.gate_a.inherited_integration_constraints.find(c=>c.id==='GATEA-MONEY-EQUAL-01').constraint.kind='deterministic_equal_allocation_last_id'],
 ['drop-defaults',x=>x.graph.construction_requirements=x.graph.construction_requirements.filter(r=>r.id!=='REQ-J05-DEFAULTS')],
 ['duplicate-gate-scope',x=>x.graph.gates.find(g=>g.id==='B').journeys=['08','05','06','07']],
 ['hide-j05-blocker',x=>x.frozen.authority_blockers=[]]
];
const results=[];for(const [name,mutate] of mutations){const x=clone(base);mutate(x);const errors=validateHardening(x.core,x.graph,x.frozen,x.oracle);assert.ok(errors.length>0,`mutation escaped: ${name}`);results.push({name,detected_by:errors.map(e=>e.id)});}console.log(JSON.stringify({mutations:results.length,detected:results.length,results,result:'PASS'},null,2));
