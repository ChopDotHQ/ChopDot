# Journey 28 — Decision History

**Coverage:** Exact independently reviewed Journey 28 V1 decision set `J28-D01`–`J28-D10` plus the deterministic fixture implementation note below.

**Decision:** Preserve the exact reviewed J28 recovery decisions below unchanged during Golden replay and terminal closeout.

## J28-D01 — Final registered closeout
Journey 28 becomes authoritative only after Journey 27 is frozen as Golden #27 and the resulting canonical head is exact-head verified.

## J28-D02 — Recovery owns interaction grammar, not domain results
J28 may coordinate failure, stale/conflict, unknown, partial, cancellation, duplicate, reconciliation, safe retry and explicit stop. The original journey/system remains authoritative for the underlying product result.

## J28-D03 — Same-operation reconciliation first
When an effect may have started, J28 keeps the exact operation identity and reconciles that operation before any replacement retry can be reviewed.

## J28-D04 — Unknown is durable truth
Timeout, reload, route changes and user navigation cannot convert an unknown result to success/failure/cancelled.

## J28-D05 — Cancellation is request → verification
Cancellation intent and cancellation result are separate states. Too-late/uncertain cancellation routes to original-operation reconciliation.

## J28-D06 — Partial outcomes stay partial
Known-success pieces and unresolved pieces remain visible until the owner reconciles the remainder.

## J28-D07 — Duplicate requests are idempotent
A duplicate opens/reconciles the existing operation/result rather than generating a second effect.

## J28-D08 — Stale state refreshes before replay
A stale reviewed action cannot overwrite newer owner truth; refresh and review again.

## J28-D09 — Explicit stop is safe and resumable
Stopping recovery preserves verified facts and unresolved context without claiming a domain outcome.

## J28-D10 — Boundaries stay boundaries
Auth/session, provider/network, payment/wallet/signing, storage/import/export and prior-journey results are displayed as explicit owner handoffs only.

## Candidate implementation note
The deterministic V1 fixture uses synthetic operation `OP-28-DEMO`. It exists only to prove the recovery model, caller reachability, idempotency and no-retry-before-reconciliation rules. It does not execute production effects.
