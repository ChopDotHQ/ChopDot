# Journey 21 — State Inventory

Definition-stage inventory for V1. No review candidate exists yet.

| State | Purpose | Write / execution authority |
|---|---|---|
| Wallet overview · disconnected | Explain why a wallet may be needed without blocking non-wallet ChopDot use | none |
| Wallet overview · connected | Show masked account, exact network, capability/availability and return context | none |
| Connect · choose wallet | Select an available wallet/provider | none |
| Wallet unavailable | Explain missing/unsupported wallet and safe alternatives | none |
| Connect pending | Wait for provider approval without claiming connection | provider prompt only |
| Connect accepted | Establish the exact connected account/network session | session only |
| Connect rejected / cancelled | Return without side effects | none |
| Connect timeout / unknown | Re-read provider/session state before retry | recovery only |
| Switch wallet/account review | Explain which connected identity will change | none until provider switch |
| Switch network review | Explain exact required network and preserved calling context | none until provider switch |
| Switch pending | Wait for wallet/provider result | provider prompt only |
| Switch accepted | Revalidate exact account/network before continuing | session only |
| Switch rejected / failed / unknown | Preserve prior valid session when possible; recover before retry | recovery only |
| Action handoff · exact review | Show exact asset, amount/scope, destination/network and calling journey before signature | none; upstream authority remains authoritative |
| Waiting for wallet signature | Make explicit that ChopDot is waiting on the wallet | wallet prompt only |
| Signature rejected / cancelled | Return to caller with no submitted action | none |
| Signature timeout / wallet closed | Reconcile whether a signature/submission exists before retry | recovery only |
| Signed · submission pending | Distinguish signature from network acceptance | submitted action only |
| Submission unknown | Query/reconcile transaction identity before any retry | recovery only |
| Submitted · pending finality | Show network-confirmation state without claiming completion | network action only |
| Finalized | Return verified chain fact to owning Journey 12/17/etc. | accepted network result |
| Reverted / failed | Preserve exact failure and safe recovery path | none beyond failed transaction |
| Insufficient fee balance | Explain inability to submit without changing the requested action | none |
| Insufficient transfer asset | Explain insufficiency without silently changing amount/asset | none |
| Account changed during review | Invalidate stale review and require exact re-review | none |
| Network changed during review | Invalidate stale review and require exact re-review | none |
| Disconnect | End local connected-wallet session without deleting history or saved destinations | session only |
| Offline | Block connect/sign/submit and preserve safe return context | none |
| Loading | Preserve shell without inventing wallet state | none |
| Load/provider error | No inferred connection/finality; safe retry or return | none |

All candidate states must preserve Journey 11/12/14/17/20 authority boundaries and TYPO-01 deferral.
