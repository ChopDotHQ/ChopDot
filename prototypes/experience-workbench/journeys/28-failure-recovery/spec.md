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
# Journey 28 — Decision History

## Decision history

**Coverage:** Exact independently reviewed Journey 28 V1 decision set `J28-D01`–`J28-D10`. Missing rationale, alternatives, tradeoffs, or revisit triggers are explicitly marked as not recorded rather than inferred. The deterministic fixture note is preserved below as implementation context only.

**Implementation note:** The deterministic V1 fixture uses synthetic operation `OP-28-DEMO`. It exists only to prove the recovery model, caller reachability, idempotency and no-retry-before-reconciliation rules. It does not execute production effects.

### J28-D01 — Final registered closeout
**Decision:** Journey 28 becomes authoritative only after Journey 27 is frozen as Golden #27 and the resulting canonical head is exact-head verified.

**Why:** Not recorded in inspected sources

**Alternatives:** Not recorded in inspected sources

**Tradeoffs:** Not recorded in inspected sources

**Revisit when:** Not recorded in inspected sources

**Approval / version:** V1; exact candidate independently classified `GOLDEN-READY` and standing-policy approval is recorded, while final Golden validity remains subject to canonical resulting-state exact-head verification.

**Sources:** [Journey 28 specification](../spec.md) · [J28 standing-policy approval record](../../../registry/approvals/28-v1.json)

### J28-D02 — Recovery owns interaction grammar, not domain results
**Decision:** J28 may coordinate failure, stale/conflict, unknown, partial, cancellation, duplicate, reconciliation, safe retry and explicit stop. The original journey/system remains authoritative for the underlying product result.

**Why:** Not recorded in inspected sources

**Alternatives:** Not recorded in inspected sources

**Tradeoffs:** Not recorded in inspected sources

**Revisit when:** Not recorded in inspected sources

**Approval / version:** V1; exact candidate independently classified `GOLDEN-READY` and standing-policy approval is recorded, while final Golden validity remains subject to canonical resulting-state exact-head verification.

**Sources:** [Journey 28 specification](../spec.md) · [Exact reviewed candidate](../v1-candidate.html)

### J28-D03 — Same-operation reconciliation first
**Decision:** When an effect may have started, J28 keeps the exact operation identity and reconciles that operation before any replacement retry can be reviewed.

**Why:** Not recorded in inspected sources

**Alternatives:** Not recorded in inspected sources

**Tradeoffs:** Not recorded in inspected sources

**Revisit when:** Not recorded in inspected sources

**Approval / version:** V1; exact candidate independently classified `GOLDEN-READY` and standing-policy approval is recorded, while final Golden validity remains subject to canonical resulting-state exact-head verification.

**Sources:** [Journey 28 specification](../spec.md) · [Exact reviewed candidate](../v1-candidate.html)

### J28-D04 — Unknown is durable truth
**Decision:** Timeout, reload, route changes and user navigation cannot convert an unknown result to success/failure/cancelled.

**Why:** Not recorded in inspected sources

**Alternatives:** Not recorded in inspected sources

**Tradeoffs:** Not recorded in inspected sources

**Revisit when:** Not recorded in inspected sources

**Approval / version:** V1; exact candidate independently classified `GOLDEN-READY` and standing-policy approval is recorded, while final Golden validity remains subject to canonical resulting-state exact-head verification.

**Sources:** [Journey 28 specification](../spec.md) · [Exact reviewed candidate](../v1-candidate.html)

### J28-D05 — Cancellation is request → verification
**Decision:** Cancellation intent and cancellation result are separate states. Too-late/uncertain cancellation routes to original-operation reconciliation.

**Why:** Not recorded in inspected sources

**Alternatives:** Not recorded in inspected sources

**Tradeoffs:** Not recorded in inspected sources

**Revisit when:** Not recorded in inspected sources

**Approval / version:** V1; exact candidate independently classified `GOLDEN-READY` and standing-policy approval is recorded, while final Golden validity remains subject to canonical resulting-state exact-head verification.

**Sources:** [Journey 28 specification](../spec.md) · [Exact reviewed candidate](../v1-candidate.html)

### J28-D06 — Partial outcomes stay partial
**Decision:** Known-success pieces and unresolved pieces remain visible until the owner reconciles the remainder.

**Why:** Not recorded in inspected sources

**Alternatives:** Not recorded in inspected sources

**Tradeoffs:** Not recorded in inspected sources

**Revisit when:** Not recorded in inspected sources

**Approval / version:** V1; exact candidate independently classified `GOLDEN-READY` and standing-policy approval is recorded, while final Golden validity remains subject to canonical resulting-state exact-head verification.

**Sources:** [Journey 28 specification](../spec.md) · [Exact reviewed candidate](../v1-candidate.html)

### J28-D07 — Duplicate requests are idempotent
**Decision:** A duplicate opens/reconciles the existing operation/result rather than generating a second effect.

**Why:** Not recorded in inspected sources

**Alternatives:** Not recorded in inspected sources

**Tradeoffs:** Not recorded in inspected sources

**Revisit when:** Not recorded in inspected sources

**Approval / version:** V1; exact candidate independently classified `GOLDEN-READY` and standing-policy approval is recorded, while final Golden validity remains subject to canonical resulting-state exact-head verification.

**Sources:** [Journey 28 specification](../spec.md) · [Exact reviewed candidate](../v1-candidate.html)

### J28-D08 — Stale state refreshes before replay
**Decision:** A stale reviewed action cannot overwrite newer owner truth; refresh and review again.

**Why:** Not recorded in inspected sources

**Alternatives:** Not recorded in inspected sources

**Tradeoffs:** Not recorded in inspected sources

**Revisit when:** Not recorded in inspected sources

**Approval / version:** V1; exact candidate independently classified `GOLDEN-READY` and standing-policy approval is recorded, while final Golden validity remains subject to canonical resulting-state exact-head verification.

**Sources:** [Journey 28 specification](../spec.md) · [Exact reviewed candidate](../v1-candidate.html)

### J28-D09 — Explicit stop is safe and resumable
**Decision:** Stopping recovery preserves verified facts and unresolved context without claiming a domain outcome.

**Why:** Not recorded in inspected sources

**Alternatives:** Not recorded in inspected sources

**Tradeoffs:** Not recorded in inspected sources

**Revisit when:** Not recorded in inspected sources

**Approval / version:** V1; exact candidate independently classified `GOLDEN-READY` and standing-policy approval is recorded, while final Golden validity remains subject to canonical resulting-state exact-head verification.

**Sources:** [Journey 28 specification](../spec.md) · [Exact reviewed candidate](../v1-candidate.html)

### J28-D10 — Boundaries stay boundaries
**Decision:** Auth/session, provider/network, payment/wallet/signing, storage/import/export and prior-journey results are displayed as explicit owner handoffs only.

**Why:** Not recorded in inspected sources

**Alternatives:** Not recorded in inspected sources

**Tradeoffs:** Not recorded in inspected sources

**Revisit when:** Not recorded in inspected sources

**Approval / version:** V1; exact candidate independently classified `GOLDEN-READY` and standing-policy approval is recorded, while final Golden validity remains subject to canonical resulting-state exact-head verification.

**Sources:** [Journey 28 specification](../spec.md) · [Exact reviewed candidate](../v1-candidate.html)
<!-- JOURNEY_DECISION_HISTORY:END -->
