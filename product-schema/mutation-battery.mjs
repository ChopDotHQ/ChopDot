import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateHardening } from './hardening-lib.mjs';
import { deriveStage4 } from './stage-4-lib.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..'),read=n=>JSON.parse(readFileSync(join(root,'product-schema',n),'utf8')),base={core:read('semantic-core.json'),graph:read('composition-graph.json'),frozen:read('frozen-baseline.json'),oracle:read('gate-b-authority-oracle.json')},clone=x=>structuredClone(x);
const mutations=[
 ['drop-approved-lock-decisions',x=>x.core.approved_product_decisions=[]],
 ['guard-kind-read-model',x=>x.core.objects.find(o=>o.id==='expense.mutation_guard').kind='read_model'],
 ['guard-operations-lose-delete',x=>x.core.laws.find(l=>l.id==='LAW-EXP-GUARD-01').constraint.operations=['expense.create','expense.edit']],
 ['guard-required-inputs-drop-proposed',x=>x.core.laws.find(l=>l.id==='LAW-EXP-GUARD-01').constraint.active_scope.required_guard_inputs=x.core.laws.find(l=>l.id==='LAW-EXP-GUARD-01').constraint.active_scope.required_guard_inputs.filter(v=>v!=='current_or_proposed_state_per_operation')],
 ['guard-required-settlement-fields-drop-currency',x=>x.core.laws.find(l=>l.id==='LAW-EXP-GUARD-01').constraint.active_scope.required_settlement_fields=x.core.laws.find(l=>l.id==='LAW-EXP-GUARD-01').constraint.active_scope.required_settlement_fields.filter(v=>v!=='currency')],
 ['guard-terminal-enum-opens',x=>x.core.laws.find(l=>l.id==='LAW-EXP-GUARD-01').constraint.active_scope.terminality.closed_enumeration=false],
 ['guard-reconciliation-authority-removed',x=>x.core.laws.find(l=>l.id==='LAW-EXP-GUARD-01').constraint.active_scope.reconciliation_evidence.authority_required=false],
 ['guard-loses-issue-input',x=>x.core.objects.find(o=>o.id==='expense.mutation_guard').derived_from=x.core.objects.find(o=>o.id==='expense.mutation_guard').derived_from.filter(v=>v!=='expense.issue')],
 ['guard-loses-position-input',x=>x.core.objects.find(o=>o.id==='expense.mutation_guard').derived_from=x.core.objects.find(o=>o.id==='expense.mutation_guard').derived_from.filter(v=>v!=='position.position')],
 ['ctx-guard-render-time',x=>x.graph.contexts.find(c=>c.id==='ctx.expense_guard').availability='resolve_at_render_time'],
 ['ctx-guard-loses-scope',x=>x.graph.contexts.find(c=>c.id==='ctx.expense_guard').objects=x.graph.contexts.find(c=>c.id==='ctx.expense_guard').objects.filter(v=>v!=='payment.settlement_scope')],
 ['ctx-guard-loses-pay04',x=>x.graph.contexts.find(c=>c.id==='ctx.expense_guard').laws=x.graph.contexts.find(c=>c.id==='ctx.expense_guard').laws.filter(v=>v!=='LAW-PAY-04')],
 ['req-j05-locked-state-retired',x=>x.graph.construction_requirements.find(r=>r.id==='REQ-J05-LOCK').value.locked_state='not_required'],
 ['req-j05-drops-preserve',x=>x.graph.construction_requirements.find(r=>r.id==='REQ-J05-LOCK').value.entered_details_preserved_if_blocked=false],
 ['req-j06-always-allows-unrelated',x=>x.graph.construction_requirements.find(r=>r.id==='REQ-J06-LOCK').value.unrelated_expense_edit_delete='always_allow'],
 ['req-j06-releases-partial',x=>x.graph.construction_requirements.find(r=>r.id==='REQ-J06-LOCK').value.open_partial_remainder='release_dependency'],
 ['req-j08-state-removed',x=>x.graph.construction_requirements.find(r=>r.id==='REQ-J08-STATES').value=x.graph.construction_requirements.find(r=>r.id==='REQ-J08-STATES').value.slice(1)],
 ['req-j08-impact-disables-add',x=>x.graph.construction_requirements.find(r=>r.id==='REQ-J08-SETTLEMENT-GOLDEN-IMPACT').value.ordinary_settlement_add_action='disabled_while_settlement_in_progress'],
 ['pay04-dependency-dimension-dropped',x=>x.core.laws.find(l=>l.id==='LAW-PAY-04').constraint.dependency_dimensions=x.core.laws.find(l=>l.id==='LAW-PAY-04').constraint.dependency_dimensions.filter(v=>v!=='dispute_eligibility')],
 ['raise-issue-invalidates-widened',x=>x.core.operations.find(o=>o.id==='expense.raise_issue').invalidates_prepared=['payment.intent','payment.record']],
 ['withdraw-issue-invalidates-removed',x=>x.core.operations.find(o=>o.id==='expense.withdraw_issue').invalidates_prepared=[]],
 ['j05-impact-disposition-retired',x=>x.core.golden_impacts.find(g=>g.id==='GOLDEN-IMPACT-J05-LOCK-02').disposition='retired'],
 ['j05-impact-rule-inverted',x=>x.core.golden_impacts.find(g=>g.id==='GOLDEN-IMPACT-J05-LOCK-02').rule='J05 locked is no longer required.'],
 ['j08-impact-required',x=>x.core.golden_impacts.find(g=>g.id==='GOLDEN-IMPACT-J08-SETTLEMENT-02').disposition='required_in_gate_b'],
 ['decision-clarification-link-removed',x=>delete x.core.approved_product_decisions.find(d=>d.id==='DEC-EXPENSE-SETTLEMENT-LOCK-01').clarified_by],
 ['partial-law-releases',x=>x.core.laws.find(l=>l.id==='LAW-PAY-03').constraint.release_lock_only_when_no_open_remainder=false],
 ['issue-dependency-widens',x=>x.core.laws.find(l=>l.id==='LAW-ISSUE-01').constraint.dependency_key='any_open_issue_in_group'],
 ['stale-recent-after-delete',x=>x.core.operations.find(o=>o.id==='expense.delete').invalidates=x.core.operations.find(o=>o.id==='expense.delete').invalidates.filter(id=>id!=='group.recent_item')],
 ['edit-loses-effect-guard',x=>x.core.operations.find(o=>o.id==='expense.edit').guards=[]],
 ['settlement-close-writes-position',x=>x.core.operations.find(o=>o.id==='settlement.close').changes.push('position.position')],
 ['history-loses-prior-revision',x=>x.core.laws.find(l=>l.id==='LAW-EXP-HISTORY-01').constraint.requires_prior_revision=false],
 ['gateb-seed-second-store',x=>x.graph.construction_requirements.find(r=>r.id==='REQ-GATEB-SETTLEMENT-SEED').value.canonical_shared_state=false]
];
const results=[];for(const [name,mutate] of mutations){const x=clone(base);mutate(x);const errors=validateHardening(x.core,x.graph,x.frozen,x.oracle);assert.ok(errors.length>0,'mutation escaped: '+name);results.push({name,detected_by:[...new Set(errors.map(e=>e.id))]});}
const gap=clone(base);gap.core.known_gaps.push({id:'TEST-HONEST-GAP',classification:'requires_product_decision',journeys:['05'],statement:'test',handling:'test'});assert.deepEqual(validateHardening(gap.core,gap.graph,gap.frozen,gap.oracle),[]);assert.equal(deriveStage4(gap.core,gap.graph,gap.frozen).packet.gate.pre_gate_b_readiness,'BLOCKED');
console.log(JSON.stringify({semantic_mutations:results.length,detected:results.length,honest_readiness_gap_probe:'PASS',results,result:'PASS'},null,2));
