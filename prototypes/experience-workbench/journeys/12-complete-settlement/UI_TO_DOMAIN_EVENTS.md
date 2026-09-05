# Journey 12 — UI to Domain Events

| Visible action | Internal event | Authority | Explicitly does not mean |
|---|---|---|---|
| **Yes, I sent it** | `PayerMarkedSent` | Payer | Received, confirmed, or complete |
| **View confirmation status** | `PaymentStatusViewed` | System/read | State advanced |
| **Refresh status** | `PaymentStatusRefreshRequested` | Current viewer/read | Receipt was confirmed, role changed, closure occurred, or execution retried |
| **Yes, it arrived** | `ReceiverConfirmationRequested` | Receiver | Other payments or amounts were confirmed |
| **Not yet** | `ReceiverNotYetReported` | Receiver | Failure or cancellation |
| **Confirm partial amount** | `ReceiverConfirmedPartial` | Receiver | The full expected amount arrived |
| **Check payment** | `PaymentStatusRefreshRequested` | System/read | The wallet payment was authorized by the UI |
| **Recover status** | `PaymentRecoveryRequested` | Payer/system | A replacement payment was created |
| **Try again** | `PaymentRetryRequested` | Payer, only after verified not-executed outcome | A timeout alone made retry safe, or a duplicate intent was created |
| **Cancel** | `PaymentApprovalCancellationRequested` or `PaymentCancellationRequested` | Payer | A completed payment was reversed |
| **Review the issue** | `SettlementIssueOpened` | System/read | The disputed source item was resolved |
| **View updated balance** | `SettlementResultViewed` | System/read | Viewing caused the balance change |
| **View payment record** | `SavedRecordViewed` | System/read | Internal durable acceptance and readable record are the same event |
| **Refresh record** | `SavedRecordRefreshRequested` | System/read | The payment is retried or reopened |
| **Back to balances** | `SettlementExitRequested` | Payer/receiver | Settlement state changed |

## Closure rule

No visible payer action emits `PaymentClosed`. Closure is a deterministic backend result after the correct receiver/provider authority and exact-scope checks have been accepted.

## V1.1 continuation routing

The href is a template destination, not a transition authority. `source/continuity-ui.js` resolves shared destinations against the selected payment context. `UI_EVENT_MAPPING.json` records that policy and guards for every action.

- Refresh targets the current status template and reads accepted results only.
- Payer refresh never targets a receiver review screen.
- A receipt request is accepted only from the matching recipient for that payment.
- Repeated View/Done/Back calls preserve the derived balance and method; they create no business transition.
- An unknown outcome turns an attempted execution retry into `PaymentRecoveryRequested`, with no `PaymentRetryRequested` emitted.
- A verified non-executed result must precede a permitted `PaymentRetryRequested`; repeated taps consume no extra attempt.
- `DemoVerifiedResult` and `DemoPaymentClosed` are isolated test fixtures outside the normal UI, not new production domain events.

The application-side receiver request, acceptance, closure and resulting-balance read remain distinct in the specification even when the local fixture delivers a synchronous accepted response.
