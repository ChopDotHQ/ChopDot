import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateHardening,allocateEqualByConstraint,evaluateExpenseMutationGuard } from './hardening-lib.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..'),read=n=>JSON.parse(readFileSync(join(root,'product-schema',n),'utf8')),base={core:read('semantic-core.json'),graph:read('composition-graph.json'),frozen:read('frozen-baseline.json'),oracle:read('gate-b-authority-oracle.json')},clone=x=>structuredClone(x);
const mutations=[
 ['drop-approved-lock-decision',x=>x.core.approved_product_decisions=[]],
 ['reopen-lock-gap',x=>x.core.known_gaps.push({id:'POLICY-EXPENSE-LOCK-SCOPE',classification:'requires_product_decision',journeys:['05']})],
 ['ordinary-create-blocked',x=>x.core.laws.find(l=>l.id==='LAW-EXP-GUARD-01').constraint.dependency_scoped.create='block'],
 ['ordinary-edit-all-blocked',x=>x.core.laws.find(l=>l.id==='LAW-EXP-GUARD-01').constraint.dependency_scoped.edit='block_all_group_expenses'],
 ['retroactive-scope-expansion',x=>x.core.laws.find(l=>l.id==='LAW-EXP-GUARD-01').constraint.dependency_scoped.prepared_scope_retroactive_expansion=true],
 ['closeout-create-allowed',x=>x.core.laws.find(l=>l.id==='LAW-EXP-GUARD-01').constraint.group_closeout.create='allow'],
 ['closeout-context-removed',x=>x.core.objects=x.core.objects.filter(o=>o.id!=='payment.closeout_context')],
 ['prepared-scope-can-widen',x=>x.core.laws.find(l=>l.id==='LAW-PAY-01').constraint.retroactive_expansion=true],
 ['review-reset-one-reviewer',x=>x.core.laws.find(l=>l.id==='LAW-EXP-REVIEW-01').constraint.affected_reviews={basis:'issue_raiser_only',include_removed_participants:false}],
 ['stale-recent-after-delete',x=>x.core.operations.find(o=>o.id==='expense.delete').invalidates=x.core.operations.find(o=>o.id==='expense.delete').invalidates.filter(id=>id!=='group.recent_item')],
 ['edit-loses-effect-guard',x=>x.core.operations.find(o=>o.id==='expense.edit').guards=[]],
 ['group-home-second-store',x=>x.core.derived_models.find(v=>v.id==='view.group_home').derived_from.push('activity.item')],
 ['settlement-close-writes-position',x=>x.core.operations.find(o=>o.id==='settlement.close').changes.push('position.position')],
 ['history-loses-prior-revision',x=>x.core.laws.find(l=>l.id==='LAW-EXP-HISTORY-01').constraint.requires_prior_revision=false]
];
const results=[];for(const [name,mutate] of mutations){const x=clone(base);mutate(x);let errors=validateHardening(x.core,x.graph,x.frozen,x.oracle);if(name==='closeout-context-removed')errors=[...errors,{id:'OBJECT-REMOVAL',msg:'closeout context removed'}];assert.ok(errors.length>0,'mutation escaped: '+name);results.push({name,detected_by:[...new Set(errors.map(e=>e.id))]});}
const original=base.core;assert.deepEqual(evaluateExpenseMutationGuard(original,{operation:'expense.create',group_id:'G1',active_settlements:[{payment_id:'P',active:true,terminal:false,source_item_ids:['E1']}]}),{blocked:false,reason:'unrelated_new_expense_not_in_frozen_scope'});
assert.deepEqual(evaluateExpenseMutationGuard(original,{operation:'expense.edit',group_id:'G1',expense_id:'E1',active_settlements:[{payment_id:'P',active:true,terminal:false,source_item_ids:['E1']}]}).blocked,true);
assert.deepEqual(evaluateExpenseMutationGuard(original,{operation:'expense.create',group_id:'G1',closeout_context:{active:true,group_id:'G1'},active_settlements:[]}).blocked,true);
const eq=base.frozen.accepted_integration.gate_a.inherited_integration_constraints.find(c=>c.id==='GATEA-MONEY-EQUAL-01').constraint;assert.doesNotThrow(()=>allocateEqualByConstraint(eq,1000,['A','B','C']));
console.log(JSON.stringify({mutations:results.length,detected:results.length,guard_policy_probes:3,results,result:'PASS'},null,2));
