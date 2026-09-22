import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateHardening,allocateEqualByConstraint,evaluateExpenseMutationGuard } from './hardening-lib.mjs';
import { deriveStage4 } from './stage-4-lib.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..'),read=n=>JSON.parse(readFileSync(join(root,'product-schema',n),'utf8')),base={core:read('semantic-core.json'),graph:read('composition-graph.json'),frozen:read('frozen-baseline.json'),oracle:read('gate-b-authority-oracle.json')},clone=x=>structuredClone(x);
const mutations=[
 ['drop-approved-lock-decisions',x=>x.core.approved_product_decisions=[]],
 ['guard-condition-drops-fail-closed',x=>x.core.laws.find(l=>l.id==='LAW-EXP-GUARD-01').constraint.active_scope.fail_closed=false],
 ['guard-release-user-dismissal',x=>x.core.laws.find(l=>l.id==='LAW-EXP-GUARD-01').constraint.active_scope.release='terminal result or user dismissal'],
 ['guard-explanation-disabled',x=>x.core.laws.find(l=>l.id==='LAW-EXP-GUARD-01').constraint.explanation_required=false],
 ['guard-loses-settlement-scope-input',x=>x.core.objects.find(o=>o.id==='expense.mutation_guard').derived_from=x.core.objects.find(o=>o.id==='expense.mutation_guard').derived_from.filter(id=>id!=='payment.settlement_scope')],
 ['req-j05-inverts-create',x=>x.graph.construction_requirements.find(r=>r.id==='REQ-J05-LOCK').value.ordinary_settlement_create='allow_unrelated_new_expense'],
 ['req-j06-releases-unknown',x=>x.graph.construction_requirements.find(r=>r.id==='REQ-J06-LOCK').value.unknown_effect='release_after_timeout'],
 ['issue-dependency-widens-group',x=>x.core.laws.find(l=>l.id==='LAW-ISSUE-01').constraint.dependency_key='any_open_issue_in_group'],
 ['raise-issue-keeps-prepared-intent',x=>x.core.operations.find(o=>o.id==='expense.raise_issue').invalidates_prepared=[]],
 ['partial-remainder-releases-lock',x=>x.core.laws.find(l=>l.id==='LAW-PAY-03').constraint.release_lock_only_when_no_open_remainder=false],
 ['prepared-eligibility-allows-oversize',x=>x.core.laws.find(l=>l.id==='LAW-PAY-04').constraint.amount_must_not_exceed_current_eligible_balance=false],
 ['j08-blanket-lock-reintroduced',x=>x.graph.construction_requirements.find(r=>r.id==='REQ-J08-STATES').value.push('settlement_in_progress')],
 ['closeout-leaks-gate-b-context',x=>x.graph.contexts.find(c=>c.id==='ctx.expense_guard').objects.push('payment.closeout_context')],
 ['closeout-law-leaks-gate-b',x=>x.graph.composition_units.find(u=>u.id==='composition.core_expense_loop').law_refs.push('LAW-EXP-CLOSEOUT-01')],
 ['review-reset-one-reviewer',x=>x.core.laws.find(l=>l.id==='LAW-EXP-REVIEW-01').constraint.affected_reviews={basis:'issue_raiser_only',include_removed_participants:false}],
 ['stale-recent-after-delete',x=>x.core.operations.find(o=>o.id==='expense.delete').invalidates=x.core.operations.find(o=>o.id==='expense.delete').invalidates.filter(id=>id!=='group.recent_item')],
 ['edit-loses-effect-guard',x=>x.core.operations.find(o=>o.id==='expense.edit').guards=[]],
 ['group-home-second-store',x=>x.core.derived_models.find(v=>v.id==='view.group_home').derived_from.push('activity.item')],
 ['settlement-close-writes-position',x=>x.core.operations.find(o=>o.id==='settlement.close').changes.push('position.position')],
 ['history-loses-prior-revision',x=>x.core.laws.find(l=>l.id==='LAW-EXP-HISTORY-01').constraint.requires_prior_revision=false]
];
const results=[];for(const [name,mutate] of mutations){const x=clone(base);mutate(x);const errors=validateHardening(x.core,x.graph,x.frozen,x.oracle);assert.ok(errors.length>0,'mutation escaped: '+name);results.push({name,detected_by:[...new Set(errors.map(e=>e.id))]});}
const gap=clone(base);gap.core.known_gaps.push({id:'TEST-HONEST-GAP',classification:'requires_product_decision',journeys:['05'],statement:'test',handling:'test'});assert.deepEqual(validateHardening(gap.core,gap.graph,gap.frozen,gap.oracle),[]);assert.equal(deriveStage4(gap.core,gap.graph,gap.frozen).packet.gate.pre_gate_b_readiness,'BLOCKED');
const scope={payment_id:'P',source_item_ids:['E1'],payer_participant_id:'A',recipient_participant_id:'B',currency:'CHF',prepared_amount_minor_units:10000};
assert.equal(evaluateExpenseMutationGuard(base.core,{operation:'expense.create',group_id:'G1',active_settlements:[scope],proposed:{pair_currency_effects:[{party_a:'A',party_b:'B',currency:'CHF',minor_units:10}]}}).blocked,true);
assert.equal(evaluateExpenseMutationGuard(base.core,{operation:'expense.edit',group_id:'G1',active_settlements:[scope],current:{expense_id:'E2',pair_currency_effects:[{party_a:'A',party_b:'C',currency:'EUR',minor_units:10}]},proposed:{expense_id:'E2',pair_currency_effects:[{party_a:'A',party_b:'B',currency:'CHF',minor_units:10}]}}).blocked,true);
assert.equal(evaluateExpenseMutationGuard(base.core,{operation:'expense.delete',group_id:'G1',active_settlements:[{...scope,unknown_effect:true,authoritative_terminal:true}],current:{expense_id:'E1'}}).blocked,true);
assert.equal(evaluateExpenseMutationGuard(base.core,{operation:'expense.create',group_id:'G1',proposed:{expense_id:'E3'}}).blocked,true);
const eq=base.frozen.accepted_integration.gate_a.inherited_integration_constraints.find(c=>c.id==='GATEA-MONEY-EQUAL-01').constraint;assert.doesNotThrow(()=>allocateEqualByConstraint(eq,1000,['A','B','C']));
console.log(JSON.stringify({semantic_mutations:results.length,detected:results.length,honest_readiness_gap_probe:'PASS',guard_policy_probes:4,results,result:'PASS'},null,2));
