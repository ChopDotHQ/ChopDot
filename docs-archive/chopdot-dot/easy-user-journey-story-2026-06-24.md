# ChopDot Easy User Journey Story

Status: `active-test-story`
Date: 2026-06-24
Owner lane: `friend-pilot product readiness`

## Purpose

This story defines the plain-English journey we test with agents before calling ChopDot friend-ready.

The goal is not to prove every backend component. The goal is to watch whether normal people can move through the whole group-money loop without technical coaching:

```text
join -> capture -> pay or contribute -> confirm -> resolve blockers -> close -> return to record
```

## One Sentence

Mina starts ChopDot for a real group money moment, Leo/Nina/Omar each act from their own device, money movement is handed to the right payment method, Mina confirms what matters, and the group closes with a record they can understand later.

## Cast

| Person | Default role | What they care about |
| --- | --- | --- |
| Mina | Organizer / receiver / treasurer | Who still needs to act, what can close, and what record remains |
| Leo | Friend / contributor / payout receiver | What do I personally need to do now? |
| Nina | Friend / contributor | Can I finish my part without learning the whole app? |
| Omar | Late payer / delay case | Can the group record truth without blame? |
| Riley / Casey / Jordan | Emergency pot actors | Privacy, dignity, and confirmation |
| Alex / Sam / Priya | Community fund actors | Approval, release, and handoff clarity |

## Journey A: Profile And First Entry

User story:

```text
I open ChopDot for the first time. I should understand that I can start with a group record, and that wallets/payment setup are optional until money movement or proof needs them.
```

Pass signals:

- guest entry is understandable;
- wallet/provider setup does not feel mandatory for low-risk actions;
- returning to `/pots` is obvious;
- no visible Polkadot terms are required to understand the product.

Friction signals:

- user thinks they need a wallet before trying the app;
- user cannot tell whether they are starting a pot, joining one, or connecting a payment method;
- primary action copy is abstract.

## Journey B: Pay-Moment Spend Card

User story:

```text
I just paid for dinner. I want to split it while the context is fresh.
```

Expected path:

```text
Pots -> open dinner pot -> I just paid -> receipt/payment capture -> choose friends -> choose how friends pay -> create split/pay links
```

Pass signals:

- first useful shared state can be created quickly;
- receipt capture reduces typing;
- payment choice feels like handoff, not product architecture;
- ChopDot does not pretend the receipt or payment method is confirmation.

Friction signals:

- user must understand the full group status before creating the split;
- payment copy introduces technical terms;
- the user has to manually type receipt line items before ChopDot has tried to capture/import anything;
- receipt checklist feels like extra work rather than less work;
- after creating split, user does not know what to send to friends.

## Journey C: No-App Friend Link

User story:

```text
Leo receives a link. He should see one job, pay outside ChopDot, mark paid, and know he is waiting for Mina.
```

Expected path:

```text
/pay -> payment handoff -> Mark paid -> waiting for confirmation
```

Pass signals:

- no account setup before the low-risk action;
- amount and receiver are obvious;
- `Mark paid` is clearly not the same as received;
- the page does not expose admin controls.

Friction signals:

- friend sees too many controls;
- friend cannot tell who receives money;
- friend thinks ChopDot moved the money;
- friend cannot tell whether they are done.

## Journey D: Receiver Confirmation

User story:

```text
Mina receives money outside ChopDot and confirms only the matching share.
```

Expected path:

```text
/confirm -> Confirm received -> matching share closes -> group status updates
```

Pass signals:

- receiver sees payer, amount, and confirmation boundary;
- one confirmation does not close unrelated open items;
- group status updates in normal language.

Friction signals:

- receiver has to inspect raw audit data;
- confirmation appears before claim/payment context;
- the product over-explains internal state.

## Journey E: Savings Circle

User story:

```text
The group runs a recurring round. Members mark contributions, Mina confirms, Omar records delay, payout is handled, and the round closes.
```

Pass signals:

- payout order is visible;
- delay is a normal path;
- treasurer knows who needs confirmation;
- round closeout is readable.

## Journey F: Emergency Pot

User story:

```text
The group coordinates urgent support without exposing sensitive details.
```

Pass signals:

- contributor can act without seeing private details;
- approvals and release are separate;
- recipient confirmation is clear;
- exported receipt is redacted by default.

## Journey G: Community Fund

User story:

```text
A small group records contributions, approves a spend, pays outside ChopDot, confirms receipt, and hands off a period record.
```

Pass signals:

- admin, contributor, approver, payer, and receiver roles are legible;
- approval does not pretend payment happened;
- release and confirmation remain separate;
- next treasurer/reviewer can read the record.

## Journey H: Agent Wallet Settlement Evidence

User story:

```text
When testnet money actually moves, ChopDot should treat it as support for that exact share, not as full product truth.
```

Pass signals:

- finalized recipient+amount movement clears the matching leg;
- weak/mismatched movement stays "marked paid" only;
- closeout still checks delays, approvals, privacy, and remaining rules;
- emergency receipt does not leak sensitive data or tx refs.

## Review Method

For each journey, collect:

- first screen screenshot;
- action screenshot;
- after-state screenshot;
- visible primary action;
- what the agent thought the next step meant;
- dead ends, stale controls, or duplicated states;
- friction score from 1 to 5;
- proposed simplification.

## Promotion Rule

Agent runs can show coverage and obvious friction.

They become human-style evidence only after the operator reviews screenshots and agrees:

```text
The reaction makes sense.
The next action was obvious.
The money model was not misleading.
The record is readable later.
```

## Loop Guardrail

Any future ChopDot loop should fail a proposed flow if:

- "receipt-first" means the user has to manually add receipt items as the normal path;
- internal words like evidence, rail, adapter, kernel, obligation, or raw JSON appear in normal user screens;
- a template or mode only changes labels without changing the next action or reducing typing;
- a payment link, receipt, or transaction makes the whole group look closed before the receiver can understand what happened.
