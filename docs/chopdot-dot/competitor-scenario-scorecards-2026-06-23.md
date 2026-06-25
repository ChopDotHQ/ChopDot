# Competitor Scenario Scorecards

Status: `E1-public-source`
Date: 2026-06-23
Depends on: [competitor-app-research-lane-2026-06-23.md](./competitor-app-research-lane-2026-06-23.md)

## Scoring Meaning

This is not a final UX score. It is an E1 source-backed threat/opportunity score.

| Score | Meaning |
| --- | --- |
| 5 | Very likely strong from public evidence; must be tested hands-on |
| 4 | Strong likely fit |
| 3 | Credible but incomplete fit |
| 2 | Adjacent or partial |
| 1 | Weak or not purpose-built |
| `?` | Needs direct walkthrough |

## Scenario 1: Dinner Receipt Split

User job:

```text
One person pays the restaurant bill. Friends need to pick items, repay, and avoid awkward math.
```

| Product | E1 score | Why | ChopDot implication |
| --- | ---: | --- | --- |
| Splyt | 5 | Public copy centers on uploading a receipt, turning it into a checklist, no-app friend participation, and Venmo/Cash App reimbursement. | This is the direct benchmark for receipt-first dinner capture. |
| Splitwise Pro | 4 | Public/support material indicates receipt scanning/itemization exists in mobile Pro flows. | Basic manual split is not enough; receipt capture matters. |
| TWINT | 4 in Switzerland | Official pages support splitting a payment/request from transaction or home flow. | If all friends are Swiss/TWINT users, ChopDot must add record/confirmation value. |
| Venmo | 4 in US | Official support supports purchase splitting and group expenses. | For US friend groups, payment rail and split ledger can merge. |
| Revolut | 3-4 | Transaction-level split and group bills are strong inside Revolut. | Bank-native split threatens ChopDot where everyone shares Revolut. |
| ChopDot after 2026-06-23 local pass | 4 | Receipt checklist, checkout evidence, rail choice, one-action pay link, and receiver confirm are now in the real app flow. OCR/item picking remains assisted/manual. | Push receipt extraction and real friend comprehension before claiming it beats Splyt. |

Decision:

```text
Dinner split only wins if ChopDot captures the receipt or payment moment faster than "pay then Splitwise/Splyt/TWINT."
```

## Scenario 2: Trip To Italy From Zurich

User job:

```text
Friends travel together across currencies, record hotels, trains, meals, groceries, and settle later.
```

| Product | E1 score | Why | ChopDot implication |
| --- | ---: | --- | --- |
| Splitwise | 5 | Strong group/trip positioning, multi-currency and custom split reputation; mature default mental model. | This is the strongest post-hoc trip competitor. |
| Tricount | 5 | Public copy explicitly targets trips, shared costs, payment requests, photos, offline, multi-currency, and free/unlimited use. | ChopDot must be simpler or more trustworthy, not just broader. |
| Splid | 5 | Public copy emphasizes offline groups, sync option, and 150+ currencies. | Offline travel is a real threat; ChopDot needs graceful low-connectivity behavior. |
| Settle Up | 4 | Strong traveller/flatmate group expense positioning and synced visibility. | Competes on "good enough" group ledger. |
| Splittr | 4 | Simple add-as-you-go travel/household expenses and "who is next to pay." | Good language model for next actor. |
| Kittysplit | 4 | No registration, web link, anonymous browser participation. | Big threat against ChopDot onboarding friction. |
| ChopDot current | 3-4 | Stronger closeout/history, weaker public evidence for simple travel capture. | Must prove one-week return and closeout are worth the extra structure. |

Decision:

```text
Trip mode should not become a separate heavy template. It should be a pot setup that immediately improves capture, status, and return-to-record.
```

## Scenario 3: Checkout / Pay Moment

User job:

```text
Capture the split when money is actually moving, not hours later.
```

| Product | E1 score | Why | ChopDot implication |
| --- | ---: | --- | --- |
| Cino | 5 | Public positioning says the card/payment splits and pays at the same time, so nobody fronts the full bill. | Strongest future model; high dependency/regulatory burden. |
| Splyt | 5 | Receipt upload and no-app friend item selection is explicitly pay-moment adjacent. | Copy the no-app receipt checklist pattern where possible. |
| TWINT | 4 | Split/request is inside a trusted Swiss payment rail. | In Switzerland, payment request is a strong null. |
| Venmo | 4 | Purchase split and group expenses sit inside a social payment rail. | US rail-native use may beat standalone app friction. |
| Revolut | 4 | Transaction selection from bank activity is low-friction. | Bank-native capture is hard to beat for in-network groups. |
| ChopDot after 2026-06-23 local pass | 4 | Spend Card now starts from `I just paid`, combines receipt/check-out capture, rail choice, people, pay links, and confirmation. | Validate first useful shared state under 30 seconds with real people. |

Decision:

```text
The checkout wedge remains right, but only if the first useful action takes under 30 seconds and creates a better later record.
```

## Scenario 4: Late Payer / Exception

User job:

```text
Someone is late or cannot pay. The group needs truth without social escalation.
```

| Product | E1 score | Why | ChopDot implication |
| --- | ---: | --- | --- |
| Splitwise | 4 | Mature IOU/reminder mental model. | Good enough for casual "you owe me." |
| Venmo | 4 | Payment requests and group summary make pending dues visible. | Strong where payments happen in Venmo. |
| TWINT | 4 | Official request flow includes pending requests and reminders. | Strong Swiss payment reminder null. |
| Revolut | 4 | Group Bills includes reminders. | Strong bank-native reminder null. |
| Tricount / Settle Up / Splid / Splittr | 3 | Good balance visibility; less explicit social exception handling from public evidence. | They may be enough if groups only need balances. |
| ChopDot current | 4 | Delay notes, blockers, organizer queue, and closeout-with-open-items semantics are a product strength. | This is a strong wedge if the UI feels respectful and not bureaucratic. |

Decision:

```text
ChopDot can win on exceptions if "record delay" feels humane, not like a compliance workflow.
```

## Scenario 5: Closeout / Trusted Record

User job:

```text
Return later and know what the group agreed happened.
```

| Product | E1 score | Why | ChopDot implication |
| --- | ---: | --- | --- |
| Splitwise / Tricount / Settle Up / Splid / Splittr | 3 | Balances/history exist, but closeout as a signed/group-readable record is not the main public promise. | Their weakness is ChopDot's History pillar opportunity. |
| Kittysplit | 3 | Link-based shared event can be revisited; no-registration is strong. | Good web-access benchmark; closeout semantics unclear. |
| Venmo / Revolut / TWINT | 2-3 | Payment history is strong, but group narrative/receipt is rail-specific. | Rails prove movement/request, not the whole group chapter. |
| ChopDot current | 5 on semantics, 3-4 on UX | Product has receipt/closeout/redaction semantics; first-time comprehension still needs testing. | This is the real differentiation if the screen is simple. |

Decision:

```text
Do not hide closeout. Make it the trusted return object, but only after users understand the normal flow.
```

## Scenario 6: Savings Circle

User job:

```text
Recurring contributions, payout order, delays, and round closeout.
```

| Product | E1 score | Why | ChopDot implication |
| --- | ---: | --- | --- |
| General split apps | 1-2 | Not positioned for payout rotation, recurring group obligations, or missed contribution policy. | This is a real ChopDot wedge if not framed as expense splitting. |
| Payment rails | 2 | Can move/request money; weak on circle policy and round state. | Rail references can support claims, not own the circle. |
| ChopDot current | 4 | Has mode/state/confirmation/receipt structure. | Must make the first run feel like a normal group round, not a control board. |

Decision:

```text
Savings circle should be treated as a first-class ChopDot mode, not benchmarked against Splitwise as if it were a trip ledger.
```

## Scenario 7: Emergency Pot

User job:

```text
Coordinate urgent support with privacy, approval, confirmation, and a redacted record.
```

| Product | E1 score | Why | ChopDot implication |
| --- | ---: | --- | --- |
| General split apps | 1 | Not purpose-built for privacy-sensitive support. | Avoid public donor-wall and public proof mistakes. |
| Payment rails | 2 | Can collect or request money, but privacy, approval, and redacted record are not central. | Good for payment movement only. |
| ChopDot current | 4 | Redaction and approval semantics are in place locally. | Needs user trust, privacy copy, and no-overexposure UX. |

Decision:

```text
Emergency pot is not a splitting-app clone. Its benchmark is dignity, privacy, and clarity under stress.
```

## Scenario 8: Community Fund / Treasurer Handoff

User job:

```text
A group manages contributions, approvals, releases, and a clean handoff to the next treasurer or reviewer.
```

| Product | E1 score | Why | ChopDot implication |
| --- | ---: | --- | --- |
| Splitwise / Tricount / Settle Up | 2-3 | Can track group expenses but are not approval/handoff systems. | They cover ledger basics, not governance-lite closeout. |
| Payment rails | 2 | Can move money, request money, or show transaction history. | Payment history is not approval history. |
| ChopDot current | 4 | Approval/release/receipt separation exists. | Must simplify the screen so handoff does not require training. |

Decision:

```text
Community fund should compete against WhatsApp + bank account + spreadsheet, not only against Splitwise.
```

## Overall Competitive Read

| Product area | Current ChopDot position | Immediate product bar |
| --- | --- | --- |
| Basic expense tracking | Behind mature competitors | Do not over-invest unless tied to capture/pay/confirm/history |
| Receipt capture | Improved to assisted/manual receipt-first capture | Add real OCR/item extraction and real-device review before claiming dinner-split strength |
| No-app participation | Local browser parity with Kittysplit/Splyt-style single-purpose link | Run human/friend review on the one-action `/pay` and `/confirm` flows |
| Payment rail-native split | Behind TWINT/Venmo/Revolut where all users share the rail | Integrate/hand off; do not pretend to replace them |
| Confirmation semantics | Stronger than most competitors | Keep but make it feel natural |
| Closeout/history | Strong potential differentiator | Make it readable and useful after the event |
| Savings/emergency/community modes | Strong differentiated surface | Keep coordination-first and privacy-safe |
