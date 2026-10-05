# Gate C integrated local prototype

J10 Overall Position → J11 Settle Up → J12 Complete Settlement continues accepted Gate B `28775726dc06b1823e231d50b4d84080a07530fb`. The frozen schema remains `5107e64b1b2a0cb0eddd34f8235dfd6ae1d54013`; frozen product authority remains `4ba456e6595330e4ca8e21366e0d827f17e10881`. Gate C acceptance belongs to the user.

## Launch

From the repository root, use an output directory that does not already exist:

```sh
node scripts/package-preview-v2-gate-b.mjs /tmp/chopdot-gate-c-preview
python3 -m http.server 4173 --bind 127.0.0.1 --directory /tmp/chopdot-gate-c-preview
```

Open `http://127.0.0.1:4173/prototypes/integrated-product-preview-v2/index.html?fixtures=1&gateC=%23page%3Dposition`.

Requires Node 24+, Python3 and a current browser with Web Locks. The delivered package is already built: serve its `preview/` directory directly. Keep the same origin/port to retain local data. Use HTTP, not `file://`. Only one writer tab is supported; close it before opening another. No account or payment credentials are needed.

## Walk through the intent choices

1. With `fixtures=1`, choose **Add Golden example** once. This adds accepted source expenses and participant identities to the same local record. It does not load a separate balance store or overwrite existing work.
2. Position → **Groups** → **Apartment** → Jeanine shows CHF 74.30. Paying that group leaves the CHF 20 Ski Trip credit open. Clearing a debt leaves the group active for later expenses.
3. Position → Jeanine shows the combined CHF 54.30 owed across Apartment and Ski Trip. Review the included sources before continuing. EUR is separate and is never netted with CHF.
4. Use **Pay part now** to choose an amount. Review the offset checkbox, exact per-source cash amounts, and **After this payment**. You can retain the Ski Trip credit or apply it. The displayed suggestion uses oldest recorded expense first; exact amounts can change its distribution. A smaller received amount follows the displayed order and limits.
5. Continue → review → Open TWINT (or another external method). The handoff is simulated and opens no payment app. Return → **Yes, I sent it** records a claim; it does not clear the debt.
6. In the separated test toolbar, switch to the exact recipient. Choose **Not yet**, **Yes, it arrived**, or **Something’s wrong** → enter the actual received amount. Receipt remains distinct from closure. **Accept exact closure** explicitly simulates the accepted result required to apply that receipt.
7. Open the resulting balances and payment record. Group Home reads the same accepted expense/payment state. A partial remainder uses a new linked payment; the completed amount is never retried. Back, reopen and reload retain the payment identity.

The toolbar simulates people and external evidence. It is not authentication or production authority. Without `fixtures=1`, those controls are absent and the app cannot independently establish external receipt or closure.

## Recovery and review

- Unknown result → Recover status keeps the same payment. A matching simulated nonexecution result permits one reviewed retry. A canonical recipient can positively reconcile an external payment. A sent claim, refresh or navigation cannot.
- Wallet is a fixed source-supported fixture: CHF 54.30 for 7.812500 DOT, with a displayed demo fee. Its separate approval, submission, receipt and closure states require matching evidence. Other amounts offer manual methods; no live quote or conversion is invented.
- Wallet disconnected, wrong account, invalid address, insufficient balance and unavailable fee block start. Offline, failed saving, unavailable record, expiry and cancellation have explicit recovery paths.
- Source issues keep payment closure blocked until the issue is resolved. Included expense mutations cannot strand an unresolved payment. Independent sources remain editable. Reversal restores only that payment's applied sources and is blocked while another unresolved payment depends on them.
- Per-group expense drafts retain their group/currency when moving between Gate B and Gate C. Accepted corrections retain expense IDs, reset affected review state and preserve prior payment history.

## Reproduce checks

Install Playwright 1.62.1 and its Chromium in a separate tools directory, then run from a committed checkout:

```sh
CHOPDOT_TEST_NODE_MODULES=/absolute/tools/node_modules \
CHOPDOT_EVIDENCE_DIR=/absolute/new-evidence-directory \
bash prototypes/integrated-product-preview-v2/gate-c/run.sh
```

Optionally set `CHOPDOT_CHROMIUM_EXECUTABLE` to a Chromium executable. The runner archives the exact HEAD into a unique temporary directory, logs commands and exit codes, executes the unchanged full Gate A/B chain plus Gate C model/browser/recovery/visual checks, compares two separately packaged outputs and removes only its own temporary directory. It requires permission to bind a localhost listener. It does not install dependencies, reset or clean the checkout, publish, or run GitHub Actions.

`source-manifest.json` and `decision-checkpoint/source-hashes.json` identify immutable Goldens and 19 referenced source files. `verify-sources.mjs` checks SHA256 and Git blob identities. Added scope/allocation controls are documented in `decisions/GC-SETTLEMENT-INTENT-01.md`. Historical checkpoint reports are superseded by that direction and the final completion evidence.

The retained Gate B recovery suite now expects its View balances and Settle links to reach the integrated group-selection screen. Its former placeholder assertions are replaced with same-group and no-payment-effect assertions, increasing coverage; the remaining suite and denominators are retained.

## Retained limitations

Single-browser localStorage, one writer, simulated participants and accepted results. No production storage, cross-device sync, real authentication, funds, signing, provider selection or notifications. No multi-recipient atomic settlement, automatic group archival, currency conversion, or Gate D implementation. Request/support handoffs explicitly state that no message was sent. The Activity surface lists these prototype payment records only. No universal state-space, screen-reader, Safari or Firefox qualification is claimed. Visual comparisons preserve Golden hierarchy/style while replacing illustrative values and showing the explicitly requested source choices; they are not pixel-equality claims.
