# Journey 22 — QR Flows V1

Status: **current definition stage** after Journey 21 Golden freeze. Prototype not built yet; all V1 policies below are proposed / not-reviewed.

## Goal and route contract

**Canonical goal:** Scan, identify, join, receive, or pay using QR.

Journey 22 treats QR as a short transport and resolution layer around existing ChopDot journeys. A QR can identify a supported target or carry an opaque reference to one; scanning or displaying the code never creates membership, payment authority, receiving-detail access, wallet authority, payment completion, or a balance change by itself.

**Entry:** Invite, You, receive/share, or settlement context.

**Exit:**
- Journey 04 invite preview / join decision for a recognized group-invite reference;
- Journey 09 person detail for a recognized person reference;
- Journey 14 receiving/share detail for a recognized private receive-share reference;
- the exact originating settlement/payment context after a receiving handoff; or
- a safe cancel / unsupported / recovery return with no domain mutation.

The registry phrase **pay using QR** means a code may help resolve the receiving target used by an already-scoped payment. Journey 22 does not infer what is owed and does not execute payment. Journey 11 still owns payer, recipient, exact amount, one currency/asset, source lineage, method selection and final human payment review. Wallet execution remains Journey 21.

## Ownership and adjacent boundaries

Journey 22 owns:
- opening/closing the scanner and code viewer;
- camera-permission and camera-unavailable presentation;
- reading a code, validating its basic shape/version, classifying a supported ChopDot reference and resolving its current server-side state;
- showing a minimal typed preview before the user continues;
- rendering only an already-authorized opaque reference supplied by the owning journey, plus an own-person identity reference where explicitly invoked from You;
- preserving the exact caller and return context across scan, resolution, cancellation and recovery.

Journey 22 does **not** own:
- **Journey 04 — Invite / Join:** invite creation, group preview policy, Join / Not now consent, membership or invitation status;
- **Journey 09 — Manage People:** person/member detail, relationship state, balances or payment preferences;
- **Journey 11 — Settle Up:** payment scope, amount, method selection, authorization or execution decision;
- **Journey 14 — Receive / Share Payment Details:** creation/stopping of private receive links, recipient authentication, raw receiving-detail disclosure/copy or destination versioning;
- **Journey 20 — Payment Methods:** saved bank/TWINT/PayPal/crypto destination records;
- **Journey 21 — Wallet & Crypto:** wallet connection, account/network switching, signing, submission or finality.

A boundary preview routes into the owning Golden; it does not recreate that journey inside J22.

## V1 QR model

The first candidate supports three explicit ChopDot reference types:

1. **Person reference** — an opaque reference used to identify a ChopDot person. It may resolve to the minimum identity context needed to offer `View person`. It contains no balance, bank, payment-method or wallet-session data.
2. **Group-invite reference** — an opaque invite reference created by the owning invite flow. J22 may recognize/render it, but Journey 04 decides what pre-join group context is visible and whether the invite can be accepted.
3. **Private receive-share reference** — an opaque accepted share reference created by Journey 14. Possessing or scanning it does not confer access. Journey 14 rechecks the intended authenticated audience, destination version, expiry/revocation and disclosure scope before showing receiving details.

Older implementation notes mention payment-request QR codes and quick-add behavior. Those are implementation evidence, not approved J22 product truth, and are not promoted into V1 without an owning-journey contract.

QR payloads should be versioned and typed, but the visible product copy should stay human. Production codes use opaque high-entropy references or equivalent safe identifiers; they do not embed raw IBANs, phone numbers, PayPal identifiers, wallet secrets, private expense data, source-item lists or arbitrary executable instructions.

## Main candidate paths

### Scan → classify → preview → handoff

`Open scanner → permission/camera ready → scan → resolving → recognized target preview → explicit Continue → owning journey`

A readable QR is not automatically trusted. J22 distinguishes a supported ChopDot reference from malformed, stale, unsupported-version and external payloads before routing.

### Scan a group invite

`Scanner → resolve invite → minimal invite preview → Continue to invite → Journey 04 Join / Not now`

J22 does not join automatically. Expense details and balances stay hidden until Journey 04 says the authenticated user has joined.

### Scan a person code

`Scanner → resolve person → minimal identity preview → View person → Journey 09`

The preview is identity/navigation context, not a financial profile. A self-code is identified honestly and offers a safe return rather than fabricating another-person context.

### Scan a private receiving code

`Scanner → resolve share → audience/status check → minimal receiving-share preview → Open receiving details → Journey 14`

If the scan began inside a settlement, the exact settlement caller context remains attached. J14/J11 revalidate recipient, method, currency/asset, destination version and any network requirement before the user can continue with payment. A mismatch blocks the shortcut; J22 never swaps recipient, amount, currency, asset, destination or network to make the code fit.

### Show a QR

- **You → My QR:** render an opaque own-person identity reference. It identifies the user for a later explicit person handoff; it is not a receiving destination or payment authorization.
- **Invite caller → Show QR:** render the already-created invite reference supplied by Journey 04. J22 does not create membership or widen invite visibility.
- **Receive/share caller → Show QR:** render the accepted private-share reference supplied by Journey 14. J22 does not create the share, change its audience/expiry, or expose raw receiving details in the code.

Stopping, expiry or revocation in the owning journey must be reflected when the reference is resolved again.

## Candidate policies

1. **QR transport is not authority.** Scan/display success means only that a code was read or rendered. Every consequential action remains owned and revalidated by the relevant journey.
2. **Resolve a typed target before routing.** Do not route solely from arbitrary text/URL shape. Unsupported type/version stays unsupported rather than being guessed.
3. **Preview before consequential handoff.** Show what type of thing was found and the minimum safe identity/context needed for an informed Continue action. Do not auto-join, auto-pay, auto-share or auto-open external content.
4. **Opaque by default.** ChopDot QR payloads carry references, not raw payment details, secrets, private expenses or wallet-session data. Resolution determines current truth at use time.
5. **Possession is not access.** A scanned private receive/share reference still requires Journey 14's intended-recipient authentication and current access checks. An invite still requires Journey 04 consent.
6. **Preserve exact caller context.** Settlement, invite or receive context survives scanning, cancellation, retry and return. A scan cannot silently replace the caller's person, group, amount, currency/asset, source scope, payment method or destination.
7. **Mismatch fails closed.** Wrong person/group/payment context, stale destination, incompatible currency/asset/network or changed access blocks the shortcut and offers return/rescan; no silent substitution is allowed.
8. **External/unknown payloads are inert.** J22 does not automatically open arbitrary URLs, deep links, scripts or app intents. It gives a plain unsupported/safe-exit state unless a future reviewed contract explicitly adds an external type.
9. **Camera permission is task-scoped.** Denial, device camera absence or permission revocation leaves a clear safe exit and retry path. Camera permission is never treated as account/payment permission.
10. **Offline and network failure are honest.** A camera can read pixels offline, but an opaque reference that requires current status/authentication is not presented as resolved success without trustworthy evidence. Reconnect/retry reuses the same caller context.
11. **Duplicate scans are idempotent.** Re-reading the same code while a resolution/handoff is active is suppressed or reuses the same reference. It cannot create duplicate joins, shares, requests or payments.
12. **Expiry/revocation wins over cached presentation.** Back navigation or a previously rendered QR cannot revive an expired invite/share or stale destination version.

## Information hierarchy for V1

The scanner and each recognized-target preview should answer, in order:

1. What did ChopDot recognize — person, group invite or receiving share?
2. Who or which group is this about, using only the minimum safe context?
3. Is it current and compatible with the context I came from?
4. What will happen if I continue, and which journey owns that action?
5. Can I cancel/rescan without losing my original context?

Protocol syntax, QR encoding details and internal IDs stay out of primary customer copy.

## State coverage required before review

The complete V1 state contract lives in `STATE_INVENTORY.md`. At minimum the candidate must cover scanner entry/permission/ready/resolving, each supported recognized target, context mismatch, malformed/unsupported/expired or revoked references, duplicate-scan suppression, cancellation/return, offline/network recovery, session/access changes, code display states and loading/load error. Owner-journey success states are not duplicated inside J22.

## Prototype constraints

The candidate will remain standalone, synthetic and risk-free. It may simulate camera permission and scan outcomes deterministically for QA; it must not require access to a real camera. Rendered demo QR codes must encode inert synthetic references (for example under `example.invalid`) and cannot move money, join a real group, disclose a real destination, connect a wallet or open an external application.

No real person handle, invite, bank identifier, phone number, PayPal account, wallet address, group membership, payment, request, receiving share, camera upload, authentication session or backend write is created. Boundary previews preserve context but do not redesign approved adjacent Goldens.

The canonical `Pots / People / raised Add / Activity / You` shell and inherited icon language remain unchanged. Journey 22 does not gain a global tab. `TYPO-01` remains deferred.

## Context bundle used for this definition

- Canonical `registry/progress.json`, `registry/journeys.json` and `registry/active-candidate.json` establish J22 as current / definition / not-reviewed.
- `DESIGN_CONTRACT.md`, `WORKFLOW.md`, `REVIEW_PROTOCOL.md` and `shared/improvements.md` provide process and shared UX constraints.
- Relevant adjacent Goldens: J04 Invite / Join, J09 Manage People, J11 Settle Up, J14 Receive / Share Payment Details, J20 Payment Methods and J21 Wallet & Crypto.
- Current production `MyQR`, `ScanQR` and Scan quick-action behavior were inspected as implementation evidence only; they do not override Golden product truth.

## Review focus

The first J22 review should determine whether the scan → typed preview → owning-journey handoff is understandable without turning QR into a magic action; whether My QR is clearly identity-only; whether private receive QR access remains scoped/authenticated; whether a settlement-context scan preserves exact payment scope and fails closed on mismatch; and whether permission, malformed/external, expired/revoked, offline and duplicate-scan recovery feel calm and unambiguous.

<!-- JOURNEY_DECISION_HISTORY:START -->
## Decision history

**Coverage:** Journey 22 initialization only; no candidate UX decisions are approved or inferred.

### J22-D01 — Initialize Journey 22 from the canonical registry

**Decision:** Journey 22 becomes the current definition-stage journey only after Journey 21 is checksum-locked as Golden #21.

**Why:** Preserve sequential authority and prevent candidate implementation from outrunning the approved Golden chain.

**Alternatives:** Starting QR implementation before the J21 freeze was not authorized.

**Tradeoffs:** Definition work starts later, but authority remains auditable and deterministic.

**Revisit when:** A Builder proposes the first J22 candidate or the canonical registry is explicitly revised.

**Approval / version:** Process initialization only; J22 V1 remains unapproved.

**Sources:** [Journey registry](../../registry/journeys.json) and [review protocol](../../REVIEW_PROTOCOL.md).
<!-- JOURNEY_DECISION_HISTORY:END -->
