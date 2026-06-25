# Competitive Gap Decisions

Status: `decision-packet`
Date: 2026-06-23
Depends on:

- [competitor-app-research-lane-2026-06-23.md](./competitor-app-research-lane-2026-06-23.md)
- [competitor-scenario-scorecards-2026-06-23.md](./competitor-scenario-scorecards-2026-06-23.md)

## Decision

ChopDot should not compete as a generic Splitwise clone, and competitor parity is not the target.

The competitor set is the floor. The product target is documented in [chopdot-10x-experience-thesis-2026-06-23.md](./chopdot-10x-experience-thesis-2026-06-23.md):

```text
10x group-money coordination across Catch, Management, Payout, and History,
using the right rails underneath.
```

The product should compete on:

```text
capture at the money moment
-> shared status
-> payment/receipt evidence
-> human confirmation
-> closeout record
```

That keeps the original ChopDot thesis intact:

```text
friction down + trust up + future optionality
```

## What To Copy

| Source pattern | Copy this | Why |
| --- | --- | --- |
| Splyt | Receipt-first flow where friends pick their own items without needing the app | Best dinner split lesson; reduces manual entry and social math |
| Kittysplit | Link-first no-account participation | Strongest onboarding challenge to ChopDot |
| Splittr | "Who is next to pay" language | Clearer than internal status labels |
| Tricount / Splitwise | Simple group balance visibility | Basic expectations; ChopDot cannot be worse here |
| TWINT / Venmo / Revolut | Rail-native request and payment status language | Users trust payment apps for money movement |
| Cino | Pay-and-split-at-source ambition | Future adapter direction if partner/regulatory path exists |

## What To Avoid

| Anti-pattern | Why |
| --- | --- |
| Adding a visible mode choice that only changes name/defaults | The loop runner already rejects this; it adds friction without changing the job |
| Rebuilding a generic post-hoc ledger | Mature competitors already own this mental model |
| Treating payment movement as group truth | ChopDot's advantage is claim, evidence, confirmation, and closeout separation |
| Making emergency/community flows feel like expense apps | Their value is privacy, approvals, dignity, and handoff |
| Making Polkadot visible before the user need is clear | Native infrastructure should reduce friction or increase trust invisibly |

## What ChopDot Must Beat

| Area | Competitor/null to beat | Bar |
| --- | --- | --- |
| Dinner receipt split | Splyt / Splitwise Pro / TWINT split | Under 30 seconds to first useful shared state, with receipt/item capture or payment handoff |
| Group trip | Splitwise / Tricount / Splid | Setup must feel lighter, or closeout/history must be clearly more valuable |
| No-account friend participation | Kittysplit / Splyt | Friend can act from link without learning ChopDot first |
| Payment request | TWINT / Venmo / Revolut | ChopDot must not make payment harder; it should add shared state and later record |
| Late payer | Chat + reminder / Splitwise / payment app request | Record delay must feel respectful and useful |
| Return later | Screenshot/chat archaeology | Receipt must tell what was confirmed, still open, and why it can be trusted |

## Build Implications

### P0: Build From The 10x Thesis, Not From Competitor Parity

Competitors should tell us what not to be worse than. They should not define the next product shape.

The next build must improve at least one of:

- time to first useful shared state;
- no-app friend completion;
- rail-specific payment handoff;
- confirmation clarity;
- return-to-record clarity.

### P1: Stop Expanding Modes Without Capture Proof

Savings circle, emergency pot, and community fund are strategically right, but the next generic expense work must fix Catch.

Required product outcome:

```text
The person who just paid can create useful shared state faster than chat + calculator + payment request.
```

### P2: Receipt / Checkout Capture Spike

Build or spike one of:

- receipt photo -> item checklist -> people pick items;
- payment request link -> ChopDot payment claim;
- spend card -> pay+1 capture;
- rail-specific handoff for TWINT/Venmo/Revolut-style flows.

Acceptance bar:

- one person can start from "I just paid";
- friend gets a link and understands their next action;
- receiver can confirm what actually arrived;
- closeout stays separate from payment evidence;
- first useful state under 30 seconds in pilot.

### P3: No-App Participant Path

Copy the strongest market lesson from Kittysplit/Splyt:

```text
The friend should not need to understand ChopDot to do one action.
```

Required user actions:

- see what this is;
- see their amount or item;
- mark paid / pick items / confirm received;
- know whether they are done.

### P4: Keep Polkadot Native As Invisible Infrastructure

Competitors do not sell blockchain. They sell less awkward money coordination.

Polkadot-native work remains valuable when it supports:

- signed participant events;
- Statement Store sync;
- Bulletin redacted receipts;
- Asset Hub or Coinage-style payment evidence;
- `.dot` hosting;
- portable identity/sign-in.

But none of those should appear as the main user promise.

## Product Spine Decision Packet

Decision: run 10x-thesis-informed Capture + no-app participation work before another broad UX rebuild.

Owning loop: `product-spine`

User job: one person paid or organized shared money; the group needs to know who owes, who acted, what remains open, and what record they can trust later.

Pillar(s): Catch, Management, Payout, History

Current friction:

- ChopDot can explain group truth but still risks being slower than mature split apps at the first capture moment.
- Friend participation can feel heavier than link-first competitors.
- Payment rail-native flows are faster when everyone shares the same rail.

Trust gap:

- Competitors often have payment requests or balances, but weaker closeout/confirmation semantics.
- ChopDot has better semantics, but must make them feel normal.

Proposed change:

- Prioritize receipt/checkout capture, no-app participant action, and rail-specific handoff.
- Keep savings/emergency/community modes, but do not use them to hide weak first capture.

Strongest null option:

- Dinner: Splyt or TWINT/Venmo/Revolut request.
- Trip: Splitwise/Tricount/Splid.
- No-account split: Kittysplit.
- Complex group fund: WhatsApp + spreadsheet + bank app.

Expected user-visible outcome:

- A payer can start the record at the purchase moment.
- Friends can act from a simple link.
- The receiver can confirm.
- The group can close a readable receipt.

Verifier:

- E2 hands-on competitor walkthroughs.
- ChopDot agent pilot replay against the same scenarios.
- First useful state under 30 seconds for dinner/pay moment.
- No-app participant can complete one action without coaching.

Stop condition:

- If ChopDot is slower than the strongest null and does not create a visibly better trusted record, narrow the surface.

Evidence paths:

- `docs/chopdot-dot/competitor-app-research-lane-2026-06-23.md`
- `docs/chopdot-dot/competitor-scenario-scorecards-2026-06-23.md`
- Future E2 screenshots/traces under `artifacts/chopdot-competitor-research/`

Surface delta:

- visible choices added: none yet;
- user action gained: pending next build spike;
- workflow effect: next work should improve first capture and no-app friend action;
- friction added: none in this E1 packet;
- confusion removed: separates generic expense tracking from ChopDot's actual wedge;
- evidence of removed friction: pending E2;
- keep / change / remove: keep modes; change next build priority toward 10x capture, no-app participant action, and right-rail handoff.

Verdict: `spike`

## Next E2 Run Sheet

Run hands-on walkthroughs for:

1. Splyt dinner receipt split.
2. Splitwise trip group.
3. Tricount or Splid trip group.
4. Kittysplit no-account web link.
5. TWINT split/request in Swiss context, if available.
6. Venmo/Revolut/Cino only if region/device access allows.

Then replay the same jobs in ChopDot and update the 9/10 scorecard with:

- `beats strongest null`;
- `ties strongest null`;
- `loses to strongest null`;
- `not comparable because ChopDot serves a different job`.

## 2026-06-23 Local Product Replay

Status: `local-browser-pass`

What changed in ChopDot:

- Group expense capture now starts from `I just paid`.
- Receipt checklist capture exists before manual amount entry, so receipt context can reduce typing.
- The payer picks a rail in the same flow instead of treating payout as a later abstraction.
- No-app `/pay` links show one action only and hide the group admin/status board.
- `/confirm` remains the receiver's separate close-the-share step.

Competitor comparison after this pass:

| Scenario | Strongest null | ChopDot result after local pass | Current read |
| --- | --- | --- | --- |
| Dinner receipt split | Splyt / Splitwise Pro | Receipt checklist is now present, but OCR/item picking is still assisted/manual | `ties on structure`, `loses on mature OCR until proven` |
| No-app friend action | Kittysplit / Splyt | `/pay` is now single-purpose with no account setup before marking paid | `ties local browser bar`, needs real friend review |
| Swiss pay request | TWINT | Rail handoff is clearer and TWINT remains the money rail | `complements`, not a replacement |
| Cross-rail groups | Splitwise + payment app | ChopDot now binds receipt/evidence, claim, confirmation, and later record | `beats on trust semantics if users accept the flow` |
| Return later | Chat screenshots / ledger history | Closeout/receipt semantics remain ChopDot's differentiated layer | still needs human return-to-record review |

Decision update:

```text
The next product work should not add another mode. It should make receipt-first capture faster, add stronger receipt extraction, and run real-user/friend review against the updated flow.
```
