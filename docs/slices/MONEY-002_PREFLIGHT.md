# MONEY-002 Preflight — Safe correction after request/settlement

Status: READY_FOR_CODEX_VERIFY
Branch: `chatgpt/chopdot-v1-completion`

## User goal

A person must be able to correct a real mistake after a payment request or payment activity has started without ChopDot rewriting history, leaving a stale request live, or pretending money moved differently than it did.

## Canonical rules

1. A sent request is immutable in amount/scope. A changed obligation invalidates the old request and requires a replacement request.
2. `marked_paid` and `confirmed` history is never rewritten.
3. A correction after payment activity is additive: preserve the original expense/splits/evidence and create explicit adjustment obligations for the delta.
4. A settled expense is never silently deleted.
5. Current local-shell corrections remain local prototype authority. They do not claim shared/cross-device correctness.
6. Money still uses the current `number` representation in this slice; integer money migration remains DATA-002.

## Local-shell representation

The current shell has no canonical backend `PaymentIntent` table yet, so MONEY-002 maps the mature contract into existing primitives conservatively.

### Request-only correction

If affected counterparty splits are only `request_sent`:

- record an append-only `request_invalidated` activity event containing the old request id/amount;
- replace the expense/split set atomically with the corrected allocation;
- any counterparty that still has a debt gets a fresh request id supplied by the command and remains `request_sent`;
- removed/zeroed counterparties have no live request after the correction.

### Payment-active correction

If any affected counterparty split is `marked_paid`, `confirmed`, or has wallet evidence:

- original expense and payment-evidence records remain unchanged;
- correction must keep the original payer for this first safe implementation;
- any still-live request on the corrected expense is invalidated and returned to an open obligation rather than left stale;
- calculate the per-counterparty delta between original share and corrected share;
- positive delta creates an open adjustment owed to the original payer;
- negative delta creates an open reverse/refund adjustment owed by the original payer to that participant;
- adjustment expenses are tagged `kind: adjustment` and reference the original expense;
- effective group spend applies adjustment direction: forward adjustments increase spend, refund adjustments decrease it;
- record one append-only `expense_correction_recorded` activity event with the corrected snapshot and generated adjustment ids.

Changing the payer after payment activity is intentionally rejected in MONEY-002. That requires a richer obligation-level backend model and should not be improvised in the local shell.

## Critical acceptance cases

1. Request was 300, corrected debt is 250 -> old request id is recorded as invalidated; corrected live split is 250 with a new request id.
2. Request was 300, participant removed -> old request is invalidated and no replacement request remains for that participant.
3. Paid/confirmed 300, corrected debt is 250 -> original 300 evidence remains untouched; a 50 reverse adjustment is created.
4. Paid/confirmed 250, corrected debt is 300 -> original payment remains untouched; a new 50 forward adjustment is created.
5. Replaying the same correction id does not create duplicate adjustments/events.
6. Attempting to change the payer after activity changes nothing.
7. Effective group total reflects correction deltas while member balances include the same adjustment obligations.
8. Delete remains unavailable once request/payment activity exists.
9. If one member has paid while another still has a live request, the correction invalidates that stale request without mutating the paid member's evidence.

## Product behavior implemented

Expense Detail no longer dead-ends with only “history is locked.” It offers a deliberate **Correct expense** action.

Before save, it explains whether ChopDot will replace a request or preserve payment history and create an adjustment. The payer field is locked once activity has started. Adjustment records are read-only historical records and the original expense displays a correction summary.

## Implementation evidence

Implemented on this branch:

- `CORRECT_EXPENSE` reducer command with correction-id idempotency;
- request invalidation/reissue for request-only corrections;
- mixed-state stale-request invalidation;
- additive forward/refund adjustments after payment activity;
- adjustment metadata in `Expense`;
- effective group-spend selector accounting for adjustment direction;
- consumer correction UI in `ExpenseDetail`;
- reducer tests for request replacement/removal, overpayment refund, underpayment addition, mixed payment/request state, idempotency, payer-change rejection, and effective totals.

Tests are **WRITTEN / NOT EXECUTED HERE**. No CI workflow is configured on this repository branch and the connected GitHub environment does not provide a runtime shell for the private repository. The slice therefore remains `READY_FOR_CODEX_VERIFY`, not `DONE`, until `npm run lint`, the state tests, build, and mobile flow are executed against the true current source.