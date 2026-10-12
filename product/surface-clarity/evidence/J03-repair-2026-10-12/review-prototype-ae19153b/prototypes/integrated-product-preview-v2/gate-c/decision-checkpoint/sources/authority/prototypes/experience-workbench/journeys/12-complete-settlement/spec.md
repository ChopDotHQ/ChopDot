# Journey 12 — Complete Settlement

**Priority:** P0  
**Status:** V1.1 Golden Candidate / review pending  
**Prototype:** `v1.1-continuity-candidate.html`

## User goal

Understand what happened after a payment was started, know whether anything still needs action, and see the exact resulting balance without mistaking “sent” for “complete.”

## Entry

Journey 11 hands off one exact payment scope containing:

- canonical payer;
- canonical recipient;
- exact amount;
- one currency;
- source groups and payment items;
- selected payment method;
- stable payment and idempotency identity.

## Journey boundary

Journey 11 owns selection and authorization preparation:

`Person → Scope → Currency → Amount → Method → Review → Start or record payment`

Journey 12 owns what follows:

`Started → Sent or submitted → Waiting → Received or cleared → Confirmed → Closed`

A method may skip stages that do not apply, but the product may never present an earlier stage as a later one.

## Core external/manual path

`Return from payment app → Did you send it? → Marked sent → Waiting for recipient → Recipient confirms → Balance updates → Settlement complete → Saved payment record`

A payer marking a payment sent does not close it. TWINT, bank transfer, PayPal, cash, and other external/manual methods require the canonical recipient to confirm receipt ; the wallet exact-match exception does not let a payer self-confirm an external/manual payment.

## Core wallet path

`Approval requested → Provider result accepted → Submitted → Checking → Exact payment received → Exact payment item closes → Balance updates`

The visible action that requests wallet approval does not authorize or close payment. Only a verified provider/integration result may advance authorization, submission, receipt, or finality.

An exact finalized wallet transfer may close only the exact payment item whose payer, recipient, amount, currency, selected method, source items, expiry, payment identity, and replay/idempotency checks match.

## Partial payments

A partial payment closes only its confirmed amount.

Example:

- original balance: CHF 54.30;
- payment confirmed: CHF 20.00;
- remaining balance: CHF 34.30.

The remainder preserves the original source lineage and stays open for a later settlement.

## Resulting balance

Journey 10 remains a derived read model. Journey 12 does not mutate a displayed balance directly.

After an exact payment item closes, the backend recomputes:

- person balance;
- affected group balances;
- Overall Position;
- remaining or settled status.

The user sees the recomputed result, not a manually edited total.

## Saved payment record

A completed or partially completed payment produces a user-readable Saved record containing the exact amount, currency, payer, recipient, method, source groups/items, relevant timestamps, confirmation source, and stable record reference.

The Saved record is distinct from internal durable event acceptance. It must remain retrievable through an ordinary authenticated web route or API using a stable ChopDot record identifier. Optional content-addressed or provider metadata may supplement it but may not be the only retrieval key.

## Failure and recovery

- A verified non-executed failure leaves the balance unchanged and may enable a safe retry. An unknown timeout requires recovery first.
- Unknown result tells the user not to start another payment.
- Recovery checks the existing payment identity rather than creating a replacement.
- Offline views show the last saved status and remain non-authoritative until reconciled.
- Duplicate taps reopen the current payment instead of creating another.
- A recipient reporting “not received” keeps the payment open.
- A source expense questioned after payment starts prevents dependent items from closing until resolved.
- A reversal reopens only the exact affected item and recomputes the resulting balance.
- A delayed Saved record does not undo a completed payment; the record can be refreshed independently.

## Product language

Visible states use:

- Sent
- Waiting for confirmation
- Received
- Payment failed
- Settlement complete
- Partial payment complete
- Payment reversed
- Still checking

The normal UI does not expose architecture or provider terminology.

## Approved Journey 11 contract carried forward

- one person and one currency per settlement;
- exact scope lineage;
- explicit authority for each transition;
- idempotent retries;
- deterministic verification;
- replaceable payment integrations;
- no wallet secrets, private keys, or provider credentials in ChopDot domain data;
- future agents may prepare or recommend, but cannot expand scope, approve themselves, confirm receipt, or close unrelated items.

## Review questions

- Are Sent, Waiting, Received, and Complete unmistakably different?
- Is recipient confirmation clear without feeling accusatory?
- Does the external/manual path remain calm?
- Does the wallet path explain uncertainty without exposing technical detail?
- Is the partial remainder impossible to miss?
- Are failure and recovery safe and understandable?
- Does the Saved record contain enough human-readable proof?
- Does completion return the user to a trustworthy updated balance?

## Approval rule

If approved:

1. freeze as Golden Journey #10;
2. promote Payment Status, Recipient Confirmation, Settlement Result, Partial Remainder, and Saved Payment Record patterns;
3. mark the in-app money loop complete;
4. continue only after a separate instruction.

## V1.1 continuity pass — review pending

This is a focused correction of the existing 67-screen candidate. No screen was added and no approved Golden was edited. The inherited stylesheet is byte-identical; previously unstyled balance-return rows now reuse the existing compact method-row and icon classes.

### One payment context through every exit

All status, balance, record, history, review-handoff and browser-Back paths carry the same payment ID, payer, recipient, original currency, selected method, source items and current accepted result. Navigation cannot reset the outcome or select a default TWINT fixture.

Result fixtures: full TWINT/bank/wallet payment of CHF 54.30 leaves CHF 0.00; cash payment of CHF 30.00 to Nina leaves CHF 0.00; confirmed CHF 20.00 leaves CHF 34.30; confirmed CHF 40.00 leaves CHF 14.30; the reversed wallet payment reopens CHF 54.30. These are isolated review examples, not the user's account data.

### Refresh is a read, not a receipt

A payer refresh reads accepted payment history. With no accepted result, it stays on the payer's waiting screen with the original balance open. It never opens the recipient's controls and never manufactures confirmation. The recipient acts separately as the canonical recipient. After receipt is accepted and the backend closes the correct amount, a subsequent read may show the resulting balance. View/Back/Done/Refresh do not cause closure.

### Unknown timeout is not failure

An execution timeout, disconnect, missing callback or unknown outcome requires reconciliation against the existing payment ID before any execution retry or method change. A transport error alone cannot enable Try again. Repeated refresh, timeout, retry request or reconnect must not emit another execution command. A retry becomes eligible only after a trusted, scope-matched result proves the prior attempt did not execute. Receipt/partial receipt/closure instead routes to its existing result. The eligible retry consumes eligibility once and reuses the payment and idempotency identity.

### Prototype boundary

The small local continuity model demonstrates these rules; it is not a payment backend and performs no network calls or transfers. The separate workshop panel can switch the test viewpoint or supply an explicitly labelled test result. Those controls are not normal app permissions. Backend authorization, receipts, verification, event acceptance and durable history remain requirements of the approved Journey 11 contract, not security guarantees supplied by this HTML.

Optional session storage remembers the demo only. It is not an implementation of durable payment storage. The ordinary web Saved-record retrieval contract remains unchanged.

<!-- JOURNEY_DECISION_HISTORY:START -->
## Decision history

**Coverage:** Selected source-supported decisions, backfilled 2026-09-06 from commit `f403b02d05a50d13f556b3edfb949f92b24488a9`. Not a complete conversation or alternatives audit. Earlier candidate labels in the spec body describe its drafting stage; the registry/approval sources below establish the recorded status. Revisit triggers below are maintenance notes added now, not claims about past discussion or permission to redesign.

### J12-D01 — Outcome continuity and recovery before execution retry

**Decision:** Keep sent, waiting, received and complete distinct. Preserve the actual payment method, person, source items and resulting balance on every exit. Payer refresh is read-only; unknown timeouts require recovery before execution retry.

**Why:** The recorded goal explicitly avoids mistaking sent for complete. The V1.1 correction prevents navigation from resetting outcomes to a default TWINT example or manufacturing receiver confirmation.

**Alternatives:** Retry from a transport timeout alone, payer self-confirmation and a replacement payment created by refresh are explicitly rejected.

**Tradeoffs:** Partial receipt leaves a traceable remainder; reversal reopens only the affected item. A delayed Saved record must not undo payment completion. Session/demo storage is not production durability.

**Revisit when:** A return loop changes method/amount, refresh opens receiver controls, or execution retries without a trusted non-executed result.

**Approval / version:** v1.1 — Golden #10 / design-approved, as recorded at the source commit. This documentation update does not create or expand approval. TYPO-01 shared typography/readability remains deferred.

**Sources:** [Spec: failure and recovery](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/12-complete-settlement/spec.md#failure-and-recovery); [Spec: v11 continuity pass  review pending](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/12-complete-settlement/spec.md#v11-continuity-pass--review-pending); [Spec: refresh is a read not a receipt](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/12-complete-settlement/spec.md#refresh-is-a-read-not-a-receipt); [Spec: unknown timeout is not failure](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/journeys/12-complete-settlement/spec.md#unknown-timeout-is-not-failure); [version and approval registry](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/registry/journeys.json). [Explicit approval](https://github.com/ChopDotHQ/ChopDot/blob/f403b02d05a50d13f556b3edfb949f92b24488a9/prototypes/experience-workbench/registry/approvals/12-v1.1.json).
<!-- JOURNEY_DECISION_HISTORY:END -->
