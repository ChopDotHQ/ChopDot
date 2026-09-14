# Current Work Packet — Journey 27 Account & Preferences V1

- Journey: **27 — Account & Preferences V1**
- Factory generation: **v1.1**
- Canonical activation head at Builder claim: `19a282b8c3346ca62e77c2db3780163a75f58046`
- Prior Golden: Journey 26 Group Lifecycle V1, Golden #26, checksum `4d93b1b3458aead8d412256f65d0e4c2c2de1b273abc0af58bd89cb56783da28`
- J26→J27 exact transition verification: satisfied (`canonical_exact_head_verified:true`)
- Builder lease holder: `fast-builder-A`
- Standing approval: may apply only after exact independent `GOLDEN-READY`; Builder cannot apply it.
- TYPO-01: deferred.

## User job

From `You` / account settings, understand and safely change profile presentation, notification preference, appearance, current-session security/sign-out, and account deletion while keeping adjacent authority and unknown outcomes honest.

## Load-bearing invariants

1. Fresh session truth before mutation; offline is read-only.
2. Profile/UI preferences never create wallet, payment, signing, group-owner, or identity-provider authority.
3. Preview/draft is not persisted truth.
4. App notification preference is distinct from OS/device permission.
5. Version conflicts never silently overwrite newer truth.
6. Unknown outcomes reconcile the same operation identity before replacement retry.
7. Sign-out is not account deletion.
8. Deletion is blocked by unresolved group ownership or money responsibilities owned elsewhere.
9. Deleted means only the prototype account working state; shared/external/public history is not claimed erased.
10. Navigation cannot manufacture saved/signed-out/deleted truth.

## Adjacent owners

- `you-home-boundary` — owning You surface.
- `notification-system-boundary` — OS/device notification permission.
- `ownership-transfer-boundary` — Journey 26 group lifecycle.
- `money-resolution-boundary` — money/settlement owner; Journey 27 cannot settle.
- `export-boundary` — Journey 24 Export / Portability.

## Evidence contract

- Complete deterministic candidate, not a partial slice.
- Caller reachability for every registered material state/boundary from truthful entry flow.
- Browser/layout render coverage at 393×852 and 430×890.
- Zero page errors, console errors, and external runtime requests.
- Minimum practical action target height 44px.
- Exact source/head/tree/SHA and evidence artifact binding.
- 100% screenshot generation/mechanical coverage; independent direct visual inspection is risk-based under current Reviewer doctrine.

## Prototype boundary

Fixture only. No production account persistence, auth/session invalidation, OS permission mutation, notification delivery, external deletion/erasure, payment/settlement, wallet/signing, provider mutation, or chain effect is claimed.
