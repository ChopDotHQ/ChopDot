# Journey 12 — Complete Settlement

**Priority:** P0  
**Status:** V1 Golden Candidate / review pending  
**Prototype:** `v1-golden-candidate.html`

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

A payer marking a payment sent does not close it. TWINT, bank transfer, PayPal, cash, and other external/manual methods require the canonical recipient to confirm receipt unless a trusted provider result supplies an equivalent exact received/cleared result.

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

- Failure leaves the balance unchanged and offers a replay-safe retry.
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
