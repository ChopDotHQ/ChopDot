# Release browser scope

The public-beta browser umbrella is `playwright.release.config.ts`. It collects
current production-entrypoint and bounded host-capability tests. An excluded
historical file is not counted as a pass.

## Current replacement proof

`named-mode-multi-account-production-entrypoint.spec.ts` uses separate Product
Accounts, verified contacts, signed invitation acceptance, canonical event
journals, and the current TruAPI chat adapter. Its normal-pot journey covers:

- organizer-only group creation and explicit signed membership;
- an initial payment request;
- a late expense and immutable request refresh;
- the exact updated amount on the payer route;
- payer-signed `SHARE_MARKED_PAID` events;
- receiver-signed `SHARE_RECEIVED` events; and
- converged encrypted journals on both accounts.

## Explicit exclusions

| Files | Reason | Replacement or action-time proof |
|---|---|---|
| `membership-bootstrap-ui.spec.ts` | Compatibility alias imports the canonical Batch 2 spec; Playwright rejects collecting both. | `candidate-batch2-actual-participation.spec.ts` |
| `deferred-shared-action-restart.spec.ts`, `general-shared-action-delivery.spec.ts`, `polkadot-host-real-ui.spec.ts`, `polkadot-host-wallet-settlement.spec.ts` | Historical product authority uses raw shared-session secrets and/or typed-name membership. Restoring it would violate current authority and URL-secret rules. | Current multi-account production-entrypoint proof; low-level host transport/readiness tests remain collected. |
| `guest-payment-return.spec.ts`, `late-expense-after-request.spec.ts`, `live-payer-sync.spec.ts` | Historical shared-money setup adds a member by typing a name instead of signed acceptance. | Current normal-pot multi-account journey plus request-link and delivery unit tests. |
| `guest-payment-return-live-dot.spec.ts` | Requires an already promoted public URL. | Run with `playwright.live-dot.config.ts` after promotion. |
| `dot-host-preview.spec.ts` | Requires the byte-frozen `dist-dot-host` server and its dedicated base URL. | Run with `playwright.dot-host-preview.config.ts` after `build:dot-host`. |

The release umbrella continues to collect low-level Statement Store quota,
notification-budget, native-readiness, host money-boundary, and five-person
transport stress tests. Those tests measure bounded host capabilities; they do
not grant product membership or money authority.
