# Journey 13 — Request Money

V1 · Candidate #13 · Review pending. Prototype only; not Golden.

## Position and source of truth

Journey 09 V1 is Golden #12. Its approved policy is owner-only removal when the person has no open items in that group, preserving past records and other memberships. Its original HTML is unchanged. The separate freeze passed exact-head workbench gate #54 at `db9f34b8ad8fc21bb2dbf3d7c914df5c94935a16` before J13 work began.

J13 is next in the existing registry. Canonical goal: **Ask someone to pay without awkward coordination.** Entry: Overall Position, group, or person. Exit: request sent or pending. Journey 14 — Receive / Share Payment Details follows in the registry order.

The candidate is a focused continuation of a person/balance handoff, not a new global tab. Default: Marc → Zurich Weekend → CHF 30.00. The copied Journey 09 fixture model is the source of the people, memberships, amounts and source-item identifiers. No approved HTML, source fixture or shared typography is edited.

## Main path

Request amount and scope → optional note → Review request → Send request → Request created / delivered → Return to the same person and group.

The composer keeps recipient and amount fixed to the initiating balance. “What this covers” explains the source groups. The note is optional, limited to 160 characters, and shown as literal text in the recipient preview. Sending is an explicit second action after review; returning to the composer retains the note.

The default is a private in-app request. It does not share banking details, publish a wallet address, upload contacts, create a public link or open an external messaging app. No bank, wallet or notification service is integrated. The review shows the requester's existing fixture preference: TWINT for CHF; Wallet for DOT. That is a suggestion, not authorization or a locked payment method.

## Exact scope and amounts

- Marc: CHF 30.00 in Zurich Weekend; CHF 125.40 across Apartment, Zurich Weekend, Ski Trip and Geneva Day.
- Sam: CHF 91.10 across the three CHF groups; DOT 2.400000 separately from Hackathon.
- Jeanine: nothing due in Zurich Weekend; across shared groups **Dev owes Jeanine CHF 54.30**, so this is a settlement handoff, not a request to her.

A request binds requester, payer, recipient, one currency, integer amount, explicit display scale, source item IDs, source group IDs, source versions, optional note, private audience and the original return context. The six-decimal DOT fixture is a display/read-model convention, not a claim about chain atomic units. Journey 11's adapter must resolve exact payment units and revalidate the current balance.

No approximate conversion, editable arbitrary amount, cross-currency sum or unrelated group's balance becomes a request. Item/version or membership changes invalidate a pending create; the user sees the old and current amounts and must review again. An issue blocks only requests dependent on that item.

## Candidate policies for approval

**One active request per overlapping source scope.** A second request containing any of the same items for the same payer/currency opens the existing request instead. This includes a group request followed by a broader all-groups request. A different note is not a new debt or a way around the duplicate check. Separate currencies remain independent.

**No automatic reminders.** This candidate creates one deliberate request; there are no recurring nudges, deadlines, penalties or “mark paid” shortcuts. Notification and preference integration remains future work, including Journey 18.

**Withdrawal stops a request, not the underlying balance.** The requester can review and withdraw an active request. The accepted record remains as withdrawn, its original payload stays intact, and all expense and membership data remains unchanged. Withdrawal is blocked while payment is in progress; a payment/version race forces a current-state review. A withdrawn request cannot subsequently be delivered by the mock delivery service. Already delivered messages cannot be recalled; their detail must show the latest status in production.

These request policies are proposed by this candidate. They do not change Journey 09's approved member-removal policy.

## Creation, delivery and payment are separate

“Request created” means the request record was accepted, with delivery still queued. “Request sent” requires a separate delivery confirmation. Delivered means available in the recipient's authenticated inbox; it does not mean read, agreed, authorized or paid.

Delivery failure leaves the same request saved. Retry delivery reuses that request and returns to queued, never directly to delivered. It does not create another request.

The default happy-path demo supplies separate mock save-accepted and delivery-confirmed results after a short delay. In recovery scenarios, Check status only moves to recovering. Only an explicit simulated service result may resolve the outcome. Retry becomes available after verified non-acceptance, and retains the exact command identity and payload. The same rules apply to withdrawal.

Only a verified payment observation belonging to Journeys 11/12 can move a request to payment-in-progress or paid. The paid demo updates a separate settled-item read projection to prevent a second request, while retaining the immutable source fixture and request payload. No request action performs a transfer or changes the expense ledger.

## Navigation and failure paths

Back and return carry only navigation context; they cannot undo accepted creates or withdrawals. Returning during an unknown result resumes that unresolved command instead of opening a fresh composer. Access loss blocks old views, including Back navigation. Offline drafts retain the note in this running session; reconnection never sends automatically and clears the old review. Loading and load-error screens make no claims about request acceptance.

Adjacent Journeys 07, 09, 11 and 12 are explicitly labelled boundary previews. They preserve context but do not execute those journeys. Sharing destinations belongs to Journey 14; editing methods belongs to Journey 20. Sign-in remains Journey 01's email-code default with wallet as an alternative.

## Authority and implementation boundary

The prototype runs entirely in memory. All people, preferences, requests and results are synthetic. Full page reload resets it; this is not durable offline storage. There is no hosted delivery verification, native-device test, real notification, bank transfer, wallet call, backend, database or cross-journey execution.

Production must enforce identity, group access, exact source versions, overlapping-request exclusion and command replay protection atomically at the domain boundary. Durable command/outcome recovery and authenticated delivery receipts are required. Use the approved storage-neutral acceptance contract; a queue event, realtime update or AI-generated message is not authority to mark a request accepted or a payment paid. The backend and the payment service, not a group owner or LLM, determine accepted outcomes.

## Visual inheritance

The first stylesheet is identical to the approved J09/J01/J12 foundation; the second is J09's component stylesheet unchanged. J13 adds scoped request components only. Palette, neutral cards, rounded rows, icon stroke, title hierarchy, compact header and anchored footer are retained. TYPO-01 shared typography/readability stays deferred.
