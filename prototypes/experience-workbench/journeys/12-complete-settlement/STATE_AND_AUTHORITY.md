# Journey 12 — State and Authority

| Internal state | Human meaning | Authority that may advance it | May close the exact payment item? |
|---|---|---|---|
| `payment_started` | The selected payment method has begun. | Accepted Journey 11 authorization or provider result. | No |
| `payer_marked_sent` | The payer says an external/manual payment was sent. | Canonical payer. | No |
| `provider_submitted` | A provider reports submission. | Verified provider/integration result. | No |
| `awaiting_confirmation` | Receipt, clearing, or recipient confirmation is pending. | Deterministic backend from accepted history. | No |
| `received_cleared` | The exact payment was received or cleared. | Verified provider/integration result after exact-match checks. | Only when that method’s exact-match closure rules are satisfied |
| `receiver_confirmed` | The canonical recipient confirms an external/manual payment arrived. | Canonical recipient. | Eligible to close the exact item |
| `closed` | The exact payment item is complete and balances were recomputed. | Deterministic backend after a valid closing condition. | Yes |
| `partial` | Only part of the amount was validly received/confirmed. | Recipient or provider result plus deterministic backend. | Only the confirmed amount |
| `failed` | The attempt did not complete. | Provider/integration or deterministic backend. | No |
| `expired` | The valid time window ended. | Deterministic backend. | No |
| `cancelled` | The payer cancelled before completion. | Canonical payer or provider result. | No |
| `result_unknown` | The outcome cannot yet be proven. | Provider/integration or deterministic backend. | No |
| `recovering` | The existing payment identity is being reconciled. | Deterministic backend. | No |
| `disputed` | A dependent source item is under review. | Review system plus dependency calculation. | No |
| `reversed` | A previously completed payment was returned or invalidated. | Verified provider/integration result plus deterministic backend. | Reopens only the exact affected item |
| `record_pending` | Payment result is closed but the human-readable Saved record is still materializing. | Deterministic backend. | Already closed; record status is separate |

## Non-negotiable authority rules

- A payer cannot close their own external/manual payment by saying “I paid.”
- A recipient cannot confirm a different payer, amount, currency, method, or unrelated source item.
- A provider result cannot close an item unless exact deterministic checks pass.
- A UI tap never substitutes for provider receipt/finality.
- A future agent cannot approve itself, confirm receipt, or broaden delegated scope.
- Replaying accepted history rebuilds status and Saved records but never repeats payment side effects.
