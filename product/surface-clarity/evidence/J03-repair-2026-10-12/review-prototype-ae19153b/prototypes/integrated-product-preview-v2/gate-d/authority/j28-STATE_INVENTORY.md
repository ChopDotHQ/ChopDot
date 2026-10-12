# Journey 28 — Things Go Wrong / Recovery V1 State Inventory

## Registered material states

### Entry / read failures
- **J28-S01 · recovery-entry** — Shared recovery scenario chooser with preserved caller context.
- **J28-S02 · checking-current-truth** — Refresh/reconcile owner truth before deciding what recovery is valid.
- **J28-S03 · offline-before-action** — Offline before any effect begins; no write claimed.
- **J28-S04 · reconnecting** — Reconnect/read-only refresh in progress.
- **J28-S05 · read-failed** — Known read failure before effect; retry only reloads truth.

### Stale / conflict
- **J28-S06 · stale-detected** — Reviewed state/version is stale.
- **J28-S07 · refreshing-owner-truth** — Current owner truth is being fetched.
- **J28-S08 · conflict-current** — Newer truth is shown; old action is not replayed.
- **J28-S09 · conflict-stop** — User stops with current owner truth preserved.

### Pending / unknown result / reconciliation
- **J28-S10 · operation-pending** — Original operation is still pending; replacement blocked.
- **J28-S11 · result-unknown** — Effect may have started but outcome is not known.
- **J28-S12 · reconcile-checking** — Same operation identity is being reconciled.
- **J28-S13 · reconcile-pending** — Owner proves the original operation is still pending.
- **J28-S14 · reconcile-success** — Owner proves the original operation succeeded.
- **J28-S15 · reconcile-failed** — Owner proves the original operation failed after being accepted/started.
- **J28-S16 · reconcile-not-found** — Owner proves no effect/operation exists; replacement may now be reviewed.
- **J28-S17 · safe-retry-review** — Explicit replacement review after no-effect proof.
- **J28-S18 · retrying** — One replacement operation is in progress.
- **J28-S19 · retry-success** — Replacement outcome verified in the fixture.

### Partial outcome
- **J28-S20 · partial-result** — Some effect is verified while another required part is unresolved.
- **J28-S21 · partial-reconcile** — Same operation/context reconciliation for the unresolved remainder.
- **J28-S22 · partial-resolved** — Remaining part is verified; complete truth can return to owner.
- **J28-S23 · partial-stop** — Stop with both verified and unresolved pieces preserved.

### Cancellation
- **J28-S24 · cancel-review** — Review cancellation without pretending it has happened.
- **J28-S25 · cancel-pending** — Cancellation request sent; original operation remains unresolved.
- **J28-S26 · cancelled-verified** — Owner verifies cancellation before effect/finality.
- **J28-S27 · cancel-too-late** — Cancellation cannot be assumed; reconcile original operation.

### Duplicate / idempotency
- **J28-S28 · duplicate-detected** — Same operation/request already exists.
- **J28-S29 · existing-result** — Existing operation/result is opened; no second effect begins.

### Explicit stop / support
- **J28-S30 · blocked-stop** — Recovery cannot proceed safely now; no additional mutation.
- **J28-S31 · support-context** — Copyable non-secret recovery context and operation reference.
- **J28-S32 · recovered-summary** — Shared recovery summary before returning to the owning journey.

## Explicit adjacent-owner/system boundaries

- **J28-B01 · caller-owner-boundary** — The original owning ChopDot journey retains domain truth.
- **J28-B02 · provider-system-boundary** — Provider/network/system availability/finality belongs to the external owner.
- **J28-B03 · auth-session-boundary** — Authentication/session restoration belongs to the auth owner.
- **J28-B04 · payment-wallet-boundary** — Payment/wallet/signing authority remains outside J28.
- **J28-B05 · storage-portability-boundary** — Storage/import/export persistence and recovery remain with J23–J25 or external storage owners.
- **J28-B06 · owner-return-boundary** — Verified recovery context returns to the owning journey; J28 does not manufacture that journey's success screen.

## Reachability requirement

Every J28-S state is reachable by clicked prototype paths from `recovery-entry`. J28-B states are reachable from explicit boundary actions and are marked as owner/system boundaries. Unknown, pending, partial, and cancellation-too-late paths do not expose a replacement retry until `reconcile-not-found` proves no effect occurred.
