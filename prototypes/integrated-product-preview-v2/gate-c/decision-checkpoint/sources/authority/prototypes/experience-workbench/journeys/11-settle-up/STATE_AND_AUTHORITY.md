# Payment State and Authority Table

This table is internal. Normal UI uses human status copy rather than these implementation names.

| Internal state | Meaning | Authority that may create the transition | Human UI example | May close the payment? |
|---|---|---|---|---|
| `intent_prepared` | Exact payer, recipient, amount, currency, method and source items are ready for review. | Backend from user selection, or an agent acting in prepare-only mode. | Review payment | No |
| `authorized` | The exact payment scope has been authorized according to the selected method's rules. For wallet payments, this exists only after a verified provider result is accepted. | Deterministic backend accepting the correct authority result; for wallet payments, a verified provider/integration result after exact scope, account, signature, expiry, nonce, replay and idempotency checks. | Approval accepted / Payment ready | No |
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

For wallet payments, no UI action creates `authorized`. `Approve in wallet` creates `approval_waiting` through `PaymentApprovalRequested`. A verified provider/integration result may create `PaymentIntentAuthorized` only after exact scope, account, signature, expiry, nonce, replay and idempotency checks pass.

### Saved record acceptance

`SavedRecordAccepted` is emitted only after a valid internal event and durable delivery entry are accepted together. It makes that event authoritative, but it is distinct from the final user-readable Saved record. After acceptance, realtime delivery may fail without losing the event.
<!-- J11_COMPATIBILITY_CLOSEOUT:END -->
