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
