# Gate B integrated local prototype

This branch continues accepted Gate A `8548313791e4ef7b436ee742cd18c1fa48d74eeb`. It integrates J08 Group Home → J05 Add Expense → J06 Inspect/Correct → J07 Review/Agree/Issue. It does not grant Gate B acceptance.

## Run the preview

Prerequisite: Node 22+ to package, Python 3 to serve, and a current browser with Web Locks (tested Chromium 153). No application build, backend, credentials or account is required.

From the repository root:

```sh
node scripts/package-preview-v2-gate-b.mjs /tmp/chopdot-gate-b-preview
python3 -m http.server 4173 --bind 127.0.0.1 --directory /tmp/chopdot-gate-b-preview
```

The output path must not already exist. Open:

`http://127.0.0.1:4173/prototypes/integrated-product-preview-v2/index.html`

The downloadable preview package is already built; serve its `preview/` directory directly instead of running the packager. Keep the same origin and port to retain your local data. Do not open the HTML with `file://`.

1. Continue as guest. Start a group and add local people.
2. The accepted Gate A Add expense shortcut still works. Its Back action returns to Home. Open the group card to enter integrated Group Home.
3. Use the center Add control. Payer, participant selection, Equal/Exact/Shares, date and receipt all edit one saved draft. Back/reopen/reload retain it.
4. Save, return to Group Home, open a recent expense, inspect the split/receipt/history, then Edit or More → Delete. Accepted edits preserve the expense ID and reset affected reviews, including removed reviewers.
5. For the multi-person review loop, open the same URL with `?fixtures=1` (or `?gateB=1&fixtures=1` for an existing group). The clearly separated test toolbar selects a local person. This is not authentication. Follow attention → Looks right or Something's off → reason → optional note → Send. The owner can reply or edit; only the reviewer can resolve, reassess or withdraw the issue.

Only one writer tab can use the prototype at a time. A second tab displays a truthful block. Close the first tab and reload the second to transfer the lease. This avoids lost local history; it is not a production collaboration mechanism.

## Recovery fixtures

The optional toolbar controls offline mode, save failure, slow reads and external settlement preconditions. Changing a fixture does not create a payment or rewrite expense outcomes.

- `active`, `unknown_effect`, `open_remainder`: the first current expense's payer/other-participant pair and source ID become an unresolved external dependency. Dependent create/edit/delete fails at the effect boundary; economically independent work remains possible.
- `incomplete`: missing dependency evidence fails closed.
- `authoritative_terminal`, `reconciled_no_effect`: explicit simulated reconciliation, bound to the evaluated canonical sequence. After another accepted change, select the fixture again to obtain evidence for the new sequence. This never refreshes real payment evidence.
- Save failure is no-effect and keeps the draft/review command. Disable it and retry. Offline success explicitly means accepted on this device; no remote sync is claimed.
- Slow read shows the J06 loading state. Deleted IDs show Not found. Stale revision fixtures are exercised by the browser harness against an accepted intervening correction, then require review of both versions.

The frozen reference evaluator is copied byte-for-byte; the adapter derives current/proposed economic effects and before/after dependencies from the same canonical expense state. Its Number-based reference boundary fails closed above safe-integer range when settlement evidence is present. Expense allocation itself remains exact BigInt MoneyV1.

## Sources and scope

Immutable schema: `product-schema-v1` at `5107e64b1b2a0cb0eddd34f8235dfd6ae1d54013`, tree `ce5b82d008dfa2f48e714607e30fdb6839b8305c`. Frozen product authority: `4ba456e6595330e4ca8e21366e0d827f17e10881`. The accepted Gate A record is `ops/chatgpt-work-factory-v1:docs/integrated-preview-v2/GATE_A_ACCEPTANCE.json` (read at ops `e6f1c92b4578a6bcdbc60192b868e41a1961d4f3`). Main and older integration/preview branches were divergent; they were not used as the base.

`source-manifest.json` fingerprints the exact recovered Goldens and schema reference copies. J05 is the approved recovered full 27-state artifact. J06 was extracted from its approved ZIP; J07 decompressed from its approved XZ; J08 is its resolved candidate HTML. The packager constructs accepted J01 only in its disposable output and checks its approved SHA-256. Frozen source bytes are not regenerated in the working repository.

`model.js` owns accepted transitions. Both the legacy Gate A shortcut and Gate B call it. The existing `chopdot.preview-v2.guest` localStorage record holds the canonical group, participants, expenses, drafts, history, operation identities and external fixtures. Projections are calculated, never stored as fixture outcomes. Temporary note/reply text and route/person selection use sessionStorage and cannot change accepted facts.

`app.js` projects live state into cloned Golden screens, preserving source styles and controls. Static illustrative amounts, names, counts and dates become canonical facts. Demo-only preview links become real inputs or explicit out-of-scope handoffs. J05/J08 blanket settlement locking is replaced by the approved dependency-scoped decision. Equal shares show exact allocated amounts; display rounding never changes the partition. A one-cent remainder is not displayed as a false equal-per-person total.

## Verification

Run `bash prototypes/integrated-product-preview-v2/gate-b/run.sh` from a committed checkout. It uses a disposable archive, writes commands/exit codes and keeps the original checkout intact. It requires Node, Python 3, Playwright and a browser; it never installs dependencies silently. `CHOPDOT_TEST_NODE_MODULES` can identify an existing dependency directory. `CHOPDOT_CHROMIUM_EXECUTABLE` can identify a local Chromium executable.

- Domain tests exercise allocation, identity, permission, history, review reset, issue lifecycle, idempotency, stale edits and the settlement attack matrix.
- `property.test.mjs` runs five recorded seeds: 400 varied money cases (1,200 Equal/Exact/Shares partitions) and 60 varied lifecycle sequences. Independent conservation, partition, revision, review/issue, history and position oracles cover rejection/no-effect, retries, replay and reload. This is bounded generated coverage, not proof for every input. Failing output identifies the seed and case/round for reproduction; `CHOPDOT_PROPERTY_REPORT` optionally writes counters as JSON.
- `keyboard-qa.mjs` traverses Gate B with Tab, Shift+Tab, Enter and Space at 393×852 and 1440×1000. It checks visible control focus, route focus, repeated participant/fixture toggles, saved draft continuity, create/correct/review/issue/reply/resolve/delete, alerts and canonical outcomes. Gate A setup uses its existing mouse controls. This is basic keyboard coverage, not a screen-reader or complete accessibility audit.
- `browser-qa.mjs` tests the connected real-control flow at 393×852 and 430×890.
- `recovery-browser-qa.mjs` tests alternate payer/two-person/receipt/date, permissions, withdrawal, failure/retry, offline, loading, stale conflict and bounded exits at both viewports.
- `visual-qa.mjs` captures normal product screens and corresponding approved Goldens at both viewports, checks layout bounds and retained style properties. Separate read-only review inspects the screenshots; computed style checks do not constitute pixel equality.
- `run-gate-a.mjs` executes all three existing Gate A browser suites without reducing assertions.

`task-coverage.json` maps all 23 certified task paths to their integrated controls and test evidence. Static artifact step counts remain source-accounted; no new universal completeness claim is made.

## Retained limitations

This is a single-device, one-group, single-writer integrated prototype. Local persona selection does not establish real identity or authorization. Only owner editing is exercised; no privileged-role fixture is asserted. Gate A's demo account conversion remains a demo. Existing Gate A expenses without historical events are identified as imported rather than given invented history. Receipts are local PNG/JPEG/WebP images up to 1 MB; no upload/OCR service exists. Browser storage quota failure preserves accepted state and reports failed persistence.

No production persistence, cross-device sync, real settlement execution, signing, provider selection, notification delivery, standalone Position/Activity integration, whole-group closeout, Gate C/D, deployment or protected merge is implemented. These boundaries appear explicitly at handoffs. Only Chromium is qualified here; mobile Safari/Firefox and assistive-technology audits are not claimed. Product acceptance belongs to the user.
