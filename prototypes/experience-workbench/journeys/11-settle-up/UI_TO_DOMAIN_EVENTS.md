# Primary UI Action → Domain Event Mapping

The UI remains human. The right column is an internal implementation mapping. The complete machine-readable mapping for all candidate actions is in `UI_EVENT_MAPPING.json`.

| UI surface and action | Internal event | Authority | What it does not do |
|---|---|---|---|
| Journey 10: **Settle** | `SettlementScopeResolved` | Deterministic backend from user selection | Does not mutate Overall Position or move money |
| Journey 11: **Continue / Review payment** | `PaymentIntentPrepared` | Payer or prepare-only agent | Does not authorize or start payment |
| **Choose method** | `PaymentMethodSelected` | Payer | Does not change amount or source items |
| **Use full balance / Use CHF 20.00** | `PaymentAmountSelected` | Payer | Does not close any balance |
| **Open TWINT / Open bank app / Open PayPal** | `PaymentIntentAuthorized` then `PaymentStarted` | Payer | Does not mean sent, received or complete |
| **I've sent it** | `PayerMarkedSent` | Payer | Does not confirm receipt or close |
| **Record as sent** for cash/manual payment | `PayerMarkedSent` | Payer | Does not confirm receipt or close |
| **Approve in wallet** | `PaymentIntentAuthorized` | Payer or valid narrowly delegated actor | Does not let ChopDot or an agent self-approve |
| Provider/network reports submission | `PaymentSubmitted` | Provider/network connector | Does not close without required finality/match |
| **Refresh status** | `PaymentStatusRefreshRequested` | Read-only backend query | Does not advance state by itself |
| Provider/network reports exact finality | `PaymentCleared` | Provider/network connector + deterministic verifier | Cannot close unrelated items |
| Receiver confirms external/manual receipt | `ReceiverConfirmed` | Canonical receiver | Cannot change amount/scope or close unrelated items |
| Backend closes exact item | `PaymentClosed` | Deterministic backend | Does not mutate historical source records |
| **Try again** | `PaymentRetryRequested` | Payer, reusing original idempotency key | Cannot create a duplicate intent or transfer |
| **Cancel** before execution | `PaymentAuthorizationCancelled` | Payer | Does not mark sent or failed |
| **Review issue** | `DependentIssueReviewRequested` | Payer/navigation | Does not block unrelated payment items |
| **Ask for payment details** | `PaymentDetailsRequested` | Payer | Does not invent or store credentials in the domain model |
| **View updated balance** | `SettlementResultViewed` | User navigation | Does not itself close the payment |

## Agent rule

An agent may create `PaymentIntentPrepared`. It may create `PaymentIntentAuthorized` only when a valid delegation exactly matches recipient, amount, currency, source items, method, expiry and nonce/idempotency key. It may never create `ReceiverConfirmed` or `PaymentClosed` on its own.
