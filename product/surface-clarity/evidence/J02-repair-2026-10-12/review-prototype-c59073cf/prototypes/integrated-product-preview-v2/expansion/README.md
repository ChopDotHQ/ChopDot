# Stage 5 remaining families — local integrated prototype

This successor continues J03/J04 at `0f1565a8285e2fc8b4330bbc6b7f29d727982e52`, following accepted Gates A–D. It adds J09, J13–17, J19–26. Engineering readiness and user acceptance are separate. It changes neither Product Schema V1 nor the frozen product authority.

## Launch and navigate

From the repository root:

```sh
node scripts/package-preview-v2-gate-b.mjs /tmp/chopdot-my-preview
python3 -m http.server 4173 --bind 127.0.0.1 --directory /tmp/chopdot-my-preview
```

Choose a new output directory: packaging refuses to overwrite an existing one. Open `http://127.0.0.1:4173/prototypes/integrated-product-preview-v2/index.html?fixtures=1`. Keep one writer tab per origin. Another tab is read-only until the writer releases its lock. State belongs to this browser/origin; a different preview origin will not copy it. Closing/reopening or reloading retains accepted local state, not a production durability guarantee.

Start with **Continue as guest**, create a group, add local people and an expense. Open the group card to reach integrated Group Home. Account-only families require the existing Entry demonstration: use `dev@example.com`, code `123456`, and **Open ChopDot**. Entry represents a verified local precondition; it sends no email and implements no real authentication. Invitation recipients and C1 account binding remain separate, explicitly controlled J04 proof fixtures; matching names do not bind identities.

The collapsed **Prototype journeys** tray connects implemented owners without replacing their main approved controls. Group Home has Group settings, Savings and Insights. You/Account has Payment methods, Wallet, Scan QR, Export and Storage. People and settlement history lead to their own records. A deep link selects a view; it does not create account, membership, payment or sharing authority.

To open a remaining-family owner directly, use `?fixtures=1&expansion=` followed by an encoded query such as `family%3D16%26page%3Dlist`. Direct links still require the same current session and source access.

| Family | Practical task | Acceptance and recovery meaning |
| --- | --- | --- |
| J09 People | Open actual group roster, inspect a person, administer invitations or remove a member. | Current membership/ownership is rechecked. Individual debt, dispute and unresolved payment block removal even when the net is zero. J04 owns joining and identity binding. |
| J13 Request | Select the current payer, currency partition and actual open source items; review the exact request and note. | A request is not a payment. Creation/withdrawal do not change debt. Delivery failure retries delivery; unresolved results reconcile the same request operation. |
| J14 Receive / Share | Choose an owned eligible receiving method, review its audience and scope, create a private share, inspect/copy/stop it. | Audience, method version, expiry, source and caller are rechecked before disclosure/copy. Stopped/stale references cannot revive through Back. Payment-specific shares hand back to the same payment; generic sharing returns to You. |
| J15 History | Inspect Complete, Partial, Waiting, Failed, Reversed and Cancelled records. | Exact original/confirmed/open amounts remain distinct. Partial remaining debt opens its exact owning Gate C partition. History never starts a payment itself. |
| J16/J17 Savings | Create a goal/workspace, add money, inspect positions, withdraw your available position or record a returned contribution. | Selected people create pending J04 invitations, not automatic Participants. Only explicit confirmation fixtures add accepted events. Shared actions require external finality and the configured group rule; the UI does not manufacture approval. A return retains the original event. |
| J19 Insights | Change the 30/90/365-day range and inspect current authorized sources. | Read-only, exact totals remain separated by currency/exponent. Undated sources and unverified coverage are disclosed; no invented comparisons, trends or trust ranking. Offline views are cached. |
| J20 Methods | Add/edit/remove Bank, TWINT, PayPal or Wallet receiving details; choose eligibility and preference. | Stored locally only after explicit acceptance. Lists mask fields. A receiving address is separate from a wallet connection. Ownership/provider validation is a fixture boundary. |
| J21 Wallet | From a prepared Gate C Wallet payment, connect the inert wallet fixture and review that exact caller. | Only the approved CHF 54.30 → DOT 7.812500 quote fixture is supplied. Connection, signature, submission and finality are distinct. Unknown results block new actions and reconcile the original ID. No money changes until exact finality is explicitly handed to Gate C; received is separate from accepted closure. |
| J22 QR | Scan through simulated permission Allow/Not now, retry a denied/unavailable camera, or type a local reference. Recognize an existing person/invite/private share and explicitly hand off. | No real camera, external URL navigation or automatic effect. Recognition rechecks current access, audience and exact settlement source scope. `chopdot-demo:v1:person:<id>` represents an existing local identity. The 32 approved inert J14 receiving matrices represent only their matching current local shares. |
| J23 Import | Select a real local file or paste bounded JSON; inspect checksum, records, participants, exact allocations, conflicts and explicit self-reference choice before confirming. | One new group only, no existing-group merge. Imported identity remains unverified and historical; it never replays payments or activates membership/account authority. Exact duplicate/no-new-group outcomes are stated. |
| J24 Export | Review included/excluded source records and exact artifact bytes, Create, then download. | Artifact creation and browser download request are separate. Actual downloaded bytes are tested; destination, external delivery and durability are not claimed. |
| J25 Storage | Inspect the local storage boundary, export recovery data or preview missing-record recovery from a local file. | Current/newer/removed truth is retained; inaccessible groups are not revived. Savings events, wallet/receiving authority and unresolved operations are excluded, so this is not a full-state backup. No provider, sync, encryption or remote persistence is implemented. |
| J26 Lifecycle | Rename, change the future expense default currency, archive/restore, transfer ownership, leave or explicitly delete an eligible group. | Existing MoneyV1 records keep their currency/exponent. Savings asset currency is fixed. Archive keeps history/outstanding positions. Transfer requires an existing active member; it grants no account/payment authority. Leave and delete check individual obligations. Delete additionally requires archived sole ownership, typed name and final review. |

Expand **Fixtures** to test offline, known failure, unknown result, explicit verified no-effect/accepted readback, external finality and the group rule. These controls are visible only with `fixtures=1`. Wallet additionally has visibly inert connection/signature/network results. The QR permission source already specifies simulation; **Demo camera unavailable** is a fixture, not an OS permission command. Prepared actions may be cancelled before effect; pending/unknown actions must reconcile their original reference. Reload/reopen preserves that distinction. User-controlled labels are never authority.

## Reproduce the evidence

Prerequisites: Node24+, Python3, Playwright1.62.1 and Chromium. Install tooling separately; do not install it into or clean a normal user worktree. From a checkout of the implementation commit:

```sh
CHOPDOT_TEST_NODE_MODULES=/absolute/path/to/node_modules \
CHOPDOT_CHROMIUM_EXECUTABLE=/absolute/path/to/chromium \
CHOPDOT_EVIDENCE_DIR=/absolute/path/to/new-evidence \
bash prototypes/integrated-product-preview-v2/expansion/run.sh
```

The harness archives committed HEAD into a uniquely owned temporary directory and cleans only that directory. It runs retained A–D and J03/J04 checks first, then the remaining-family domain tests, source/derivative checks, normal regeneration, duplicate packaging/diff and real browser interactions at393×852 and430×890. Command logs record exit codes. An early failure is a failure, not a pass for later checks. It neither pushes nor runs GitHub Actions/Cypress nor starts a server that remains after the test.

`source-manifest.json` binds29 unchanged copies and3 deterministic derivatives to approved source paths. `verify-sources.mjs` checks all32; `extract-definition-states.mjs` regenerates the approved J24–26 screen data. The domain suites test permissions, exact MoneyV1, stable operation identity, recovery, current-version validation, privacy and history. Browser suites test actual controls, native file selection/download, Back/reopen/reload and no-effect boundaries. Separate security/reconstruction receipts bind tested file hashes; a receipt for an earlier snapshot does not clear changed bytes.

## Contract, fidelity and retained limitations

- Immutable schema: `product-schema-v1` at `5107e64b1b2a0cb0eddd34f8235dfd6ae1d54013`, tree `ce5b82d008dfa2f48e714607e30fdb6839b8305c`. Frozen Golden/C1/decision authority: `4ba456e6595330e4ca8e21366e0d827f17e10881`. Follow that schema's `V1_USAGE_GUIDE.md`, generated construction packet and referenced sources when tracing an operation/law. Original copied authority bytes and schema contract copies are unchanged.
- All families consume one canonical `chopdot.preview-v2.guest` state. Gate B expenses/revisions/issues, Gate C settlement records, Gate D account preferences, J04 membership and remaining-family accepted events share lineage. Group Home projects accepted underlying records; fixtures do not maintain a second outcome store.
- Approved source hierarchy, labels, control meaning and recovery are retained with canonical names, money, counts and status. Necessary integration effects are explicit: post-sign-in Add uses the canonical Gate B editor and returns via Group Home; Savings invitations remain pending under C1; generic sharing returns to You; J23 adds one new group while J25 has bounded missing-record recovery; wallet finality enters received before accepted closure; adjacent owners live in a collapsed tray. Old Gate D boundary screens now explicitly hand to their implemented Stage5 owners.
- Golden comparison is bounded at the established phone viewports. Exact immutable source copies and exercised styles/hierarchy do not establish pixel equivalence of every dynamic state. Not every frozen screen is claimed as a separately implemented universal route. J22's own/invite-display production QR generation, live camera acquisition, OS sharing/settings and provider interactions remain outside the local-reference prototype. J14's approved inert receiving matrices are used without generating new receiving authority.
- The V1 packet's31 certified task paths remain its exact frozen denominator. New remaining-family tests/source-accounted flows do not silently enlarge certification. No universal correctness, production readiness or new architecture stage is asserted.
- One local active persona and one writer per origin. Proof fixtures are not cryptographic authentication or a hostile-client boundary. Local storage is neither distributed nor durable production storage. No funds, real signatures, production backend, provider selection, protected merge, deployment of production behavior or schema freeze changes are included.
- Portable data excludes raw receiving details, credentials, wallet/authorization state, Savings events and in-flight operations. Imported identities are not executable authority; descriptive history never recreates accepted settlement effects. Insight coverage remains unverified. These are deliberate prototype boundaries, not hidden completeness claims.

The separate completion package records exact implementation SHA/tree, tested scopes, commands, findings/dispositions, preview provenance and limitations. Read that evidence before acceptance; this guide does not mark Stage5 accepted or start production work.
