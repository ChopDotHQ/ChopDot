import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const member = JSON.parse(fs.readFileSync(path.join(here, 'member-identity.contract.json'), 'utf8'));
const spend = JSON.parse(fs.readFileSync(path.join(here, 'spend-intent.contract.json'), 'utf8'));

let checks = 0;
const ok = (value, message) => { checks += 1; assert.ok(value, message); };
const eq = (actual, expected, message) => { checks += 1; assert.deepEqual(actual, expected, message); };

// GUEST-01 identity invariants.
eq(member.scope, 'group', 'MemberIdentity must be group-scoped');
eq(member.identity_key, 'participant_id', 'participant_id is the durable reference');
ok(member.states.includes('guest') && member.states.includes('account_backed') && member.states.includes('linked') && member.states.includes('unresolved'), 'all approved identity states exist');
eq(member.never_merge_on.sort(), ['display_name', 'email'], 'display name/email are never merge keys');
eq(member.rules.full_account_required_for_ledger_participation, false, 'guest ledger participation cannot require a full account');
eq(member.rules.upgrade_preserves_participant_id, true, 'upgrade must preserve participant ID');
eq(member.rules.link_preserves_ledger_references, true, 'link must preserve ledger references');
eq(member.rules.collision_or_mismatch_state, 'unresolved', 'mismatch/collision fails unresolved');
eq(member.rules.collision_may_silently_merge, false, 'silent merge forbidden');
for (const capability of ['ledger_participate','expense_reference','split_reference','history_reference','export_participant','recover_participant']) ok(member.base_capabilities.includes(capability), `base capability ${capability}`);
for (const capability of ['fund_spend','sign_spend','group_admin']) ok(member.account_gated_capabilities.includes(capability), `account-gated capability ${capability}`);
const guestLink = member.transitions.find(t => t.from === 'guest' && t.action === 'link_matching_account_proof');
ok(guestLink && guestLink.to === 'linked', 'guest can explicitly link with matching proof');
ok(guestLink.preserve.includes('participant_id') && guestLink.preserve.includes('history_refs'), 'link preserves identity/history');
const mismatch = member.transitions.find(t => t.action === 'link_mismatch_or_collision');
ok(mismatch && mismatch.to === 'unresolved' && mismatch.preserve.includes('participant_id'), 'mismatch keeps participant durable');

// SPEND-01 rail-neutral truth invariants.
eq(spend.kind, 'rail-neutral-domain-model', 'SpendIntent remains rail-neutral');
eq(spend.creates_user_journey, false, 'SpendIntent is not Journey 29');
eq(spend.execution_mode_selected, false, 'no concrete mode selected');
eq(spend.source_mode_adapter.mode, 'unselected', 'adapter mode is explicitly unselected');
eq(spend.source_mode_adapter.adapter_id, null, 'no adapter ID selected');
for (const state of ['draft','reviewed','authorized','pending','captured','partial','unknown','failed','reversed','cancelled']) ok(spend.lifecycle_states.includes(state), `lifecycle state ${state}`);
eq(spend.materialization.mode, 'exactly_once', 'canonical materialization is exactly-once');
eq(spend.materialization.authorized_is_spent, false, 'authorized is not spent');
eq(spend.materialization.unknown_may_materialize_new_spend, false, 'unknown cannot materialize spend');
eq(spend.recovery.pending_requires_reconciliation_before_retry, true, 'pending requires recovery before retry');
eq(spend.recovery.unknown_requires_reconciliation_before_retry, true, 'unknown requires recovery before retry');
eq(spend.recovery.unknown_may_create_new_authority, false, 'unknown cannot create authority');
eq(spend.proof.required_for_financial_materialization, true, 'proof is required for canonical financial state');
eq(spend.lineage.partial_capture_requires_parent, true, 'partial capture lineage required');
eq(spend.lineage.refund_requires_parent_capture, true, 'refund lineage required');
eq(spend.lineage.reversal_requires_parent_capture, true, 'reversal lineage required');
eq(spend.research_boundary.selected_modes.length, 0, 'selected execution modes must stay empty');
for (const mode of ['multi_source_merchant_card','joint_bank_account_or_pot','issuer_or_baas','generic_merchant_card_issuance']) ok(spend.research_boundary.not_approved.includes(mode), `research boundary ${mode}`);
eq(spend.research_boundary.future_mode_must_implement_adapter_boundary, true, 'future modes must plug into SpendIntent');

console.log(JSON.stringify({ suite: 'phase-c1-contract-invariants', checks, result: 'pass' }));
