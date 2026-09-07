# Journey 18 — Visual / interaction QA

Artifact SHA-256: `fafb9cc74680b59f6589979115060895b6469e9ae760c59e35971be3e31f4a3a`.

## Environment
Fresh Playwright Chromium render of the exact self-contained HTML via `page.set_content`, because direct `file://` navigation is blocked by the execution environment. Outgoing HTTP(S) requests were observed and counted; **zero** occurred.

Phone sizes:
- 393 × 852
- 430 × 890

## Executed results
- 36 hash-addressable states, including adjacent-journey/navigation previews and Demo.
- 156 deterministic model assertions across 30 scenarios.
- 72 state-layout renders: all 36 states at both phone sizes.
- 384 internal product/navigation clicks exercised: every mapped internal anchor at both phone sizes.
- 0 page errors.
- 0 console errors.
- 0 external network requests.
- Zero tested horizontal overflow.
- Header/content/footer grid separation passed in every state.
- Every visible interactive control stayed inside the horizontal viewport.
- J18 activity-row icon/copy/side-column overlap checks passed.
- J18 fact label/value overlap checks passed.

## Direct visual inspection
Reviewed the primary Activity, Notifications, All read, Waiting payment, stale-notification, access-changed, offline, mixed-currency, filter and empty states. The hierarchy remains consistent with the approved workbench: calm neutral surfaces, compact headers, strong white cards, pink only for attention, green only for confirmed positive outcomes, ordinary ink for money that is not positive completion.

The default feed deliberately emphasizes **Needs your attention** before chronological updates. Bell unread count (`2`) remains visually distinct from attention count (`3`). Mark-all-read explicitly leaves the three unresolved tasks untouched.

A non-functional search-looking surface was removed before this checksum was recorded. V1 therefore contains no dead search control.

## Interaction inspection
Primary tested routes include:
- Activity → payment waiting → Journey 12 preview → Activity
- Activity → request received → request owner preview → Activity
- Activity → expense review → Journey 07 preview → Activity
- Activity → confirmed savings → Journey 16 preview → Activity
- Activity → complete payment → Journey 15 preview → Activity
- Notifications → Mark all read → Activity
- Notifications → stale notification → current payment record preview
- Access changed → Activity without restoring private group details
- Offline → Try again / Activity
- All four filters and all bottom-navigation preview controls

## Limits
The prototype is synthetic and in-memory/hash-addressable. It does not deliver real push notifications, request device permission, persist read state, query a backend, execute payments, access wallets, move savings, or test cross-device synchronization. Adjacent journey screens are explicitly previews only.

**TYPO-01 remains deferred.**
