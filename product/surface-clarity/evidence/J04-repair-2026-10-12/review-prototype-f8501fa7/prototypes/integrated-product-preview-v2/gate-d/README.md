# Gate D integrated prototype — review candidate

Gate D adds J18 Activity/Notifications, J27 Account/Preferences and J28 shared recovery to accepted Gate C. It is a local prototype, not production authentication, notification delivery, settlement or account erasure.

## Lineage and authority

- Accepted Gate C GitHub base: `86993a3c3aca715b44bbdc235d9691ee26404a92`, tree `46bc5bfcfb729be48fcc1fc0f7b5081a075c1764`.
- This tree is byte-identical to accepted local Gate C `d94fb302afb6e878505400e3df3d36a637f1fd20`; GitHub publication changed commit metadata only.
- Frozen schema: `product-schema-v1`, `5107e64b1b2a0cb0eddd34f8235dfd6ae1d54013`, tree `ce5b82d008dfa2f48e714607e30fdb6839b8305c`.
- Frozen product authority: `4ba456e6595330e4ca8e21366e0d827f17e10881`.
- Source-approved versions: J18 v1.1 continuity, J27 v1 plus C1 consumer contract, J28 v1. `source-manifest.json` records copied bytes and registry approval hashes. Golden copies are not edited. J27/J28 state definitions are deterministically extracted without executing their synthetic truth stores in the integrated app.

## Run and use

Requires Node24 and Python3. Package into a new directory:

```sh
node scripts/package-preview-v2-gate-b.mjs /tmp/chopdot-preview-new
python3 -m http.server 8090 --directory /tmp/chopdot-preview-new
```

Open `http://localhost:8090/prototypes/integrated-product-preview-v2/index.html`.

1. Continue as guest, create a group and expense, or use the existing Gate C explicit Golden-example fixture.
2. Open Activity from Group Home or Position. Rows come from accepted expense/payment history. Open a row to its owner; Back to Activity preserves the notification read state.
3. Notifications → Mark all read changes only local delivery read state. Needs attention remains until its expense/payment is resolved by that owner. Filters and refresh cannot approve, receive or settle anything. Old payment milestones explain changes before opening the current record.
4. You opens Account. Guest participation works without account capabilities. Use the accepted Entry flow to establish a **local simulated** session. Under `?fixtures=1`, “Verified local Entry fixture” makes this test precondition explicit; it is not authentication proof or a production C1 account binding.
5. Profile, Notifications and Appearance support reversible drafts, review, explicit Save and reload. Push preference and simulated OS permission are separate. No actual notification is sent or scheduled. Appearance applies to Gate D; accepted Gate A–C Golden themes remain unchanged.
6. Security → Sign out this device returns to Entry, preserves all shared records/preferences, and guards direct B/C/D routes. No real provider session exists. This prototype supports one local session participant (`self`), not account switching or real multi-device sessions.
7. Account operations with unknown results reopen the same operation after Back/reload. Check alone cannot invent a result. Explicit test fixtures can report pending, verified no-effect or verified saved; safe retry requires no-effect plus renewed review.
8. Delete account checks live local group ownership and unresolved money, requires the exact current display name, and removes only local account working-state availability after acceptance. It retains participant references, expenses and payment history. Export (J24) and ownership transfer (J26) are honest owner boundaries, not implemented capabilities. No remote erasure is claimed.
9. Payment status → Recovery options preserves the exact payment/idempotency identity and accepted amount. The payment owner still handles receipt, cancellation, reconciliation and remaining debt. Expense save/conflict screens → Shared recovery returns to that expense owner and retained draft. Recovery cannot itself manufacture a payment or expense outcome.

Fixture controls are visible only with `?fixtures=1`. They describe deterministic external preconditions, not remote results. Tests use separate browser contexts; do not reset your normal preview storage to run them.

## Verification

```sh
CHOPDOT_TEST_NODE_MODULES=/path/to/node_modules \
CHOPDOT_CHROMIUM_EXECUTABLE=/path/to/chromium \
CHOPDOT_EVIDENCE_DIR=/tmp/gate-d-results \
bash prototypes/integrated-product-preview-v2/gate-d/run.sh
```

The runner archives the committed HEAD into a disposable directory, never cleans a working checkout, retains the full accepted A/B/C chain, runs Gate D model/browser/recovery checks and Golden comparisons at 393×852 and 430×890, and packages twice to check determinism. Playwright1.62.1 and Chromium are required. Logs capture commands and exit codes. Screenshots are paired comparisons with deliberate dynamic-data differences, not a claim of pixel equality or universal state coverage.

## Retained limitations

All domain state remains under `chopdot.preview-v2.guest`; one Web Locks writer protects it. Notification read flags and account-operation records do not form a second expense/payment outcome store. Browser data is inspectable and editable by the device owner; route guards are prototype behavior, not a security boundary against a hostile local user. Corrupt storage is reported without overwriting it. A localStorage persistence failure cannot truthfully claim an accepted result.

The immutable schema's disclosed limits remain. This integration does not certify every possible composition or all 28 journeys. Stage 5 journey families remain separate work. No real authentication, wallet signing, funds, provider selection, production storage, protected merge or production deployment is included. Future owner actions such as export/ownership transfer are labeled boundaries. No Gate D acceptance is asserted by tests or independent review: the user accepts the identified candidate separately.
