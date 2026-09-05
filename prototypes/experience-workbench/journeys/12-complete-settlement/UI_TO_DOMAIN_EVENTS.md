# Journey 12 — UI to Domain Events

| Visible action | Internal event | Authority | Explicitly does not mean |
|---|---|---|---|
| **Yes, I sent it** | `PayerMarkedSent` | Payer | Received, confirmed, or complete |
| **View confirmation status** | `PaymentStatusViewed` | System/read | State advanced |
| **Refresh status** | `PaymentStatusRefreshRequested` | System/read | A new payment was created |
| **Yes, it arrived** | `ReceiverConfirmationRequested` | Receiver | Other payments or amounts were confirmed |
| **Not yet** | `ReceiverNotYetReported` | Receiver | Failure or cancellation |
| **Confirm partial amount** | `ReceiverConfirmedPartial` | Receiver | The full expected amount arrived |
| **Check payment** | `PaymentStatusRefreshRequested` | System/read | The wallet payment was authorized by the UI |
| **Recover status** | `PaymentRecoveryRequested` | Payer/system | A replacement payment was created |
| **Try again** | `PaymentRetryRequested` | Payer | A duplicate payment intent was created |
| **Cancel** | `PaymentApprovalCancellationRequested` or `PaymentCancellationRequested` | Payer | A completed payment was reversed |
| **Review the issue** | `SettlementIssueOpened` | System/read | The disputed source item was resolved |
| **View updated balance** | `SettlementResultViewed` | System/read | Viewing caused the balance change |
| **View payment record** | `SavedRecordViewed` | System/read | Internal durable acceptance and readable record are the same event |
| **Refresh record** | `SavedRecordRefreshRequested` | System/read | The payment is retried or reopened |
| **Back to balances** | `SettlementExitRequested` | Payer/receiver | Settlement state changed |

## Closure rule

No visible payer action emits `PaymentClosed`. Closure is a deterministic backend result after the correct receiver/provider authority and exact-scope checks have been accepted.
