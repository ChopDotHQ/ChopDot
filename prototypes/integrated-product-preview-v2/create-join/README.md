# Stage 5 · Create, invite and join (J03/J04)

This is the first bounded Stage 5 family, continuing accepted Gate D at `4561912536a598ad27d9ca8d5a9a6dde99787894`. It remains an integrated local prototype. It does not mark the family accepted or start another family.

## Try it

Open the preview host at `/prototypes/integrated-product-preview-v2/index.html?createJoin=page%3Dentry&fixtures=1`.

1. Name a group, select CHF/EUR/USD, then **Create group**. Existing groups, accepted expenses, history and group-keyed drafts remain intact. More currencies and savings retain their approved separate handoffs; this family does not implement them.
2. Choose **Invite people**. Invitation administration requires the existing verified Entry fixture. If prompted, choose Sign in through Entry, use `dev@example.com`, code `123456`, and Open ChopDot. No email is sent or account created.
3. **Add someone** creates a named pending invitation. **Share group link** creates/reuses a group-link record, which can have multiple distinct group-scoped redemptions. Links refer to this browser's canonical local records; sharing across devices is not implemented. They do not claim a remote invitation service.
4. Use **View invite as recipient (prototype)** to exercise the other side. The recipient sees only group name, inviter, count and currency. **Not now** does not join. **Join group** leads to explicit C1 consent; **Join group as guest** creates one durable group-scoped Participant.
5. **Go to group** opens integrated Group Home. **Add expense** saves into the same canonical state with exact MoneyV1 allocation and the guest Participant as author. Pending invitations are never allocation members; membership in another group does not add that person to this group.
6. Group Home → People → **Your membership** reopens the existing Participant. Back/reopen/reload preserve identity and history. After reload, saved labels provide no write authority: **Recover current proof (prototype)** → **Continue after authority check** explicitly simulates current participant-controlled proof and rotates its version. No concrete authenticator is selected.
7. **Link an account** targets that same Participant. Use matching account proof goes through Entry; this only starts a pending operation. The separate **Simulate verified durable binding** fixture represents matching proof, activation, exact durable binding and authoritative readback. Pending/unknown keeps guest authority, grants no account-only capability and reconciles the same link ID. Proven pre-effect failure is distinct from verified no-effect readback. Cancellation is pre-effect only; mismatch never merges names or people.
8. Account-backed joining also goes through Entry and a separately confirmed complete local binding fixture. Entry alone does not join, upgrade or authorize payment. The account shell remains the accepted single local owner fixture; it is not a multi-user account implementation.

The yellow controls change prototype preconditions, not production state. Inviter session/New group explicitly switch the one active local persona. Offline creation saves locally with no promise of synchronization. Offline joins/invites/links are blocked. Expire pending invite is an explicit expiry fixture, not a selected production expiration policy.

## What is verified

`bash prototypes/integrated-product-preview-v2/create-join/run.sh` runs committed HEAD from an isolated archive, retains the A–D suite, checks approved source bytes, tests the membership model, exercises actual UI interactions and recovery, compares Golden/C1 styles at the approved phone viewports, packages twice and compares outputs. Set `CHOPDOT_TEST_NODE_MODULES` to a separate installation of Playwright1.62.1, and `CHOPDOT_CHROMIUM_EXECUTABLE` if using a local Chromium. Node24 and Python3 are prerequisites. `CHOPDOT_EVIDENCE_DIR` controls an external evidence directory; the harness never cleans normal checkouts.

The frozen schema is `product-schema-v1` (`5107e64b1b2a0cb0eddd34f8235dfd6ae1d54013`), product authority `4ba456e6595330e4ca8e21366e0d827f17e10881`. `source-manifest.json` pins unchanged Golden/C1 bytes. `authority/schema-obligations.json` extracts existing relevant operations, laws and objects. J03/J04 are **not** in V1's 31 certified task paths; these flows are Golden/C1-accounted and directly tested. Adding tests does not enlarge that frozen certification claim.

`model.js` owns group/invitation/Participant/link effects in the existing `chopdot.preview-v2.guest` store. B/C project and consume that same store; no second fixture outcome store is added. `authority.js` holds explicit precondition-fixture grants and command proofs in memory, binds group, Participant, versions, command, current state, payload, scope and nonce, and rejects actor switching/replay. Reload cannot reconstruct executable grants from saved labels. This tests contract behavior; it is not cryptographic authentication, a hostile-client security boundary or distributed persistence.

Guest writes are limited to their approved expense/split input; agreement, deletion, administration and settlement require account binding and relevant existing ownership guards. No funds, signing, provider choice or real settlement is performed. B/C/D accepted legacy owner/test-person controls remain for their original scopes; participant sessions cannot use their owner impersonation selectors or read other-group/account records. The prototype has one active local persona and one writer per origin, not simultaneous remote members.

## Fidelity and integration effects

- Original J03/J04 screen DOM and styles are copied without alteration; dynamic names, currency, counts, status and money project canonical state. Laboratory wrappers are removed for product mode.
- Currency selection retains the draft and returns to explicit Create, following J03-D01's Name → Currency → Create sequence. Static Golden currency links are fixture navigation, not a product mutation rule.
- C1's approved guest consent, participant continuity, pending binding, mismatch, unknown, distinct failure/readback and recovery screens replace the historical immediate-join success shortcut.
- Group Home's existing empty actions use its approved `btn dark`/`btn soft` classes. People adds the now-implemented invitation/membership handoff; other Stage 5 people/request/history families remain outside this change.
- Reopened creation success shows live canonical facts. No earlier expense or accepted allocation is rewritten when someone joins. Owner presentation uses the local owner's approved display name, with Group owner as the default recipient-facing label.
- Reload/recovery and fixture controls are labeled prototype mechanics. Real authentication, durable remote invitations/storage, full account linking infrastructure, expiry policy, production security and later families remain unimplemented.
