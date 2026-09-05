# ChopDot Public Beta Product Cards

**Kind:** decision
**Status:** active
**Owner:** product
**Last reviewed:** 2026-08-27
**Applies to:** `chopdot-v1-launch`
**Authority:** current product jobs, priorities, scope, blockers, and acceptance state

These cards govern implementation in the `chopdot-v1-launch` worktree. The
user-approved 2026-08-23 release plan is the approval record. A user-facing
card may be implemented only with a product score of at least 8/10 and must
have production-entrypoint screenshot evidence before `done`.

## P-034 - One Chop Core exact money and events

```yaml
id: P-034
status: building
priority: 70
blocker: none
blocked_by: none
reviewed: 2026-08-27
applies_to: chopdot-v1-launch
evidence_type: measurement
evidence: docs/release/2026-08-27-p034-legacy-assessment-quarantine.md
evidence_sha256: 1f9b2d6359476bcbbf29e7a4b91c9966e27ba618d1cf35c2495c2f3dbd60f7c7
pillar: Management
journey: A participant reviews one exact group-money action and every authorized participant derives the same state.
next_action: Review this draft
operator_next_action: Integrate and reprove one signed exact core through src/main.tsx
audience: participant
action_scope: Existing-group review of one proposed money-state change
action_scope_universal: false
delivery_phase: phase-0-grounding
benchmark_requirements: BASE-EXPENSE-01,BASE-SPLIT-01,BASE-STATUS-01,BASE-HISTORY-01
differentiated_outcome: One participant-held signed event set replays to one exact state without a server, host, or chain becoming authority
benchmark_evidence_state: e1-stale-refresh-required-e2-open
benchmark_scope: applies
score: 10/10
expected_outcome: Every participant derives the same exact state from the same accepted event set
success_evidence: Exact-money model tests and production-entrypoint replay produce the same state hash
failure_outcome: Any float authority, invalid mutation, or divergent state hash blocks integration
accountable_owner: core-authority
exit_condition: Deterministic replay, migration, correction, and production-entrypoint parity all pass
priority_basis: Foundational authority work remains active after the live first-use and Home repair gates
alternatives_not_now: P-032 recovery and P-005 Spend Card remain later because they cannot close until the first-use, Home, and shared-core gates are coherent
authority: Participant-signed ChopEventV1 log
scope: MoneyV1, ChopEventV1, ModePolicyV1, deterministic replay, exact production adjustments, migration
out: UI redesign, custody, provider-shaped truth
```

## P-032 - Recovery and convergence

```yaml
id: P-032
status: building
priority: 60
blocker: none
blocked_by: none
reviewed: 2026-08-24
applies_to: chopdot-v1-launch
evidence_type: measurement
evidence: docs/release/2026-08-24-recovery-head-index-live-proof.md
evidence_sha256: 01a09b23d07a857d3b26ba0f62fdb3403e533b5bfa084277e45f0e7553a646f0
pillar: History
journey: An authorized participant returns on another device and safely recovers the same group record.
next_action: Restore my groups
operator_next_action: Prove fresh-device recovery, revocation, and convergence through the production entrypoint
audience: participant
action_scope: Returning participant on a cleared browser or different device
action_scope_universal: false
delivery_phase: phase-2-differentiation
benchmark_requirements: BASE-OFFLINE-01,BASE-HISTORY-01
differentiated_outcome: Authorized participants restore the same signed group record without introducing a second recovery authority
benchmark_evidence_state: e1-stale-refresh-required-e2-open
benchmark_scope: applies
score: 10/10
expected_outcome: The same authorized participant recovers the same group record without a second authority
success_evidence: Fresh-device, wrong-key, revocation, rollback, and social re-grant production tests pass
failure_outcome: Missing, stale, wrong-account, or divergent recovery data fails closed and blocks release
accountable_owner: identity-recovery
exit_condition: Fresh-device recovery and lost-account social re-grant pass with honest user-visible limitations
priority_basis: Recovery is release-critical but follows the current P0 first-use and P1 Home hierarchy repair
alternatives_not_now: P-005 Spend Card and P-006 savings circle remain blocked because recovery must be proven once for the shared authority core
authority: Signed events plus account-authorized encrypted checkpoints
scope: encrypted delivery, recovery, revocation, social re-grant, optional recovery kit, RecoveryHeadIndex
out: mandatory recovery kit, plaintext carrier, mutable snapshot authority
```

## P-035 - Account, contact and membership lifecycle

```yaml
id: P-035
status: building
priority: 100
blocker: P0-live-first-use
blocked_by: none
reviewed: 2026-08-24
applies_to: chopdot-v1-launch
evidence_type: test
evidence: docs/release/2026-08-24-p035-p022-local-acceptance.md
evidence_sha256: 1661dd02fb212419e2c866bcfadf95c70cb968aa581cae2b2559e162623889c8
pillar: Management
journey: A first participant creates and shares one group without understanding account infrastructure, then an invited recipient joins intentionally.
next_action: Create my group
operator_next_action: Repair and reprove first shared-group creation and intentional invite acceptance
audience: participant
action_scope: Local or guest participant creating a first shared group and inviting one intended recipient
action_scope_universal: false
delivery_phase: phase-1-baseline
benchmark_requirements: BASE-ENTRY-01,BASE-GROUP-01,BASE-ACCESS-01
differentiated_outcome: Contact, account, wallet, personhood, membership, and organizer authority remain intentional and separate
benchmark_evidence_state: e1-stale-refresh-required-e2-open
benchmark_scope: applies
score: 10/10
expected_outcome: A first-time participant creates one shared group and admits another person intentionally without infrastructure coaching
success_evidence: Production-entrypoint and live multi-account first-use journeys succeed after rejection, retry, and reload
failure_outcome: Any enabled action that reaches a hidden account boundary remains a P0 release blocker
accountable_owner: identity-membership
exit_condition: Real first-use group creation and invite acceptance succeed without Product Account, personhood, or protocol diagnosis
priority_basis: A reproduced live P0 prevents the primary shared-group journey and therefore outranks the P1 Home and downstream modes
alternatives_not_now: P-022 Home coherence and P-030 release evidence both depend on a working group and intentional membership path
authority: Account-bound organizer signature creates the root group; later membership requires an organizer-signed grant
scope: guest-to-account setup, explicit entry, verified contacts, invite/accept/grant/revoke, payment instruments
out: internal Product Account diagnosis, contact-as-member, wallet-as-person, personhood gate, reusable group secret in a URL
```

## P-013 - Conventional category baseline

```yaml
id: P-013
status: building
priority: 94
blocker: P1-category-baseline-gap
blocked_by: none
reviewed: 2026-08-27
applies_to: chopdot-v1-launch
evidence_type: source
evidence: product/benchmark-baseline.md
evidence_sha256: eb0bad42e37a3d6b61ca98414dfc03ff123a0c67c016ee612aab7b6b54c76b50
pillar: Catch -> Management -> Payout -> History
journey: Product team compares familiar group-money jobs against conventional products and null workflows before defining ChopDot differentiation.
next_action: Review the category floor
operator_next_action: Complete the E2 same-journey walkthrough queue and bind accepted baseline requirements to active product cards
audience: operator
action_scope: Product evaluator defining the launch-worktree category floor across current user-facing packages
action_scope_universal: false
delivery_phase: phase-0-grounding
benchmark_requirements: not-applicable: this package defines and verifies the benchmark requirement set
differentiated_outcome: Product work cannot hide missing familiar jobs behind internal scenarios, infrastructure, or 10x claims
benchmark_evidence_state: e1-stale-refresh-required-e2-open
benchmark_scope: defines-registry
score: 10/10
expected_outcome: Every active user-facing card cites a current baseline outcome and preserves its E2 or real-user gap
success_evidence: Fresh source register, same-journey walkthrough packets, Cockpit references, and semantic validation pass
failure_outcome: Missing, stale, or marketing-only evidence blocks experience-complete and release-complete claims
accountable_owner: product-research
exit_condition: E2 walkthroughs required by each accepting phase are complete before that phase closes, later-phase gaps remain explicit, losses are recorded, and every active user-facing card has accepted benchmark coverage
priority_basis: P-035 remains the live P0; after it, the category floor must constrain P-022 before Home or the normal experience can be accepted
alternatives_not_now: P-022 Home coherence and P-030 release evidence cannot close before the baseline floor is accepted
authority: Dated product decisions using cited competitor and null-workflow evidence subordinate to Product Truth
scope: conventional and null-workflow discovery, same-journey comparison, requirement floor, evidence freshness, intentional exclusions
out: copying every feature, vendor marketing as proof, Devnet catalog as UX parity, universal first action, E1 represented as E2
```

## P-012 - Receipt-first capture

```yaml
id: P-012
status: building
priority: 50
blocker: none
blocked_by: none
reviewed: 2026-08-24
applies_to: chopdot-v1-launch
evidence_type: test
evidence: tests/capture-truth.spec.ts
evidence_sha256: 963bf5d1e08add2e6860354bbd68ae2e082e722761a01cb0c6e7b1636da70a4c
pillar: Catch
journey: A participant just paid and needs ChopDot to capture the receipt so the group gets the right next action.
next_action: Scan a receipt
operator_next_action: Prove bounded capture, correction, and OCR-failure recovery through the production entrypoint
audience: participant
action_scope: Catch route for a participant who has just paid or has a receipt to import
action_scope_universal: false
delivery_phase: phase-1-baseline
benchmark_requirements: BASE-EXPENSE-01,BASE-CAPTURE-01
differentiated_outcome: Capture remains a private reviewable draft until the participant accepts the exact shared change
benchmark_evidence_state: e1-stale-refresh-required-e2-open
benchmark_scope: applies
score: 9/10
expected_outcome: Receipt capture creates one reviewable local draft without mutating shared truth
success_evidence: Camera, import, link, OCR-failure, correction, and review production flows preserve the draft authority boundary
failure_outcome: Capture failure keeps the image or input reviewable and never silently shares or mutates group state
accountable_owner: product-capture
exit_condition: A participant completes capture and correction through the production entrypoint with one visible recovery action
priority_basis: Receipt capture is a core Catch job but does not outrank the live P0 group-creation or P1 Home-coherence blockers
alternatives_not_now: P-005 Spend Card and P-006 savings circle remain behind the primary receipt and shared-core paths
authority: Capture creates a local draft; the responsible participant's reviewed signed action changes shared state
scope: photo, import, link, reviewed OCR draft, manual correction fallback
out: blank accounting form, AI output as truth, silent send
```

## P-022 - Normal pot coherence and group cards

```yaml
id: P-022
status: building
priority: 90
blocker: P1-live-home-hierarchy
blocked_by: none
reviewed: 2026-08-24
applies_to: chopdot-v1-launch
evidence_type: test
evidence: docs/release/2026-08-24-p035-p022-local-acceptance.md
evidence_sha256: 1661dd02fb212419e2c866bcfadf95c70cb968aa581cae2b2559e162623889c8
pillar: Catch -> Management -> Payout -> History
journey: One organizer and two participants finish one dinner without bookkeeping ambiguity.
next_action: Scan a receipt
operator_next_action: Benchmark and repair contextual Home plus the complete normal group-money journey
audience: participant
action_scope: Empty or returning Home state where the participant's current job is to capture a group spend
action_scope_universal: false
delivery_phase: phase-1-baseline
benchmark_requirements: BASE-ENTRY-01,BASE-GROUP-01,BASE-EXPENSE-01,BASE-CAPTURE-01,BASE-SPLIT-01,BASE-STATUS-01,BASE-PAY-01,BASE-EXCEPTION-01,BASE-CURRENCY-01,BASE-OFFLINE-01,BASE-HISTORY-01,BASE-EXPORT-01,BASE-ACCESS-01
differentiated_outcome: The normal familiar group-money journey adds receiver-confirmed closeout and readable participant-held history without extra visible ceremony
benchmark_evidence_state: e1-stale-refresh-required-e2-open
benchmark_scope: applies
score: 10/10
expected_outcome: Three participants can see the right group state and finish one normal dinner without bookkeeping ambiguity
success_evidence: Production-entrypoint normal-pot journey, group-card screenshots, and real Home first-use proof pass
failure_outcome: Dashboard overload, duplicate actions, or an unreachable dominant action remains a P1 release blocker
accountable_owner: product-experience
exit_condition: Empty and returning Home states each expose one working contextual action, the cited category baseline passes, and the full normal journey closes
priority_basis: A reproduced live P1 obscures the normal product immediately after P-035, while P-013 supplies the category floor required to accept the repair
alternatives_not_now: P-005 Spend Card and P-006 savings circle remain blocked until the normal-pot Home, group-card, payment, and closeout model is coherent
authority: One Chop Core and receiver confirmation
scope: state-derived empty and returning Home, prioritized group cards, one intentional New Group path, pot/trip/couple presets, splits, requests, payment, confirmation, close
out: dashboard, mode catalog on Home, duplicate actions, parallel preset model, payer closes receiver's item
```

## P-005 - Spend Card

```yaml
id: P-005
status: blocked
priority: 40
blocker: none
blocked_by: P-035,P-013,P-022
reviewed: 2026-08-24
applies_to: chopdot-v1-launch
evidence_type: test
evidence: tests/named-mode-multi-account-production-entrypoint.spec.ts
evidence_sha256: 01a6db4a4f8942a38343fe9e80e25df982511db9823d52a97f8c70f71f815f3b
pillar: Catch
journey: A cardholder imports a transaction, attaches its receipt and shares the right amounts.
next_action: Match a receipt
operator_next_action: Map and prove the complete Spend Card journey after shared baseline gates close
audience: participant
action_scope: Spend Card group with an imported transaction awaiting receipt review
action_scope_universal: false
delivery_phase: phase-3-modes
benchmark_requirements: BASE-EXPENSE-01,BASE-CAPTURE-01,BASE-SPLIT-01,BASE-STATUS-01,BASE-HISTORY-01,MODE-SPEND-01
differentiated_outcome: Transaction data helps capture but never becomes accepted group truth without participant review
benchmark_evidence_state: e1-stale-refresh-required-e2-open
benchmark_scope: applies
score: 9/10
expected_outcome: A participant matches one transaction and receipt, resolves mismatches, and closes the shared record exactly
success_evidence: Production-entrypoint duplicate, mismatch, late receipt, refund, reversal, privacy, and export scenarios pass
failure_outcome: Feed data never becomes accepted truth and any ambiguity remains reviewable without mutation
accountable_owner: mode-spend-card
exit_condition: The complete Spend Card journey passes authority, privacy, recovery, and screenshot review
priority_basis: This named mode is valuable after the shared group, Home, money, payment, and recovery gates are proven
alternatives_not_now: P-035 membership and P-022 normal-product coherence are reused by every mode and therefore close first
authority: Reviewed ChopEventV1 actions; a feed is never truth
scope: transaction match/mismatch, duplicate, refund/reversal, normal close
out: card issuing, custody, feed-as-acceptance
```

## P-006 - Savings circle

```yaml
id: P-006
status: blocked
priority: 39
blocker: none
blocked_by: P-035,P-013,P-022
reviewed: 2026-08-24
applies_to: chopdot-v1-launch
evidence_type: test
evidence: tests/named-mode-multi-account-production-entrypoint.spec.ts
evidence_sha256: 01a6db4a4f8942a38343fe9e80e25df982511db9823d52a97f8c70f71f815f3b
pillar: Management -> Payout -> History
journey: A savings circle completes one contribution and payout round transparently.
next_action: Record this contribution
operator_next_action: Map and prove one complete multi-participant savings round after shared baseline gates close
audience: participant
action_scope: Active savings-circle round where one participant owes a contribution
action_scope_universal: false
delivery_phase: phase-3-modes
benchmark_requirements: BASE-GROUP-01,BASE-STATUS-01,BASE-PAY-01,BASE-EXCEPTION-01,BASE-HISTORY-01,MODE-SAVINGS-01
differentiated_outcome: The group preserves contribution, payout, recipient confirmation, and exactly-once round advancement without custody or guaranteed payout
benchmark_evidence_state: e1-stale-refresh-required-e2-open
benchmark_scope: applies
score: 9/10
expected_outcome: One savings round records contributions, payout evidence, recipient confirmation, and advances exactly once
success_evidence: Production-entrypoint order, delay, default, correction, dispute, payout, advance, replacement, and recovery scenarios pass
failure_outcome: No automatic debit, guaranteed payout, custody, or duplicate round advance is introduced
accountable_owner: mode-savings-circle
exit_condition: A complete multi-participant round closes and recovers with exact history and one advance
priority_basis: The mode is blocked until intentional membership and the normal group-money model are stable
alternatives_not_now: P-035 first-use and P-022 normal-pot coherence have broader dependency leverage across all modes
authority: Accepted rules, signed contributions and recipient confirmation
scope: order, round, delay/default visibility, payout, advance, close/export
out: guaranteed payout, credit, automatic debit, custody
```

## P-007 - Emergency pot

```yaml
id: P-007
status: blocked
priority: 38
blocker: none
blocked_by: P-035,P-013,P-022
reviewed: 2026-08-24
applies_to: chopdot-v1-launch
evidence_type: test
evidence: tests/named-mode-multi-account-production-entrypoint.spec.ts
evidence_sha256: 01a6db4a4f8942a38343fe9e80e25df982511db9823d52a97f8c70f71f815f3b
pillar: Management -> Payout -> History
journey: A trusted group helps urgently without exposing the private reason.
next_action: Contribute privately
operator_next_action: Map and prove the private emergency-support journey after shared baseline gates close
audience: participant
action_scope: Authorized emergency-pot participant viewing a bounded private request
action_scope_universal: false
delivery_phase: phase-3-modes
benchmark_requirements: BASE-GROUP-01,BASE-STATUS-01,BASE-PAY-01,BASE-EXCEPTION-01,BASE-HISTORY-01,MODE-EMERGENCY-01
differentiated_outcome: Trusted participants coordinate urgent support with threshold authority, bounded disclosure, recipient confirmation, and a redacted record
benchmark_evidence_state: e1-stale-refresh-required-e2-open
benchmark_scope: applies
score: 9/10
expected_outcome: A trusted group contributes and approves urgent help without exposing the private reason
success_evidence: Production-entrypoint threshold, redaction, approval, release, confirmation, dispute, recovery, and export scenarios pass
failure_outcome: Public reason leakage, unilateral release, or plaintext recovery and notification data blocks the mode
accountable_owner: mode-emergency-pot
exit_condition: The complete private request and release journey passes adversarial privacy and authority review
priority_basis: The mode depends on the same membership, Home, money, recovery, and confirmation core as the normal product
alternatives_not_now: P-035 first-use and P-022 normal-pot gates close first because they unlock and constrain every named mode
authority: Role and threshold events plus recipient confirmation
scope: privacy, threshold, approval, release, redacted record
out: public reason, unilateral release, plaintext notification/export
```

## P-008 - Community fund

```yaml
id: P-008
status: blocked
priority: 37
blocker: none
blocked_by: P-035,P-013,P-022
reviewed: 2026-08-24
applies_to: chopdot-v1-launch
evidence_type: test
evidence: tests/named-mode-multi-account-production-entrypoint.spec.ts
evidence_sha256: 01a6db4a4f8942a38343fe9e80e25df982511db9823d52a97f8c70f71f815f3b
pillar: Management -> Payout -> History
journey: A community agrees how to use shared contributions and records the handoff.
next_action: Review the proposal
operator_next_action: Map and prove the complete community-fund decision and handoff journey after shared baseline gates close
audience: participant
action_scope: Community-fund member with one proposal requiring a role-aware decision
action_scope_universal: false
delivery_phase: phase-3-modes
benchmark_requirements: BASE-GROUP-01,BASE-STATUS-01,BASE-PAY-01,BASE-EXCEPTION-01,BASE-HISTORY-01,BASE-EXPORT-01,MODE-COMMUNITY-01
differentiated_outcome: Contributions, proposals, threshold decisions, release, confirmation, and steward handoff remain role-aware and recoverable without token-governance theater
benchmark_evidence_state: e1-stale-refresh-required-e2-open
benchmark_scope: applies
score: 9/10
expected_outcome: A community records contributions, reviews one bounded proposal, approves or rejects it, and confirms the handoff
success_evidence: Production-entrypoint role, threshold, expiry, amendment, release, confirmation, steward recovery, and report scenarios pass
failure_outcome: Organizer bypass, token-vote theater, unilateral release, or unredacted disclosure blocks the mode
accountable_owner: mode-community-fund
exit_condition: A complete multi-role proposal and handoff journey closes with recoverable, redacted history
priority_basis: The mode follows the shared membership, normal product, recovery, and payment confirmation gates
alternatives_not_now: P-035 membership and P-022 normal-product coherence have broader reach and must constrain every specialized community-fund transition first
authority: Role-aware threshold approvals and recipient/handoff confirmation
scope: roles, contribution, proposal, approval, release, handoff/report
out: token voting, DAO theater, organizer bypass
```

## P-030 - Native release and evidence

```yaml
id: P-030
status: blocked
priority: 95
blocker: none
blocked_by: P-035,P-013,P-022
reviewed: 2026-08-27
applies_to: chopdot-v1-launch
evidence_type: measurement
evidence: docs/release/2026-08-24-live-first-use-findings.md
evidence_sha256: e1e6b46449bdd5d960682d0ee494b8034e6286b1738569f8d2168fae73daf621
pillar: Delivery
journey: The release integrator verifies that every supported .dot testnet surface serves the same reviewed ChopDot candidate.
next_action: Verify the candidate gates
operator_next_action: Clear release gates and freeze one deterministic candidate only after product acceptance
audience: operator
action_scope: Release-integrator view of the exact frozen public-testnet candidate
action_scope_universal: false
delivery_phase: phase-4-release
benchmark_requirements: not-applicable: operator distribution and release-evidence package
differentiated_outcome: The identical user-reviewed bytes are staged, promoted, owned, reachable, recoverable, and recalled with exact-source evidence
benchmark_evidence_state: not-applicable-operator
benchmark_scope: operator-not-applicable
score: 9/10
expected_outcome: Every advertised surface serves the same reviewed bytes with proven ownership, rollback, real use, and exact-source recall
success_evidence: Clean candidate, deterministic CAR/CID, Devnet and public readback, ownership, three-person acceptance, and cited recall all pass
failure_outcome: Any false verdict, byte mismatch, stale candidate, live P0 or P1, ownership gap, or cross-root recall blocks promotion
accountable_owner: release-integrator
exit_condition: All release verdict dimensions are independently true and the same CAR and CID are read back everywhere
priority_basis: Release work is high priority but remains blocked by P-035, the P-013 category floor, and P-022 and cannot outrank their product acceptance work
alternatives_not_now: P-035 first-use repair and P-013/P-022 benchmarked normal-product coherence must close before a new promotion or branding migration begins
authority: Signed product events; DotNS and hosts resolve immutable bytes only
scope: branch protection, dependency and release findings, deterministic CAR/CID, Devnet stage, identical public promotion, Desktop, rollback, ownership, real-user proof, portable cited recall
out: mainnet, rebuild-on-promotion, host as product authority
```
