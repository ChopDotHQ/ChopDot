# Spend Capture Ladder

Status: `active`
Created: 2026-06-24
Owner lane: `CAPTURE`

Purpose: keep the Spend Card idea from drifting into a form, wizard, pot clone, or card-programme fantasy.

## Plain-English Model

```text
Spend Group lives on.
Pot records close.
Spend Card captures new transactions for that group.
```

### Spend Group

A persistent group spending context.

Examples:

- Friday Crew
- Zurich flat
- Italy trip crew
- Community kitchen team

It remembers:

- people
- default split rule
- preferred payment app
- privacy and confirmation rules
- current open record, if one exists
- closed record history

### Pot

A specific settlement record.

Examples:

- Zurich dinner, CHF 120
- Italy train tickets
- June groceries
- Friday drinks round

It can close. Closing a pot does not kill the group context.

### Spend Card

A payment-time capture instrument for a Spend Group.

It is not a bank card, stored balance, escrow, or wallet product.

The user meaning is:

> Use this group when paying.

The system meaning is:

> Capture the payment moment, attach it to the Spend Group, create or update the right pot record, split it, and drive pay/confirm/close.

### Captured Transaction

A money event observed at purchase/payment time.

It may include:

- payer
- amount
- currency
- merchant or context
- payment app
- receipt/photo/link/import
- transaction reference, if available
- confidence level
- associated Spend Group

It must not silently close the whole pot. It may create or update the matching payment item according to the level below.

## L0-L4 Capture Ladder

Each level is valid. The product must label them correctly and never pretend a lower level is a higher level.

| Level | Name | User experience | What ChopDot records | Product posture |
| --- | --- | --- | --- | --- |
| L0 | Manual fallback | User pays, later types amount/context. | Manual spend record. | Works, but not the hero. |
| L1 | Assisted capture | User chooses group at pay time, scans/pastes/imports/enters amount. | Spend Group + amount/context + split. | Current near-term baseline. |
| L2 | Bound handoff | User starts payment from Spend Card; payment app opens with group/context/reference. | Spend session + split + payment handoff state. | Near-term hero. |
| L3 | Provider/webhook capture | Payment provider reports matched payment event back to ChopDot. | Matched transaction can mark exact item paid/received according to rules. | Partner/native acceleration. |
| L4 | Issued/delegated card | Real card or delegated spend instrument emits transaction events automatically. | Transaction appears from card/programme stream. | Later partner/compliance track. |

## User Jobs By Level

### L0 Manual Fallback

```text
I already paid, and nothing was captured, so I need to add it quickly.
```

One action: `Add amount`

Use when:

- cash happened
- receipt is gone
- payment app cannot be linked
- user is fixing history

Do not market this as Spend Card.

### L1 Assisted Capture

```text
I am paying now, and I need ChopDot to capture enough context to split this correctly.
```

One action: `Use group`

Then ChopDot asks for only the missing piece:

- scan receipt
- paste payment link
- import/share receipt
- type amount only as fallback

The group, people, split rule, and preferred payment method should already be known.

### L2 Bound Handoff

```text
I am at checkout, and I need to pay normally while ChopDot prepares the group split.
```

One action: `Pay with group`

ChopDot should:

- preload group and split
- open the chosen payment app or handoff
- create the group spend record as part of that handoff
- avoid a second "I paid" chore on the happy path where payment state is strongly matched

### L3 Provider/Webhook Capture

```text
I paid through a connected payment path, and ChopDot should recognize the matching transaction.
```

One action: none, unless review is needed.

ChopDot should:

- receive a provider event
- match amount, payer, receiver, currency, group, and time window
- update only the exact matching item
- show normal language: `paid`, `received`, `needs review`

L3 does not make unrelated group items closed.

### L4 Issued/Delegated Card

```text
I use the real group card/payment instrument, and ChopDot automatically turns transactions into group records.
```

One action: pay normally.

This requires partner/compliance readiness and must stay outside the current Model A implementation until trigger gates pass.

## Product Rules

1. A Spend Card is not a pot.
2. A Spend Card is not a form.
3. A Spend Card is not a bank card in Model A.
4. A Spend Card is a reusable group payment context.
5. A closed pot can leave behind a reusable Spend Group and Spend Card.
6. Receipt capture is an input method, not the Spend Card itself.
7. Payment evidence can update the exact matching item; it cannot silently close unrelated group state.
8. Normal UI must not expose internal words like evidence, rail, adapter, kernel, protocol, or native.

## Product Architecture Map

```text
Spend Group
  people
  split rule
  preferred payment app
  active pot id?
  history ids
  spend card ids

Spend Card
  spend group id
  default payer?
  default participants
  default split rule
  preferred payment app
  launch surfaces: app, link, QR, wallet shortcut

Captured Transaction
  spend group id
  payer
  amount
  merchant/context
  source level L0-L4
  confidence
  payment app/reference

Pot Record
  one or more captured transactions
  shares/payments
  paid/received states
  close receipt
```

## Implementation Sequence

### Step 1: Rename The Mental Model

User-facing:

- `Use group at checkout`
- `Quick split`
- `Group shortcut`
- `Pay with Friday Crew`

Avoid as primary labels:

- `Spend Card`
- `Wallet pass`
- `Launcher pass`
- `transaction evidence`

Code/docs can keep Spend Card as the internal product name.

### Step 2: Add Spend Group As The Persistent Context

Current pots already contain members and rules. The next implementation should make this explicit:

- either a `spendGroup` metadata object on pot/group records;
- or a `SpendGroup` domain object if reuse across closed pots needs clean ownership.

Acceptance:

- close `Zurich dinner`;
- still see `Friday Crew` as reusable for the next payment;
- new spend creates a new pot record or appends to an active one according to group policy.

### Step 3: Rebuild Spend Card As A Capture Instrument

Entry should be:

```text
Friday Crew
Use at checkout
```

First screen should already know:

- group
- people
- split rule
- preferred payment app

Only missing amount/context should be captured.

Acceptance:

- no first screen that asks the user to manually construct a split;
- no top-level `I just paid` replacement for the normal pot/add flow;
- receipt/photo/link/import are accelerators, not required ceremony.

### Step 4: Make L1 And L2 Green Before L3/L4

L1 must prove:

- scan/paste/import/manual fallback creates the right group spend record;
- the user can do it in under 30 seconds;
- friends understand their one action.

L2 must prove:

- group/payment handoff starts from the Spend Card;
- handoff creates the record as part of the payment moment;
- no separate "mark paid" chore is required when a strong matching payment state is available;
- weak or missing payment state falls back visibly.

### Step 5: Add L3 As A Replaceable Adapter

Candidates:

- Firma webhook
- W3S Pay / T3RMINAL style checkout event
- Coinage lab
- Asset Hub/Product SDK payment reference

Acceptance:

- matched provider event updates only the exact item;
- failed/timeout/duplicate events show `needs review`;
- privacy-sensitive details stay out of normal receipts.

### Step 6: Keep L4 Explicitly Partner-Gated

L4 is not current product until:

- issuer/programme partner exists;
- legal/compliance owner exists;
- fraud/dispute flow exists;
- users demonstrably demand "single tap pay and done" after L1-L3 are tried.

## Tracking Board

| Level | Current local status | Next proof |
| --- | --- | --- |
| L0 | Partially present through manual expense/add amount flows. | Keep as fallback; stop making it the hero. |
| L1 | Partially present through receipt/link capture, but current UI drifted into a flow. | Rebuild around Spend Group context and one missing input. |
| L2 | Partially present through pay/confirm links and payment handoff; not yet true "group checkout instrument". | Make Spend Card start the handoff and create/update group record in one motion. |
| L3 | Lab paths exist: webhook-lite, W3S/Coinage-style parsing, PAS evidence. | Promote one provider/webhook path behind normal UI language. |
| L4 | Research only. | Do not build until partner/compliance gates pass. |

## Required Tests

For every future Spend Capture change:

- screenshot test: real app, no dashboard/lab/protocol feel;
- agent test: Mina/Leo/Nina/Omar on separate browser contexts;
- L-level assertion: feature declares L0, L1, L2, L3, or L4;
- state assertion: matching payment can update only the exact item;
- close assertion: pot closes only when required items are paid, confirmed, delayed, waived, or annotated;
- persistence assertion: closing a pot does not delete the reusable Spend Group shortcut.

## Falsifiers

Stop and simplify if:

- the screen asks users to build a split before a useful payment action;
- the user sees `Spend Card` but cannot explain why it is different from a pot;
- the user has to understand the capture ladder;
- receipt scan becomes the product instead of one input method;
- the feature adds more steps than normal add expense;
- tests pass but screenshots look like a process console.

