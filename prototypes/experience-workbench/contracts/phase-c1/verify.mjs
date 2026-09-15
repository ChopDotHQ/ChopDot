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
eq(member.rules.link_never_rewrites_historical_ownership, true, 'link never rewrites historical ownership');
eq(member.rules.link_is_staged_and_atomic, true, 'link is staged and atomic');
eq(member.rules.link_commit_requires_account_activation_and_binding_proof, true, 'activation/proof precede binding commit');
eq(member.rules.failed_or_cancelled_link_preserves_prelink_graph, true, 'failed/cancelled link preserves pre-link graph');
eq(member.rules.guest_authority_requires_explicit_group_scoped_capability, true, 'guest authority is explicit and group scoped');
eq(member.rules.guest_may_not_bypass_existing_authority_checks, true, 'guest support cannot bypass authority checks');
eq(member.rules.organizer_may_not_proxy_sign_for_guest, true, 'organizer cannot proxy-sign for guest');
eq(member.rules.collision_or_mismatch_state, 'unresolved', 'mismatch/collision fails unresolved');
eq(member.rules.collision_may_silently_merge, false, 'silent merge forbidden');
for (const capability of ['ledger_participate','expense_reference','split_reference','history_reference','export_participant','recover_participant']) ok(member.base_capabilities.includes(capability), `base capability ${capability}`);
for (const capability of ['fund_spend','sign_spend','group_admin','membership_admin','payment_destination_control','settlement_confirmation']) ok(member.account_gated_capabilities.includes(capability), `account-gated capability ${capability}`);
eq(member.capability_model.guest.approve, [], 'guest has no account-authority approval capability');
for (const capability of ['fund_spend','sign_spend','group_admin','membership_admin','payment_destination_control','settlement_confirmation']) ok(member.capability_model.guest.cannot.includes(capability), `guest cannot ${capability}`);
eq(member.capability_model.guest_holds_credential, true, 'guest holds its own scoped capability');
eq(member.capability_model.organizer_proxy_signature_for_guest, false, 'organizer proxy signature forbidden');
eq(member.capability_model.remove_account_key_checks_to_enable_guest, false, 'guest support is not implemented by deleting account checks');
eq(member.cross_group_privacy.policy, 'group_scoped_unlinkability', 'cross-group privacy choice is explicit');
eq(member.cross_group_privacy.group_visible_participant_ids_unlinkable_across_groups, true, 'group participant IDs are unlinkable across groups');
eq(member.cross_group_privacy.group_surfaces_may_expose_stable_cross_group_account_identifier, false, 'group surfaces cannot expose stable cross-group account ID');
eq(member.cross_group_privacy.polkadot_per_application_alias_alone_satisfies_group_unlinkability, false, 'per-app alias alone does not satisfy per-group unlinkability');
const guestLink = member.transitions.find(t => t.from === 'guest' && t.action === 'link_matching_account_proof');
ok(guestLink && guestLink.to === 'linked', 'guest can explicitly link with matching proof');
ok(guestLink.preserve.includes('participant_id') && guestLink.preserve.includes('history_refs') && guestLink.preserve.includes('historical_ownership'), 'link preserves identity/history/ownership');
const mismatch = member.transitions.find(t => t.action === 'link_mismatch_or_collision');
ok(mismatch && mismatch.to === 'unresolved' && mismatch.preserve.includes('participant_id'), 'mismatch keeps participant durable');
const failed = member.transitions.find(t => t.action === 'link_activation_failed');
const cancelled = member.transitions.find(t => t.action === 'link_cancelled');
ok(failed?.preserve.includes('exact_pre_link_participant_graph'), 'activation failure preserves exact pre-link graph');
ok(cancelled?.preserve.includes('exact_pre_link_participant_graph'), 'cancel preserves exact pre-link graph');

// Deterministic atomic-link example: nothing mutates until verified binding commit.
const preLinkGraph = {
  participant_id: 'grp_alps:p_7f3a',
  state: 'guest',
  expense_refs: ['exp_1'],
  split_refs: ['split_1'],
  history_refs: ['hist_1'],
  linked_account_id: null,
  capabilities: ['ledger_participate','expense_reference','split_reference','history_reference']
};
const linkAttempt = (snapshot, outcome) => {
  const before = structuredClone(snapshot);
  if (outcome === 'activation_failed' || outcome === 'cancelled') return before;
  if (outcome === 'mismatch') return { ...before, state: 'unresolved' };
  if (outcome === 'verified') return { ...before, state: 'linked', linked_account_id: 'acct_verified_1' };
  throw new Error(`unknown link outcome ${outcome}`);
};
eq(linkAttempt(preLinkGraph, 'activation_failed'), preLinkGraph, 'activation failure is exact rollback/no-op');
eq(linkAttempt(preLinkGraph, 'cancelled'), preLinkGraph, 'cancelled link is exact rollback/no-op');
eq(linkAttempt(preLinkGraph, 'verified').participant_id, preLinkGraph.participant_id, 'verified link preserves participant ID');
eq(linkAttempt(preLinkGraph, 'verified').expense_refs, preLinkGraph.expense_refs, 'verified link preserves expense ownership refs');

// SPEND-01 rail-neutral truth invariants.
eq(spend.kind, 'rail-neutral-domain-model', 'SpendIntent remains rail-neutral');
eq(spend.economic_domain, 'merchant_spend_before_or_during_purchase', 'SpendIntent economic domain is explicit');
eq(spend.creates_user_journey, false, 'SpendIntent is not Journey 29');
eq(spend.execution_mode_selected, false, 'no concrete mode selected');
eq(spend.source_mode_adapter.mode, 'unselected', 'adapter mode is explicitly unselected');
eq(spend.source_mode_adapter.adapter_id, null, 'no adapter ID selected');
eq(spend.source_mode_adapter.callbacks_are_observations_only, true, 'adapter callbacks are observations only');
eq(spend.source_mode_adapter.callback_success_may_mark_captured_without_proof, false, 'callback success alone cannot capture');
eq(spend.source_mode_adapter.possible_future_adapter.mode, 'polkadot_cash', 'future Polkadot seam is named without selection');
eq(spend.source_mode_adapter.possible_future_adapter.production_ready, false, 'future Polkadot adapter is not production-ready');
eq(spend.source_mode_adapter.possible_future_adapter.merchant_card_capability_claimed, false, 'Polkadot adapter seam makes no merchant-card claim');
for (const state of ['draft','reviewed','authorized','pending','captured','partial','unknown','failed','reversed','cancelled']) ok(spend.lifecycle_states.includes(state), `lifecycle state ${state}`);
eq(spend.materialization.mode, 'exactly_once', 'canonical materialization is exactly-once');
eq(spend.materialization.one_captured_spend_intent_derives_financial_state_once, true, 'one captured SpendIntent derives canonical state once');
eq(spend.materialization.authorized_is_spent, false, 'authorized is not spent');
eq(spend.materialization.unknown_may_materialize_new_spend, false, 'unknown cannot materialize spend');
eq(spend.recovery.pending_requires_reconciliation_before_retry, true, 'pending requires recovery before retry');
eq(spend.recovery.unknown_requires_reconciliation_before_retry, true, 'unknown requires recovery before retry');
eq(spend.recovery.unknown_may_create_new_authority, false, 'unknown cannot create authority');
eq(spend.recovery.unknown_may_dispatch_fresh_value, false, 'unknown cannot dispatch fresh value');
eq(spend.identity.reconciliation_reuses_operation_id, true, 'reconciliation stays on exact operation identity');
eq(spend.identity.unknown_allows_fresh_dispatch, false, 'unknown operation cannot fresh-dispatch');
eq(spend.proof.required_for_financial_materialization, true, 'proof is required for canonical financial state');
eq(spend.proof.exact_operation_amount_asset_destination_match_required, true, 'proof binds operation/amount/asset/destination');
eq(spend.proof.required_finality_or_authoritative_readback, true, 'proof requires finality/readback');
eq(spend.proof.host_callback_alone_is_canonical_spend_proof, false, 'host callback alone is not spend proof');
for (const field of ['operation_id','amount','asset','destination','finality','readback_ref']) ok(spend.proof.shape.includes(field), `proof field ${field}`);
eq(spend.payment_intent_boundary.separate_economic_domain, true, 'SpendIntent and PaymentIntent domains are separate');
eq(spend.payment_intent_boundary.payment_intent_purpose, 'settle_already_existing_obligations', 'PaymentIntent is settlement-after-debt');
eq(spend.payment_intent_boundary.payment_intent_may_create_or_recreate_merchant_spend, false, 'PaymentIntent cannot create merchant spend');
eq(spend.payment_intent_boundary.payment_intent_may_duplicate_spend_materialization, false, 'PaymentIntent cannot duplicate merchant spend materialization');
eq(spend.lineage.partial_capture_requires_parent, true, 'partial capture lineage required');
eq(spend.lineage.refund_requires_parent_capture, true, 'refund lineage required');
eq(spend.lineage.reversal_requires_parent_capture, true, 'reversal lineage required');
eq(spend.lineage.all_adjustments_remain_on_original_operation_lineage, true, 'partial/refund/reversal remain one lineage');
eq(spend.research_boundary.selected_modes.length, 0, 'selected execution modes must stay empty');
for (const mode of ['multi_source_merchant_card','joint_bank_account_or_pot','issuer_or_baas','generic_merchant_card_issuance','apple_pay_or_google_pay_provisioning']) ok(spend.research_boundary.not_approved.includes(mode), `research boundary ${mode}`);
eq(spend.research_boundary.future_mode_must_implement_adapter_boundary, true, 'future modes must plug into SpendIntent');

// Deterministic economic-domain example: capture derives once; PaymentIntent only settles the derived obligation.
const derived = new Set();
const deriveCapturedSpend = ({ spend_intent_id, lineage_id, state }) => {
  if (state !== 'captured') return false;
  const key = `${spend_intent_id}:${lineage_id}`;
  if (derived.has(key)) return false;
  derived.add(key);
  return true;
};
eq(deriveCapturedSpend({spend_intent_id:'sp_1',lineage_id:'cap_1',state:'captured'}), true, 'first proven capture derives canonical financial state');
eq(deriveCapturedSpend({spend_intent_id:'sp_1',lineage_id:'cap_1',state:'captured'}), false, 'duplicate capture cannot derive twice');
eq(deriveCapturedSpend({spend_intent_id:'sp_2',lineage_id:'unknown_1',state:'unknown'}), false, 'unknown state derives nothing');
const paymentIntent = { purpose: 'settle_existing_obligation', may_create_merchant_spend: false };
eq(paymentIntent.may_create_merchant_spend, false, 'PaymentIntent cannot recreate merchant spend');

console.log(JSON.stringify({ suite: 'phase-c1-contract-invariants', checks, result: 'pass' }));
