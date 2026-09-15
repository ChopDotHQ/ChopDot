# Journey 28 — Things Go Wrong / Recovery V1

Status: **candidate-ready definition** for the final registered Experience Workbench journey.

## Goal

Keep every journey understandable when something fails, conflicts, stalls, partially completes, is cancelled, or returns an unknown result — without inventing success, erasing uncertainty, or creating a second operation before the first one is resolved.

## Entry

Any validated ChopDot journey that encounters a material failure/recovery condition.

## Exit

1. **Recovered** — the original operation/state is reconciled to a verified outcome and the user returns to the owning journey.
2. **Safe retry** — reconciliation proves the original operation did not take effect, so a replacement attempt can be reviewed explicitly.
3. **Explicit stop** — the user stops without guessing or mutating additional product truth.

## Authority

Journey 28 owns the shared recovery interaction grammar, not the underlying domain result.

It may explain and coordinate stale/conflicting state; offline/read failure before an operation; pending and unknown-result operations; same-operation reconciliation; partial outcomes; cancellation and cancellation-too-late; duplicate/idempotent attempts; safe-retry eligibility; explicit stop and support context.

It must not reinterpret prior Golden semantics; convert unknown into success/failure without evidence; retry while an earlier operation may still have taken effect; manufacture wallet/payment/signing/provider/storage/account authority; claim external erasure, finality, settlement, persistence, or side effects that the owning journey/system has not proved; or use navigation as evidence of an execution result.

Every material state must be caller-reachable or explicitly classified as an owner/system boundary.

## Shared recovery rules

- **R1 — Preserve the original operation identity.** Possible-effect states stay bound to the same operation/context until the owner proves the outcome.
- **R2 — Reconcile before replacement retry.** Unknown/pending/partial states never expose replacement retry.
- **R3 — Pre-effect failure differs from possible-effect uncertainty.** Known pre-effect failures may retry the read/action according to the owning contract; possible-effect states must reconcile first.
- **R4 — Stale/conflict means refresh, not overwrite.** Newer owner truth is refreshed and re-reviewed.
- **R5 — Cancellation is a request until verified.** Too-late or uncertain cancellation reconciles the original operation.
- **R6 — Partial is not success.** Known and unresolved pieces remain separate until reconciled.
- **R7 — Duplicate attempts are idempotent.** Open/reconcile the existing operation instead of creating a second effect.
- **R8 — Explicit stop preserves truth.** Stop without guessing and retain enough context to resume safely later.
- **R9 — Adjacent owners remain explicit.** Auth/session, wallet/payment/signing, provider/network, storage/import/export, and prior journeys retain authority.
- **R10 — Prototype truth is bounded.** The deterministic fixture proves recovery semantics and caller reachability only; it does not prove production persistence, external finality, signing, settlement, or remote reconciliation.

<!-- JOURNEY_DECISION_HISTORY:START -->
## Decision history

### J28-D01 — Final registered closeout
J28 starts only after J27 is Golden #27 and exact-head verified.

### J28-D02 — Shared recovery grammar, not a new domain owner
J28 standardizes recovery semantics across Goldens while preserving the original journey/system as result authority.

### J28-D03 — Same-operation reconciliation before replacement
Possible-effect states reconcile the original operation before any retry can be reviewed.

### J28-D04 — Unknown remains unknown
Navigation, reload, timeout, and user intent cannot convert an unknown result into success or failure.

### J28-D05 — Cancellation is two-phase
Requesting cancellation is distinct from verified cancellation; too-late/unknown cancellation routes to reconciliation.

### J28-D06 — Partial outcomes preserve known and unresolved truth
J28 explains what happened and what remains unresolved without collapsing partial into success.

### J28-D07 — Duplicate attempts open existing truth
Idempotent duplicates point to the existing operation/result rather than initiating a second effect.

### J28-D08 — Stale/conflict refreshes owner truth
Stale reviewed actions are not replayed against newer truth without a fresh review.

### J28-D09 — Explicit stop is a safe terminal for recovery UI only
Stopping preserves unresolved context and does not assert a domain result.

### J28-D10 — Adjacent-owner boundaries are visible, not simulated
Boundary screens explain ownership and return paths without executing auth, provider, payment, wallet, storage, import/export, or prior-Golden effects.

**Approval / version:** Candidate contract only; independent review and the standing-approval policy gate are still required.
<!-- JOURNEY_DECISION_HISTORY:END -->
