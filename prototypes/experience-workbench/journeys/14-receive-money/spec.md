# Journey 14 — Receive / Share Payment Details

V1 · Candidate #14 · Review pending. Prototype only; not Golden.

## Approved foundation and boundary

Journey 13 V1 is Golden #13. Its reviewed HTML is unchanged: `a22664499c4056d95a6cdeb45df85d43fd2055713e80ae8f69020469aa9bb707`. Private requests, overlapping-source protection, no automatic reminders and withdrawal preserving records/balances/memberships are approved. The separate freeze passed exact-head gate #58 at `8867905886e8f551d740849605e8b565682923b9` before Journey 14 was built.

Journey 14's registry goal is **Share the correct payment destination safely.** It starts from You, person details or a settlement. It ends at a sharing/copy/code handoff, not a receipt. Journeys 20–22 own payment-method editing, wallet connection and related funding work. Journey 15 — Settlement History is next in the registry.

This candidate adds no global navigation tab. It reuses the approved header, footer, cards, rows, palette, typography and inline icon family. All 13 Golden HTML files remain locked. TYPO-01 shared typography/readability remains deferred.

## Main experience

**Choose a saved receiving method → Review its details → Choose a person → Review sharing → Prepare private link → Show code or share link → Return to the same context.**

When entering from an existing request, the intended person is already selected. A general receiving view does not invent an amount or a request. Viewing another person's explicitly shared destination is read-only, with a direct return to payment review.

The three demo receiving methods are TWINT / CHF, Bank transfer / CHF, and Wallet / DOT / Demo network A. They are examples of replaceable implementations, not restrictions on ChopDot's future payment support. No account, email, wallet, provider session, real request or transfer is created.

## Candidate policies for approval

1. **A sharing link is private to one selected ChopDot user and lasts 24 hours.** Possessing or scanning it does not confer access. The recipient must authenticate as the selected person. The owner deliberately reviews one method before preparing the link. General receiving requires a person selection; an existing request locks the intended person. No contacts are uploaded and there is no group-wide or public share by default. A 24-hour window permits asynchronous sharing without a short countdown pressuring payment.
2. **Only the destination owner can create or stop a sharing link.** A person may view/copy another person's destination only where that person has already made it available for that payment. Seeing a destination does not give authority to republish it through another private link or edit it.
3. **Copying raw receiving details is a separate, explicit export.** The preview says what will be copied and that copies outside ChopDot cannot be recalled. Only the selected method's receiving fields are exported. The general copy does not include a requested amount, private groups, expenses, other payment methods, secrets or history. This is the alternative for people who do not use ChopDot.
4. **Stopping or expiring a link stops future access, not a payment.** It cannot recall screenshots, already copied details or external messages, and it does not cancel an existing request, authorize a payment, confirm receipt or change any balance.

These policies are proposed for Journey 14, not retroactive edits to any approved journey.

## Exact context and destination

A sharing record binds the owner, authenticated actor, one audience, destination ID/version, method, currency/asset, network where applicable, expiry, originating context, source versions and command identity. The origin's source lineage is retained internally; it is not placed in QR content, an unauthenticated link preview or a recipient-facing field list.

The fixture handoffs preserve Marc / Zurich Weekend / CHF 30.00 / `marc-zurich` from Journey 13 and Jeanine / CHF 54.30 / `ja-apartment` + `ja-ski` from the approved balance examples. The latter is the amount Dev owes Jeanine, not a request to her. Their expense/payment/membership data is never modified here.

A CHF-scoped request cannot silently switch to the demo DOT wallet. A wallet destination binds asset and network together: matching an asset ticker alone is insufficient. The displayed network must match the typed destination. No conversion, estimated balance, fee estimate or public-chain branding is introduced into the normal flow.

Any changed destination, removed method, changed request amount/items/version or revoked access invalidates the previous review. Old links do not silently start pointing at a new bank account or address. The user reviews current details again. Actual provider-specific routing validation belongs to the payment-method implementation; the deliberately invalid demo fields are not presented as valid account credentials.

## Honest status and authority

Choosing Share with Marc requests creation of the scoped sharing record. It does not claim acceptance, delivery or payment. Only the mock service's accepted result creates that record. Link-ready means prepared, not delivered. Opening the sharing preview, returning from an external share sheet, copying, scanning or opening details never confirms a payment.

For an unknown create/stop result, Check status only requests recovery. It cannot manufacture acceptance or confirmed non-acceptance. A retry is possible only after a verified not-saved result and retains the same command identity and payload. Repeated clicks cannot create duplicate links. An active matching share is reused. A different audience is a separate scoped share.

A pending operation survives leaving and returning through the handoff. Unknown results are never discarded on Back or by time alone. A verified acceptance received while the client is offline is retained; reconnection reveals its current state without creating another share. A stopped, expired or stale record cannot be revived by Back. Access loss scrubs the old destination and leaves a non-sensitive exit.

The destination schema permits only receiving fields appropriate to its method. Unexpected fields, including private-key-like extras, are rejected rather than exported. Payment credentials and wallet secrets are not receiving-detail domain data.

## Storage and implementation contract

Production acceptance and history must follow the approved storage-neutral contract: durable accepted commands and their readable records are distinct; a Saved record must be retrievable through an ordinary authenticated web storage path. Optional content identifiers are metadata, never the sole retrieval key or presumed public access. Realtime updates are ephemeral; durable outbox delivery and replay-safe outcomes must use stable identifiers. Recovery queries the existing operation.

Production must atomically validate owner authority, recipient identity, destination version, exact scope and expiry. Opaque links require high-entropy references and server-side authenticated access checks. URLs and public preview metadata must not expose raw bank/wallet details, names, group names or balances. Expiry uses an authoritative server clock. Changes to destinations invalidate old sharing access. None of these server guarantees are claimed to exist in this local prototype.

Agents may prepare a proposed share for human review. They cannot grant themselves authority, widen the recipient/audience, export additional fields, or infer payment completion. Future delegated actions require the approved exact-scope, expiry and replay controls, enforced deterministically outside an LLM. AP2/Visa/x402 and Web2/Web3 support remain replaceable implementations rather than product truth.

## Prototype behavior and limits

This prototype is in-memory and resets on full reload. The service responses are explicit simulated results. Normal preparation uses a short mock delay; the Demo menu exposes unknown, not-saved, expired, stopped, changed and offline cases. The recipient preview is a labelled owner-side demonstration, not an authenticated second browser session.

Copy calls the browser clipboard with clearly marked synthetic data only. Success appears only after the clipboard promise resolves. Failure exposes selectable text for raw details, or offers the QR for a link. Callback results do not label a newly selected destination as copied. Device sharing is a labelled preview: no native share sheet, external app or real message is opened.

QR codes are genuine encodings of reserved, inert `https://example.invalid/chopdot/receive/demo-share-N` references, not TWINT, bank or wallet payment codes. They demonstrate a ChopDot sharing link, not a provider's payment QR. They cannot be used to send money. A finite local set supports 32 sample code identities; beyond it the demo asks for a restart instead of inventing a code. Production must generate codes from its accepted record references.

No backend, database, authentication server, actual notification, payment, native-device share flow, hosted page or full cross-journey integration is implemented. Boundary previews preserve context but do not replace approved HTML in adjacent journeys.

## Review focus

Review whether choosing the person before sharing is clear, the 24-hour private link is appropriate, the QR/recipient preview is understandable, and explicit copy is enough for someone outside ChopDot. Confirm that stopping a link cannot be mistaken for cancelling a request or receiving money.

<!-- JOURNEY_DECISION_HISTORY:START -->
## Decision history

**Coverage:** Selected source-supported decisions, backfilled 2026-09-06 from commit `f403b02d05a50d13f556b3edfb949f92b24488a9`. Not a complete conversation or alternatives audit. Earlier candidate labels in the spec body describe its drafting stage; the registry/approval sources below establish the recorded status. Revisit triggers below are maintenance notes added now, not claims about past discussion or permission to redesign.

### J14-D01 — One-recipient sharing with explicit export

**Decision:** Propose a private 24-hour link for one selected authenticated ChopDot user, owner-only creation/stopping, and a separate deliberate copy export. Stopping access does not cancel a request, recall copies or change a balance.

**Why:** The source explicitly gives the 24-hour rationale: asynchronous sharing without a short countdown pressuring payment. General copy is the alternative for someone outside ChopDot.

**Alternatives:** Public/group-wide sharing by default and link possession as access authority are excluded. Raw copy is retained as an explicit export, not rejected. Other expiry durations are not evaluated in the inspected sources.

**Tradeoffs:** Authentication adds a recipient requirement. External copies/screenshots cannot be recalled. Changed destination versions invalidate prior review. The local QR encodes an inert sharing reference, not a provider payment code.

**Revisit when:** Review finds recipient selection or expiry confusing; tests reveal stale destinations, excess exported fields or confusion between stopping access and cancelling payment.

**Approval / version:** v1 — current candidate / review-pending at the recorded source commit. This entry captures the proposal stage; J14-D02 records the later approval. TYPO-01 shared typography/readability remains deferred.

**Sources:** [Spec: candidate policies for approval](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/14-receive-money/spec.md#candidate-policies-for-approval); [Spec: exact context and destination](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/14-receive-money/spec.md#exact-context-and-destination); [Spec: prototype behavior and limits](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/14-receive-money/spec.md#prototype-behavior-and-limits); [version and approval registry](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/registry/journeys.json).

### J14-D02 — Approve V1 as Golden #14 without changing the reviewed artifact

**Decision:** Approve Journey 14 V1 as Golden #14 with its private one-recipient 24-hour link, owner-only link control, deliberate external copy, exact method/currency/network context, and recovery-before-retry rules. Preserve the reviewed HTML byte-for-byte.

**Why:** The user explicitly approved the reviewed candidate after the candidate and its exact artifact had passed the Journey 14 verification. The approved experience provides a safe handoff for receiving details without implying that sharing, copying, stopping or expiry settles money.

**Alternatives:** Redesigning the flow, changing the 24-hour window, adding public or group-wide sharing, and adding new happy-path screens were not requested or authorized. Those remain possible future version proposals only when new evidence warrants them.

**Tradeoffs:** One-recipient authentication adds a deliberate step. External copies and screenshots remain outside ChopDot’s recall control. The history must therefore preserve what was shared and which destination version was used without exposing secrets.

**Revisit when:** User research shows that the recipient requirement or 24-hour duration causes material failure; security review requires a different access model; or a future payment method cannot preserve exact destination versioning and the approved authority boundaries.

**Approval / version:** v1 — design-approved as Golden #14 on 2026-09-06. HTML SHA-256 `5ce877d89157a4203a2e4a2c5fad795a4ecfabf5388dbaecb00bbf28f2f31e1d`; HTML changes were not authorized. TYPO-01 remains deferred.

**Sources:** [Journey 14 approval record](https://github.com/ChopDotHQ/ChopDot/blob/ux/experience-workbench/prototypes/experience-workbench/registry/approvals/14-v1.json); [verified candidate specification](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/14-receive-money/spec.md); [Journey 14 validation](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/14-receive-money/validation.json).
<!-- JOURNEY_DECISION_HISTORY:END -->
