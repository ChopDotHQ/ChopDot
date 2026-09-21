import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateHardening } from './hardening-lib.mjs';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = n => JSON.parse(readFileSync(join(root, 'product-schema', n), 'utf8'));
const base = { core:read('semantic-core.json'), graph:read('composition-graph.json'), frozen:read('frozen-baseline.json'), oracle:read('gate-b-authority-oracle.json') };
const clone = x => structuredClone(x);
const mutations = [
  ['drop-j05-recovery', x => { x.frozen.authority_recoveries = []; }],
  ['reopen-j05-blocker', x => { x.frozen.authority_blockers = [{id:'AUTH-J05-GOLDEN-INCOMPLETE',journey:'05'}]; }],
  ['item-scope-lock', x => { x.core.laws.find(l => l.id === 'LAW-EXP-GUARD-01').constraint.scope = 'item'; }],
  ['drop-lock-resolution', x => { x.core.resolved_authority_interpretations = x.core.resolved_authority_interpretations.filter(r => r.id !== 'RESOLVED-EXPENSE-LOCK-01'); }],
  ['no-review-reset', x => { x.core.laws.find(l => l.id === 'LAW-EXP-REVIEW-01').constraint.kind = 'reviews_remain_current'; }],
  ['drop-review-resolution', x => { x.core.resolved_authority_interpretations = x.core.resolved_authority_interpretations.filter(r => r.id !== 'RESOLVED-EXPENSE-REVIEW-01'); }],
  ['resolution-owner', x => { x.graph.journey_projections.find(j => j.id === '07').owns_operations = x.graph.journey_projections.find(j => j.id === '07').owns_operations.filter(id => id !== 'expense.resolve_issue'); }],
  ['invert-attribution-law', x => { x.core.laws.find(l => l.id === 'LAW-EXP-03').constraint.kind = 'sum_only_no_attribution'; }],
  ['invert-issue-scope', x => { x.core.laws.find(l => l.id === 'LAW-ISSUE-01').constraint.kind = 'block_all_payment_items'; }],
  ['group-home-global-activity-coupling', x => { const v=x.core.derived_models.find(v => v.id === 'view.group_home'); v.derived_from=v.derived_from.filter(id => id !== 'group.recent_item'); v.derived_from.push('activity.item'); }],
  ['write-position-directly', x => { x.core.operations.find(o => o.id === 'expense.delete').changes.push('position.position'); }],
  ['wrong-equal-remainder', x => { x.frozen.accepted_integration.gate_a.inherited_integration_constraints.find(c => c.id === 'GATEA-MONEY-EQUAL-01').constraint.kind='deterministic_equal_allocation_last_id'; }],
  ['drop-defaults', x => { x.graph.construction_requirements = x.graph.construction_requirements.filter(r => r.id !== 'REQ-J05-DEFAULTS'); }],
  ['duplicate-gate-scope', x => { x.graph.gates.find(g => g.id === 'B').journeys=['08','05','06','07']; }]
];
const results=[];
for (const [name, mutate] of mutations) {
  const x=clone(base); mutate(x);
  const errors=validateHardening(x.core,x.graph,x.frozen,x.oracle);
  assert.ok(errors.length>0, 'mutation escaped: ' + name);
  results.push({name, detected_by:errors.map(e => e.id)});
}
console.log(JSON.stringify({mutations:results.length,detected:results.length,results,result:'PASS'},null,2));
