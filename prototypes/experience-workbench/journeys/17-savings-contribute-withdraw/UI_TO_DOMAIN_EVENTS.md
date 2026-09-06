# Journey 17 — UI to domain-event mapping

| Primary UI action | Event / boundary |
|---|---|
| Review contribution | `SavingsContributionPrepared` |
| I added CHF 180.00 | `SavingsContributionMarkedAdded` — not final |
| Confirm/send through external account | `SavingsContributionSubmitted` |
| Check status | `SavingsOperationStatusRefreshRequested` |
| Verified confirmation | `SavingsContributionConfirmed` |
| Review again after verified failure | `SavingsContributionRetryPrepared` |
| Review withdrawal | `SavingsWithdrawalPrepared` |
| Confirm withdrawal | `SavingsWithdrawalAuthorizationRequested` |
| Required group approval | `SavingsWithdrawalApprovalRecorded` |
| Verified removal | `SavingsWithdrawalConfirmed` |
| Returned contribution | `SavingsContributionReturned` |
| Wallet preview | Journey 21 boundary only |
| Activity preview | Journey 18 boundary only |

No UI action directly emits a final confirmation without the required verifying authority.
