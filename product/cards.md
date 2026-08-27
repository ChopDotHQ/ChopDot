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
journey: Mina reviews one exact group-money action and every participant derives the same state.
next_action: Review this draft
score: 10/10
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
journey: Mina returns on another device and safely recovers the same group record.
next_action: Restore my groups
score: 10/10
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
evidence_sha256: d6214f60eacb9f2b7a1c9aea381a878be321cd2d680ee7a9b194f7beca5fc3ec
pillar: Management
journey: Mina creates and shares one group without understanding account infrastructure, then brings Leo in intentionally.
next_action: Create my group
score: 10/10
authority: Account-bound organizer signature creates the root group; later membership requires an organizer-signed grant
scope: guest-to-account setup, explicit entry, verified contacts, invite/accept/grant/revoke, payment instruments
out: internal Product Account diagnosis, contact-as-member, wallet-as-person, personhood gate, reusable group secret in a URL
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
evidence_sha256: f335fcf523e5b0f1f7f103dd64fed7f6ee661868fb22b96edf16362bf533145d
pillar: Catch
journey: Mina just paid and needs ChopDot to capture the receipt so the group gets the right next action.
next_action: Scan a receipt
score: 9/10
authority: Capture creates a local draft; Mina's reviewed signed action changes shared state
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
evidence_sha256: d6214f60eacb9f2b7a1c9aea381a878be321cd2d680ee7a9b194f7beca5fc3ec
pillar: Catch -> Management -> Payout -> History
journey: Mina, Leo and Nina finish one dinner without bookkeeping ambiguity.
next_action: Scan a receipt
score: 10/10
authority: One Chop Core and receiver confirmation
scope: receipt-first empty Home, prioritized group cards, one New Group path, pot/trip/couple presets, splits, requests, payment, confirmation, close
out: dashboard, mode catalog on Home, duplicate actions, parallel preset model, payer closes receiver's item
```

## P-005 - Spend Card

```yaml
id: P-005
status: blocked
priority: 40
blocker: none
blocked_by: P-035,P-022
reviewed: 2026-08-24
applies_to: chopdot-v1-launch
evidence_type: test
evidence: tests/named-mode-multi-account-production-entrypoint.spec.ts
evidence_sha256: c336775d2c43127a5757b6140671fb4a982226c920b4f89f486cc4ce5ba07cd9
pillar: Catch
journey: Mina imports a card transaction, attaches its receipt and shares the right amounts.
next_action: Match a receipt
score: 9/10
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
blocked_by: P-035,P-022
reviewed: 2026-08-24
applies_to: chopdot-v1-launch
evidence_type: test
evidence: tests/named-mode-multi-account-production-entrypoint.spec.ts
evidence_sha256: c336775d2c43127a5757b6140671fb4a982226c920b4f89f486cc4ce5ba07cd9
pillar: Management -> Payout -> History
journey: A savings circle completes one contribution and payout round transparently.
next_action: Record this contribution
score: 9/10
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
blocked_by: P-035,P-022
reviewed: 2026-08-24
applies_to: chopdot-v1-launch
evidence_type: test
evidence: tests/named-mode-multi-account-production-entrypoint.spec.ts
evidence_sha256: c336775d2c43127a5757b6140671fb4a982226c920b4f89f486cc4ce5ba07cd9
pillar: Management -> Payout -> History
journey: A trusted group helps urgently without exposing the private reason.
next_action: Contribute privately
score: 9/10
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
blocked_by: P-035,P-022
reviewed: 2026-08-24
applies_to: chopdot-v1-launch
evidence_type: test
evidence: tests/named-mode-multi-account-production-entrypoint.spec.ts
evidence_sha256: c336775d2c43127a5757b6140671fb4a982226c920b4f89f486cc4ce5ba07cd9
pillar: Management -> Payout -> History
journey: A community agrees how to use shared contributions and records the handoff.
next_action: Review the proposal
score: 9/10
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
blocked_by: P-035,P-022
reviewed: 2026-08-27
applies_to: chopdot-v1-launch
evidence_type: measurement
evidence: docs/release/2026-08-24-live-first-use-findings.md
evidence_sha256: e1e6b46449bdd5d960682d0ee494b8034e6286b1738569f8d2168fae73daf621
pillar: Delivery
journey: Mina opens the same reviewed ChopDot release through every supported .dot testnet surface.
next_action: Clear the release gates
score: 9/10
authority: Signed product events; DotNS and hosts resolve immutable bytes only
scope: branch protection, dependency and release findings, deterministic CAR/CID, Devnet stage, identical public promotion, Desktop, rollback, ownership, real-user proof, portable cited recall
out: mainnet, rebuild-on-promotion, host as product authority
```
