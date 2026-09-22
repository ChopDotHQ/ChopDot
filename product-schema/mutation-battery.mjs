import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateHardening,evaluateExpenseContract,allocateEqualByConstraint } from './hardening-lib.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..'),read=n=>JSON.parse(readFileSync(join(root,'product-schema',n),'utf8')),base={core:read('semantic-core.json'),graph:read('composition-graph.json'),frozen:read('frozen-baseline.json'),oracle:read('gate-b-authority-oracle.json')},clone=x=>structuredClone(x);
const mutations=[
 ['review-reset-one-reviewer',x=>x.core.laws.find(l=>l.id==='LAW-EXP-REVIEW-01').constraint.affected_reviews={basis:'issue_raiser_only',include_removed_participants:false}],
 ['review-reset-before-persistence',x=>x.core.laws.find(l=>l.id==='LAW-EXP-REVIEW-01').constraint.trigger.persistence='submitted'],
 ['stale-recent-after-delete',x=>x.core.operations.find(o=>o.id==='expense.delete').invalidates=x.core.operations.find(o=>o.id==='expense.delete').invalidates.filter(id=>id!=='group.recent_item')],
 ['reply-silently-resolves',x=>x.core.operations.find(o=>o.id==='expense.reply_to_issue').changes.push('expense.review')],
 ['edit-loses-effect-guard',x=>x.core.operations.find(o=>o.id==='expense.edit').guards=[]],
 ['position-loses-lineage',x=>x.core.laws.find(l=>l.id==='LAW-POS-01').constraint.lineage_explainable=false],
 ['group-home-second-store',x=>x.core.derived_models.find(v=>v.id==='view.group_home').derived_from.push('activity.item')],
 ['position-becomes-entity',x=>x.core.objects.find(o=>o.id==='position.position').kind='entity'],
 ['allocation-cross-group',x=>x.core.laws.find(l=>l.id==='LAW-EXP-03').constraint.membership_scope='any_group'],
 ['dependent-effect-preserves-review',x=>x.core.operations.find(o=>o.id==='expense.edit').dependent_state_effects[0].effect='preserve all existing reviews unchanged'],
 ['read-projection-owns-delete',x=>x.graph.journey_projections.find(j=>j.id==='08').owns_operations=['expense.delete']],
 ['equal-remainder-rule-drifts',x=>x.frozen.accepted_integration.gate_a.inherited_integration_constraints.find(c=>c.id==='GATEA-MONEY-EQUAL-01').constraint.remainder_rule='last-stable-sorted-participant-ids-get-plus-one-minor-unit'],
 ['settlement-close-writes-position',x=>x.core.operations.find(o=>o.id==='settlement.close').changes.push('position.position')],
 ['history-loses-prior-revision',x=>x.core.laws.find(l=>l.id==='LAW-EXP-HISTORY-01').constraint.requires_prior_revision=false]
];
const results=[];for(const [name,mutate] of mutations){const x=clone(base);mutate(x);let errors=validateHardening(x.core,x.graph,x.frozen,x.oracle);if(name==='equal-remainder-rule-drifts'){try{allocateEqualByConstraint(x.frozen.accepted_integration.gate_a.inherited_integration_constraints.find(c=>c.id==='GATEA-MONEY-EQUAL-01').constraint,1000,['A','B','C']);}catch(e){errors=[...errors,{id:'ALLOCATOR-CONSTRAINT',msg:String(e)}];}}assert.ok(errors.length>0,'mutation escaped: '+name);results.push({name,detected_by:[...new Set(errors.map(e=>e.id))]});}
const badEqual={operation:'expense.create',split_method:'equal',total_minor_units:1000,group_participants:['A','B','C'],selected_participants:['A','B','C'],allocations:[{participant_id:'A',minor_units:1},{participant_id:'B',minor_units:1},{participant_id:'C',minor_units:998}]};assert.ok(evaluateExpenseContract(base.core,base.frozen,badEqual).includes('GATEA-MONEY-EQUAL-01'));
console.log(JSON.stringify({mutations:results.length,detected:results.length,results,result:'PASS'},null,2));
