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

// GUEST-01 identity, privacy and authority invariants.
eq(member.scope, 'group', 'MemberIdentity must be group-scoped');
eq(member.identity_key, 'participant_id', 'participant_id is the durable reference');
eq(member.states, ['guest','account_backed','linked','unresolved'], 'approved identity states stay bounded');
eq([...member.never_merge_on].sort(), ['display_name','email'], 'display name/email are never merge keys');
eq(member.rules.full_account_required_for_ledger_participation, false, 'guest ledger participation cannot require a full account');
eq(member.rules.upgrade_preserves_participant_id, true, 'upgrade preserves participant ID');
eq(member.rules.link_preserves_ledger_references, true, 'link preserves ledger references');
eq(member.rules.link_never_rewrites_historical_ownership, true, 'link never rewrites historical ownership');
eq(member.rules.matching_proof_alone_completes_link, false, 'matching proof alone is not terminal link success');
eq(member.rules.pending_or_unknown_link_preserves_guest_authority, true, 'guest authority survives pending/unknown link');
eq(member.rules.pending_or_unknown_link_grants_account_capabilities, false, 'pending/unknown cannot grant account authority');
eq(member.rules.unknown_link_must_reconcile_same_operation_before_retry, true, 'unknown link reconciles same operation');
eq(member.rules.serialized_capability_labels_are_non_authoritative, true, 'serialized capability labels are inert');
eq(member.rules.guest_mutation_requires_current_participant_controlled_proof, true, 'guest mutation requires current participant proof');
eq(member.rules.organizer_may_not_proxy_sign_for_guest, true, 'organizer cannot proxy-sign guest');
eq(member.rules.collision_or_mismatch_state, 'unresolved', 'mismatch/collision fails unresolved');
eq(member.rules.collision_may_silently_merge, false, 'silent merge is forbidden');

for (const capability of ['ledger_participate','expense_reference','split_reference','history_reference','export_participant','recover_participant']) {
  ok(member.base_capabilities.includes(capability), `base capability ${capability}`);
}
for (const capability of ['fund_spend','sign_spend','group_admin','membership_admin','payment_destination_control','settlement_confirmation']) {
  ok(member.account_gated_capabilities.includes(capability), `account-gated capability ${capability}`);
  ok(member.capability_model.guest.cannot.includes(capability), `guest cannot ${capability}`);
}

eq(member.guest_authority.participant_id_or_display_metadata_alone_is_authority, false, 'participant ID/metadata alone is not guest authority');
eq(member.guest_authority.organizer_membership_authority_may_impersonate_guest, false, 'organizer cannot impersonate guest');
eq(member.guest_authority.current_capability_version_required, true, 'current capability version required');
eq(member.guest_authority.current_policy_version_required, true, 'current policy version required');
eq(member.guest_authority.nonce_replay_allowed, false, 'guest mutation proof is replay-resistant');
eq(member.guest_authority.effect_time_revalidation_required, true, 'guest authority revalidates at effect time');
eq(member.guest_authority.serialization.capability_labels_are_authoritative, false, 'serialized labels are not authority');
eq(member.guest_authority.serialization.imported_or_restored_capability_labels_self_grant_authority, false, 'restore/import cannot self-grant');
eq(member.guest_authority.recovery.writes_resume_before_revalidation, false, 'recovery cannot write before revalidation');
eq(member.guest_authority.recovery.preserve_participant_id, true, 'recovery preserves participant identity');
eq(member.cross_group_privacy.policy, 'group_scoped_unlinkability', 'cross-group privacy choice is explicit');
eq(member.cross_group_privacy.group_surfaces_may_expose_stable_cross_group_account_identifier, false, 'group surfaces hide stable cross-group account ID');
eq(member.link_operation.matching_account_proof_is_terminal_success, false, 'link proof is not link completion');
eq(member.link_operation.guest_ledger_participation_remains_valid_while_pending_or_unknown, true, 'guest remains valid during uncertain link');
eq(member.link_operation.account_gated_capabilities_before_terminal_success, false, 'account capabilities wait for terminal success');
eq(member.link_operation.unknown_reuses_same_link_operation_id, true, 'unknown link recovery uses same operation');
eq(member.link_operation.unknown_may_start_fresh_link_operation, false, 'unknown link cannot fresh-dispatch');
eq(member.link_operation.failure_after_dispatch_without_authoritative_no_effect_proof_maps_to, 'unknown', 'possible-effect link failure becomes unknown');

const proofTransition = member.transitions.find(t => t.action === 'matching_account_proof_verified');
ok(proofTransition?.from === 'guest' && proofTransition?.to === 'guest', 'matching proof leaves participant guest/nonterminal');
const pendingTransition = member.transitions.find(t => t.action === 'account_activation_or_binding_pending');
ok(pendingTransition?.to === 'guest', 'activation/binding pending leaves guest identity valid');
const unknownLinkTransition = member.transitions.find(t => t.action === 'link_outcome_unknown');
ok(unknownLinkTransition?.to === 'guest' && unknownLinkTransition.preserve.includes('link_operation_id'), 'unknown link preserves guest and operation identity');
const terminalLinkTransition = member.transitions.find(t => t.action === 'verified_durable_binding_commit');
ok(terminalLinkTransition?.to === 'linked', 'only verified durable binding commits linked state');

// Deterministic guest-authority model: knowing IDs, forged serialized labels, stale versions and replay all fail closed.
const currentGuest = {
  group_id: 'grp_alps',
  participant_id: 'grp_alps:p_7f3a',
  capability_id: 'gcap_01',
  capability_version: 4,
  policy_version: 9,
  state_version: 22,
  allowed_scope_digest: 'scope:add-expense',
  revoked: false
};
const usedNonces = new Set();
const verifyGuestMutation = (proof, current, { proofValid = true, organizerOnly = false } = {}) => {
  if (!proofValid || organizerOnly || current.revoked) return false;
  if (proof.group_id !== current.group_id || proof.participant_id !== current.participant_id) return false;
  if (proof.capability_id !== current.capability_id || proof.capability_version !== current.capability_version) return false;
  if (proof.policy_version !== current.policy_version || proof.state_version !== current.state_version) return false;
  if (proof.scope_digest !== current.allowed_scope_digest || !proof.payload_digest || !proof.command_id || !proof.proof_ref) return false;
  if (!proof.nonce || usedNonces.has(proof.nonce)) return false;
  usedNonces.add(proof.nonce);
  return true;
};
const guestProof = {
  group_id:'grp_alps', participant_id:'grp_alps:p_7f3a', capability_id:'gcap_01',
  capability_version:4, policy_version:9, command_id:'cmd_01', state_version:22,
  scope_digest:'scope:add-expense', payload_digest:'payload:abc', nonce:'nonce_01', proof_ref:'opaque-proof'
};
eq(verifyGuestMutation(guestProof, currentGuest), true, 'current guest-held proof authorizes bounded mutation');
eq(verifyGuestMutation({...guestProof, nonce:'nonce_wrong_group', group_id:'grp_other'}, currentGuest), false, 'wrong group proof fails');
eq(verifyGuestMutation({...guestProof, nonce:'nonce_wrong_participant', participant_id:'grp_alps:p_other'}, currentGuest), false, 'wrong participant proof fails');
eq(verifyGuestMutation({...guestProof, nonce:'nonce_stale_version', capability_version:3}, currentGuest), false, 'stale capability version fails');
eq(verifyGuestMutation({...guestProof, nonce:'nonce_forged_labels'}, currentGuest, {proofValid:false}), false, 'serialized capability labels without proof fail');
eq(verifyGuestMutation({...guestProof, nonce:'nonce_organizer'}, currentGuest, {organizerOnly:true}), false, 'organizer authority cannot impersonate guest');
eq(verifyGuestMutation(guestProof, currentGuest), false, 'replayed guest proof nonce fails');

// Link operation temporal semantics: guest remains valid until authoritative readback; unknown cannot start a new link.
const preLink = { participant_id:'grp_alps:p_7f3a', state:'guest', guest_authority:true, account_caps:false, link_operation_id:null };
const linkStep = (snapshot, event) => {
  const before = structuredClone(snapshot);
  if (event.type === 'start') return {...before, link_operation_id:event.operation_id};
  if (event.type === 'proof_verified' || event.type === 'pending') return {...before, state:'guest', account_caps:false};
  if (event.type === 'known_pre_effect_failed') {
    assert.equal(event.no_effect_proof, true);
    return {...before, state:'guest', account_caps:false, link_operation_id:null};
  }
  if (event.type === 'unknown') return {...before, state:'guest', account_caps:false};
  if (event.type === 'retry') {
    assert.notEqual(before.link_operation_id, null);
    throw new Error('fresh retry forbidden until exact link operation reconciles');
  }
  if (event.type === 'durable_readback_success') return {...before, state:'linked', account_caps:true};
  throw new Error(`unknown link event ${event.type}`);
};
const started = linkStep(preLink, {type:'start', operation_id:'link_01'});
const proofed = linkStep(started, {type:'proof_verified'});
eq(proofed.state, 'guest', 'matching proof does not link');
eq(proofed.account_caps, false, 'matching proof grants no account capability');
const unknownLink = linkStep(proofed, {type:'unknown'});
eq(unknownLink.link_operation_id, 'link_01', 'unknown preserves exact link operation');
eq(unknownLink.guest_authority, true, 'unknown preserves guest authority');
assert.throws(() => linkStep(unknownLink, {type:'retry'}), /fresh retry forbidden/); checks += 1;
const linked = linkStep(proofed, {type:'durable_readback_success'});
eq(linked.state, 'linked', 'authoritative durable readback completes link');
eq(linked.participant_id, preLink.participant_id, 'durable link preserves participant ID');

// SPEND-01 rail-neutral, evidence and temporal failure invariants.
eq(spend.kind, 'rail-neutral-domain-model', 'SpendIntent remains rail-neutral');
eq(spend.creates_user_journey, false, 'SpendIntent is not Journey 29');
eq(spend.execution_mode_selected, false, 'no concrete execution mode selected');
eq(spend.source_mode_adapter.mode, 'unselected', 'adapter mode is unselected');
eq(spend.source_mode_adapter.adapter_id, null, 'no adapter ID is selected');
eq(spend.source_mode_adapter.callbacks_are_observations_only, true, 'callbacks are observations only');
eq(spend.source_mode_adapter.callback_success_may_mark_captured_without_proof, false, 'callback cannot capture without proof');
eq(spend.source_mode_adapter.possible_future_adapter.mode, 'polkadot_cash', 'future Polkadot seam is named without selection');
eq(spend.source_mode_adapter.possible_future_adapter.production_ready, false, 'Polkadot seam is not production-ready');
eq(spend.source_mode_adapter.possible_future_adapter.merchant_card_capability_claimed, false, 'Polkadot seam makes no merchant-card claim');
for (const state of ['draft','reviewed','authorized','pending','captured','partial','unknown','failed','reversed','cancelled']) {
  ok(spend.lifecycle_states.includes(state), `lifecycle state ${state}`);
}
eq(spend.materialization.mode, 'exactly_once', 'canonical materialization is exactly-once');
eq(spend.materialization.authorized_is_spent, false, 'authorized is not spent');
eq(spend.materialization.unknown_may_materialize_new_spend, false, 'unknown cannot materialize spend');
eq(spend.proof.required_for_financial_materialization, true, 'proof required for financial materialization');
eq(spend.proof.adapter_authoritative_verifier_required, true, 'adapter authoritative verifier is required');
eq(spend.proof.accepted_terminal_finality_must_be_declared_by_adapter, true, 'adapter declares terminal finality semantics');
eq(spend.proof.arbitrary_nonempty_readback_ref_is_sufficient, false, 'arbitrary readback refs are insufficient');
eq(spend.proof.callback_completed_is_authoritative_proof, false, 'callback Completed is observation only');
for (const state of ['pending','unknown','observed','submitted','accepted']) {
  ok(spend.proof.explicit_nonterminal_finality_classes.includes(state), `nonterminal finality ${state} fails closed`);
}
for (const field of ['spend_intent_id','operation_id','effect_id','adapter_id','rail_identity','amount','asset','target_digest','policy_snapshot_digest','approval_snapshot_digest','finality','readback_ref']) {
  ok(spend.proof.shape.includes(field), `proof field ${field}`);
  ok(spend.proof.exact_binding_required.includes(field) || ['finality','readback_ref'].includes(field), `proof binding ${field}`);
}
eq(spend.proof.proof_reuse_across_another_intent_operation_effect_or_target_allowed, false, 'proof substitution is forbidden');
eq(spend.failure_semantics.failed_requires_authoritative_no_effect_proof, true, 'failed requires no-effect proof');
eq(spend.failure_semantics.possible_effect_failure_must_be_unknown, true, 'possible-effect failure is unknown');
eq(spend.failure_semantics.transport_or_timeout_after_possible_dispatch_must_be_unknown, true, 'post-dispatch timeout is unknown');
eq(spend.failure_semantics.failed_without_no_effect_proof_is_valid, false, 'unproven failed is invalid');
eq(spend.recovery.unknown_requires_reconciliation_before_retry, true, 'unknown reconciles before retry');
eq(spend.recovery.reconciliation_reuses_exact_operation_id, true, 'recovery keeps exact operation ID');
eq(spend.recovery.terminal_failure_without_no_effect_proof_may_retry, false, 'unproven failure cannot retry');
eq(spend.payment_intent_boundary.separate_economic_domain, true, 'SpendIntent and PaymentIntent are separate');
eq(spend.payment_intent_boundary.payment_intent_may_create_or_recreate_merchant_spend, false, 'PaymentIntent cannot create merchant spend');
eq(spend.research_boundary.selected_modes.length, 0, 'selected execution modes stay empty');

const expectedSpend = {
  spend_intent_id:'sp_1', operation_id:'op_1', effect_id:'cap_1', adapter_id:'adapter_fixture',
  rail_identity:'fixture_rail', amount:'42.50', asset:'USD', target_digest:'target:merchant-7',
  policy_snapshot_digest:'policy:p9', approval_snapshot_digest:'approval:a3'
};
const verifiedReadbackRef = 'verified:adapter_fixture:op_1:cap_1';
const validProof = {...expectedSpend, source:'authoritative_readback', proof_id:'proof_1', observed_at:'2026-09-15T12:00:00Z', finality:'final', readback_ref:verifiedReadbackRef};
const adapterProofPolicies = {
  adapter_fixture: {
    authoritative_sources: new Set(['authoritative_readback']),
    terminal_finality: new Set(['final']),
    verify_readback: (proof, expected) => proof.readback_ref === `verified:${expected.adapter_id}:${expected.operation_id}:${expected.effect_id}`
  }
};
const proofMatches = (proof, expected) => {
  if (!spend.proof.exact_binding_required.every(field => proof[field] === expected[field])) return false;
  const verifier = adapterProofPolicies[proof.adapter_id];
  if (!verifier) return false;
  if (!verifier.authoritative_sources.has(proof.source)) return false;
  if (!verifier.terminal_finality.has(proof.finality)) return false;
  if (spend.proof.explicit_nonterminal_finality_classes.includes(proof.finality)) return false;
  if (!proof.readback_ref || !verifier.verify_readback(proof, expected)) return false;
  return true;
};
eq(proofMatches(validProof, expectedSpend), true, 'verifier-confirmed terminal proof matches exact SpendIntent effect');
eq(proofMatches({...validProof, finality:'pending'}, expectedSpend), false, 'pending finality fails even with verified readback ref');
eq(proofMatches({...validProof, finality:'unknown'}, expectedSpend), false, 'unknown finality fails even with verified readback ref');
eq(proofMatches({...validProof, readback_ref:'arbitrary-nonempty-ref'}, expectedSpend), false, 'arbitrary readback ref fails');
eq(proofMatches({...validProof, readback_ref:'verified:adapter_fixture:op_stale:cap_1'}, expectedSpend), false, 'stale/substituted readback ref fails');
eq(proofMatches({...validProof, source:'host_callback', proof_id:'callback-completed'}, expectedSpend), false, 'callback Completed observation cannot materialize');
eq(proofMatches({...validProof, adapter_id:'unknown_adapter'}, {...expectedSpend, adapter_id:'unknown_adapter'}), false, 'unregistered adapter verifier fails closed');
for (const [field, value] of [
  ['spend_intent_id','sp_2'],['operation_id','op_2'],['effect_id','cap_2'],['adapter_id','other_adapter'],
  ['rail_identity','other_rail'],['target_digest','target:other'],['policy_snapshot_digest','policy:p10'],
  ['approval_snapshot_digest','approval:a4'],['amount','42.51'],['asset','EUR']
]) {
  eq(proofMatches({...validProof, [field]:value}, expectedSpend), false, `proof substitution fails on ${field}`);
}

const classifyFailure = ({ dispatch_possible, authoritative_no_effect_proof }) => {
  if (dispatch_possible) return 'unknown';
  if (authoritative_no_effect_proof) return 'failed';
  return 'unknown';
};
eq(classifyFailure({dispatch_possible:false, authoritative_no_effect_proof:true}), 'failed', 'proven pre-effect no-effect failure may be failed');
eq(classifyFailure({dispatch_possible:false, authoritative_no_effect_proof:false}), 'unknown', 'unproven failure is unknown');
eq(classifyFailure({dispatch_possible:true, authoritative_no_effect_proof:false}), 'unknown', 'possible-effect failure is unknown');
const mayStartFreshOperation = ({state, authoritative_no_effect_proof}) => state === 'failed' && authoritative_no_effect_proof === true;
eq(mayStartFreshOperation({state:'failed', authoritative_no_effect_proof:true}), true, 'fresh op allowed only after verified no-effect failed state');
eq(mayStartFreshOperation({state:'failed', authoritative_no_effect_proof:false}), false, 'failed label alone cannot permit fresh op');
eq(mayStartFreshOperation({state:'unknown', authoritative_no_effect_proof:false}), false, 'unknown cannot permit fresh op');

const derived = new Set();
const deriveEffect = ({ state, proof, expected }) => {
  if (!['captured','partial'].includes(state) || !proofMatches(proof, expected)) return false;
  const key = `${expected.spend_intent_id}:${expected.effect_id}`;
  if (derived.has(key)) return false;
  derived.add(key);
  return true;
};
eq(deriveEffect({state:'captured', proof:validProof, expected:expectedSpend}), true, 'first exact proven capture derives canonical state');
eq(deriveEffect({state:'captured', proof:validProof, expected:expectedSpend}), false, 'duplicate proof cannot derive twice');
eq(deriveEffect({state:'captured', proof:{...validProof, operation_id:'op_2'}, expected:expectedSpend}), false, 'substituted proof cannot materialize');
eq(deriveEffect({state:'captured', proof:{...validProof, finality:'pending'}, expected:expectedSpend}), false, 'pending proof cannot materialize');
eq(deriveEffect({state:'captured', proof:{...validProof, readback_ref:'arbitrary-nonempty-ref'}, expected:expectedSpend}), false, 'unverified readback cannot materialize');
eq(deriveEffect({state:'captured', proof:{...validProof, source:'host_callback'}, expected:expectedSpend}), false, 'callback-only completion cannot materialize');
eq(deriveEffect({state:'unknown', proof:validProof, expected:expectedSpend}), false, 'unknown derives nothing');

console.log(JSON.stringify({ suite: 'phase-c1-contract-invariants', checks, result: 'pass' }));
