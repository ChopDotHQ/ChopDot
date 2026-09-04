# Payment State and Authority Table

This table is internal. Normal UI uses human status copy rather than these implementation names.

| Internal state | Meaning | Authority that may create the transition | Human UI example | May close the payment? |
|---|---|---|---|---|
| `intent_prepared` | Exact payer, recipient, amount, currency, method and source items are ready for review. | Backend from user selection, or an agent acting in prepare-only mode. | Review payment | No |
| `authorized` | The payer, or a valid narrowly delegated agent, authorizes the exact scope. | Payer or valid delegated actor after deterministic verification. | Open TWINT / Approve in wallet | No |
| `payment_started` | The selected method has been opened or initiated. | Payment service after authorization. | Finish in TWINT / Check your wallet | No |
| `payer_marked_sent` | The payer claims an external/manual payment was sent. | Payer only. | Marked as sent | No |
| `rail_submitted` | A provider or chain reports submission. | Provider/network connector only. | Sent | No |
| `awaiting_confirmation` | ChopDot is waiting for receipt, clearing or receiver confirmation. | Backend based on prior valid transition. | Waiting for Jeanine | No |
| `received_cleared` | A provider/network reports receipt, clearing or finality for the exact transfer. | Provider/network connector; deterministically verified. | Payment received | Not by itself, except exact-match closure rule |
| `receiver_confirmed` | The recipient confirms an external/manual payment arrived. | Canonical receiver only. | Jeanine confirmed receipt | Eligible for closure |
| `closed` | The exact payment item is complete and the derived balances refresh. | Deterministic backend after required authority conditions. | Settlement complete | Yes |
| `failed` | The attempt did not complete. | Provider/network or backend validation. | Payment failed | No |
| `expired` | The intent, quote or delegation exceeded its expiry. | Backend clock/verification. | Quote expired | No |
| `cancelled` | The payer cancelled before valid completion. | Payer, or provider reporting payer rejection. | Nothing was sent | No |
| `partial` | A confirmed amount is lower than the eligible balance. | Backend after confirmed receipt/clearing. | CHF 34.30 remains | Closes only confirmed part |
| `disputed` | A source expense makes dependent payment items ineligible. | Review/issue workflow plus backend dependency calculation. | Balance may change | No |
| `reversed` | A previously received payment was reversed or invalidated. | Provider/network report plus deterministic backend verification. | Payment reversed | Reopens exact affected item |

## Exact finalized transfer exception

A finalized provider/network transfer may close an exact item without manual receiver confirmation only when payer, recipient, amount, currency/asset, source item, authorization and transfer identity all match deterministically. It never closes unrelated items.

<!-- J11_COMPATIBILITY_CLOSEOUT:START -->
## Wallet approval states

| Internal state | Meaning | Authority | Can authorize or close? |
|---|---|---|---|
| `approval_waiting` | Approval was requested and no verified result has returned. | Wallet/provider result plus deterministic verifier | No |
| `approval_rejected` | The wallet rejected the request. | Wallet/provider result | No |
| `approval_expired` | The approval window expired. | Deterministic clock/verifier | No |
| `approval_disconnected` | The wallet is not available for the request. | Connection status | No |
| `approval_result_unknown` | A request may have been handled, but its result is unavailable. | Reconciliation only | No new payment |
| `approval_recovering` | ChopDot is reconciling the existing request. | Provider/system query | No new payment |

A verified wallet approval may create `PaymentIntentAuthorized` only after exact scope, expiry, account, signature, nonce and replay checks pass.

### Saved record acceptance

`SavedRecordAccepted` is emitted only after a valid event and durable outbox entry are accepted together. Before that acceptance, the transition is not authoritative. After acceptance, realtime delivery may fail without losing the transition.
<!-- J11_COMPATIBILITY_CLOSEOUT:END -->
