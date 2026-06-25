# ChopDot 10x Experience Thesis

Status: `active-thesis`
Date: 2026-06-23
Owning loop: `product-spine`
Supporting loops: `money-behavior`, `ux-shape`, `commitment-kernel`, `polkadot-native-adapter`

## Plain-English Summary

ChopDot should not ask, "Can we match Splitwise, Tricount, Splyt, TWINT, Venmo, or Revolut?"

The first versions of ChopDot already had those categories in mind. Competitors define the floor. The real question is:

```text
How does ChopDot create a 10x easier group-money experience across Catch, Management, Payout, and History, using the right rails underneath?
```

The answer is not a single feature. It is a product loop:

```text
money moment -> shared state -> right rail -> confirmation -> trusted closeout
```

## The 10x Promise

For a normal person, ChopDot should feel like this:

```text
I paid or need to collect money.
ChopDot already knows the group, amount, people, and next step.
Everyone gets one obvious action.
Money moves through the rail that makes sense.
The group can see what happened.
Later, the record still makes sense.
```

That is the 10x bar. Not more controls. Not more modes. Not more protocol language.

## Competitors Are The Floor

Existing apps already prove:

| Market pattern | What it proves | ChopDot response |
| --- | --- | --- |
| Splitwise / Tricount / Splid | People understand group balances and trip ledgers | ChopDot cannot be worse at basic status, but should not stop there |
| Splyt / receipt splitters | Receipt capture and item picking reduce dinner friction | ChopDot should adopt receipt-first capture where it materially lowers entry cost |
| Kittysplit | No-account links beat heavy onboarding | ChopDot friends should complete one action without learning the whole app |
| TWINT / Venmo / Revolut / Wise | Payment rails already own money movement in many contexts | ChopDot should use or reference rails, not compete with them blindly |
| Cino / shared-card models | Pay-and-split-at-source is the cleanest user dream | ChopDot should learn from this, while avoiding premature custody/card issuance |

The competitor lesson is:

```text
Do not build a slower version of any one app.
Build the missing operating layer between them.
```

## 10x By Pillar

### Catch

Current user pain:

- receipts, screenshots, bank transfers, chat messages, and memory are scattered;
- people forget to add expenses after dinner or during a trip;
- the person who paid carries the admin burden.

10x experience:

```text
Capture starts where the money event happens.
```

Product behaviors:

- receipt photo becomes item checklist;
- pay link or QR opens directly to the user's share;
- Spend Card starts a split before or during payment;
- chat/payment reference can create a structured claim;
- returning users see recent groups and people first.

Right rails:

- Splyt-style receipt item selection for dinners;
- TWINT/Venmo/Revolut/Wise handoff where local payment habit is strongest;
- W3S/Coinage/T3RMINAL-style payment request evidence when Polkadot host paths mature;
- Telegram/WhatsApp/chat as delivery, not product truth.

Falsifier:

```text
If first useful shared state takes longer than chat + calculator + payment request, Catch is not 10x.
```

### Management

Current user pain:

- nobody knows whether a person paid, claimed, was confirmed, or is simply late;
- group organizers become human dashboards;
- one dense view makes every role feel like an admin.

10x experience:

```text
Every person sees exactly one next action and why it matters.
```

Product behaviors:

- personal next action first;
- "waiting on" is visible without blame;
- organizer queue only appears when someone has organizer work;
- passive users see status, not controls;
- late/delay paths are humane and easy.

Right rails:

- signed event log for product truth;
- Statement Store for native multi-device sync once host path is proven;
- Supabase or local storage remains acceptable for hybrid Track 1 until native truth is ready;
- no rail may directly override ChopDot state.

Falsifier:

```text
If users need coaching to know what they personally do next, Management is not 10x.
```

### Payout

Current user pain:

- moving money happens outside the tracker;
- trackers show owed balances but not enough confidence around what arrived;
- bank/payment apps show transactions but not the group agreement.

10x experience:

```text
Money moves through the best rail for the context, and ChopDot binds it to the group record.
```

Product behaviors:

- rail handoff is prefilled with amount, recipient, and reference;
- completed rail evidence can clear the exact payment leg when recipient+amount evidence is strong;
- weak evidence creates a claim, not a confirmation;
- receiver confirmation remains clear when evidence is weak or social confirmation is needed;
- payment movement never hides unresolved group rules.

Right rails:

- TWINT in Swiss friend/payment contexts;
- Venmo/Cash App in US contexts;
- Revolut/Wise where the group is already bank-app native;
- Asset Hub DOT/USDC for crypto-native groups;
- W3S/Coinage/Product SDK payment evidence as Polkadot-native lab/adoption lane;
- cash/manual remains an honest fallback.

Falsifier:

```text
If ChopDot makes payment harder without creating better shared truth, Payout is not 10x.
```

### History

Current user pain:

- after a trip, dinner, emergency, or fund period, the record is scattered;
- people return later and cannot tell what was actually agreed or still unresolved;
- sensitive situations need redaction and dignity.

10x experience:

```text
The group gets a readable receipt of what was confirmed, what stayed open, and why the record can be trusted.
```

Product behaviors:

- closeout receipt is plain language;
- emergency receipts are redacted by default;
- unresolved items can close only with annotations;
- receipt says what it proves and what it does not prove;
- handoff to next treasurer/reviewer is first-class for community funds.

Right rails:

- local/private receipt first;
- Bulletin/cloud storage for redacted archive when appropriate;
- hash/proof anchor only for the receipt packet, not legal/payment truth;
- `.dot` hosting and dotNS when Polkadot app/host path opens.

Falsifier:

```text
If users return later and still need chat archaeology, History is not 10x.
```

## The Right-Rails Principle

ChopDot should be rail-aware, not rail-owned.

| Rail type | Job | Boundary |
| --- | --- | --- |
| Payment app / bank rail | Move money or request money | Does not define group truth by itself |
| Receipt/OCR rail | Reduce entry friction | Does not confirm payment by itself |
| Chat rail | Deliver links and context | Does not become the source of truth |
| Statement Store | Sync signed native events | Needs encryption, host proof, and replay validation |
| Bulletin/storage | Archive redacted receipts | Does not close a chapter by itself |
| Asset Hub / Coinage / W3S Pay | Provide payment evidence | Evidence only until mapped through ChopDot policy |
| Smart contract / escrow | Optional future atomicity | Must not become the v1 user promise |

The product rule:

```text
claim != evidence != confirmed != approved != released != closed
```

But the UX rule is just as important:

```text
Do not make users feel that separation as bureaucracy.
```

## What 10x Means By Mode

| Mode | 10x job | Strongest null | ChopDot 10x move |
| --- | --- | --- | --- |
| Group expense | Split and settle while context is fresh | Splyt, Splitwise, TWINT/Venmo/Revolut | Receipt/pay-moment capture + one-action friend links + closeout |
| Trip / event | Keep many expenses and commitments legible | Splitwise, Tricount, Splid, chat + sheet | Recent people, fast capture, next actor, one-week return record |
| Savings circle | Run recurring rounds without losing trust | Chat + bank transfers + memory | Round status, payout order, delay handling, treasurer confirmation, receipt |
| Emergency pot | Coordinate urgent help with dignity | Payment link + private chat | Privacy-first contribution, approval, confirmation, redacted closeout |
| Community fund | Manage contributions, releases, approvals, handoff | Spreadsheet + bank app + WhatsApp | Role-based actions, release approval, payment evidence, treasurer handoff receipt |

## Build Priorities

### P0: Pay-Moment Capture

Build the shortest path from:

```text
I just paid
```

to:

```text
the group has useful shared state
```

Candidate implementation paths:

- receipt photo -> item checklist -> friends pick items;
- Spend Card -> amount + people -> Pay now handoff;
- `/pay` or QR link -> rail handoff -> claim/evidence;
- W3S/Coinage-style QR/evidence parser in lab.

2026-06-23 local implementation evidence:

- Pot home now exposes the primary entry as `I just paid`, not as a generic expense form.
- Spend Card supports checkout/payment evidence, receipt checklist items, people, amount, and rail choice in one flow.
- Receipt evidence can reduce entry and set the split context, but it does not confirm payment by itself.
- Rail handoff status is visible as normal language: `ready to pay`, `handoff started`, `claimed`, `cleared`, `needs confirmation`, or `failed`.

### P1: No-App Friend Action

A friend should open a link and know:

- what this is;
- what they owe or need to confirm;
- which button finishes their part;
- whether they are done.

No account requirement should block the first useful action unless the action is high-risk.

2026-06-23 local implementation evidence:

- `/pay` opens to a single-purpose `Pay your share` screen.
- The friend sees only the amount, recipient, payment handoff, and `Mark paid`.
- The shared pay screen no longer exposes the group admin/audit panel.
- `/confirm` remains a single-purpose receiver action and closes only the matching share.

### P2: Rail-Specific Handoff

Implement rails as replaceable adapters:

- TWINT/Swiss request handoff;
- Venmo/Cash App style request handoff;
- Revolut/Wise-style reference/handoff where feasible;
- Asset Hub DOT/USDC evidence for crypto-native groups;
- Product SDK/W3S payment evidence when host path is real.

2026-06-23 local implementation evidence:

- Rail adapters now cover TWINT, bank, Wise, Revolut, Venmo, Cash App, manual/cash, Asset Hub DOT/USDC, Coinage lab, PayPal, and USDC-style references.
- Asset Hub and Coinage remain evidence-supporting rails only; they do not close the pot or replace receiver confirmation in the normal UI.
- Focused adapter tests cover rail status and evidence-only copy.

Verification:

```bash
npm run type-check
npx vitest run src/services/capture/KernelBridge.test.ts src/services/capture/PaymentEvidenceAdapter.test.ts src/services/capture/SettlementAdapterRegistry.test.ts src/chapter/chapterEngine.test.ts
npx playwright test tests/e2e/capture-spend-loop.spec.ts tests/e2e/capture-pay-confirm-link.spec.ts --workers=1
```

Result on 2026-06-23:

```text
type-check passed
22 focused unit/domain tests passed
4 focused capture browser tests passed across desktop and mobile projects
```

### P3: Native Truth

Continue Programme B only where it supports the 10x loop:

- Product Account sign-in reduces wallet/session friction;
- Statement Store replaces shared DB truth;
- Bulletin stores redacted closeout receipts;
- `.dot` hosting reduces deploy/platform dependence;
- payment evidence increases confidence without confusing confirmation.

## Decision Packet

Decision: raise the product target from competitor parity to 10x group-money coordination across the four pillars.

Owning loop: `product-spine`

User job: make messy group money easy to capture, act on, pay through the right rail, and close with a trusted record.

Pillar(s): Catch, Management, Payout, History

Current friction:

- competitors already cover parts of the problem;
- ChopDot has stronger trust semantics but must not expose them as extra work;
- current risk is adding product surface without reducing first-action friction.

Trust gap:

- payment rails know money movement but not group agreement;
- split apps know balances but not always confirmation/closeout;
- ChopDot can connect both if the UX stays simple.

Proposed change:

- treat competitor research as baseline/floor;
- prioritize pay-moment capture, no-app friend actions, and rail-specific handoffs;
- keep Polkadot-native work as invisible infrastructure until it reduces friction or raises trust.

Strongest null option:

- chat + calculator + payment request for simple one-off splits;
- Splitwise/Tricount/Splid for trips;
- Splyt for receipt dinners;
- TWINT/Venmo/Revolut/Wise when the group shares a rail.

Expected user-visible outcome:

- fewer steps to create useful shared state;
- clearer next action per person;
- payment movement attached to the right group record;
- readable receipt later.

Verifier:

- first useful shared state under 30 seconds for pay-moment flow;
- no-app friend completes one action without coaching;
- receiver/organizer understands confirmation state;
- group can return later and explain the receipt;
- rails stay replaceable and do not become ChopDot truth.

Stop condition:

- if the flow is slower than the strongest null and does not create a clearly better trusted record, narrow or remove it.

Verdict: `build-from-this-thesis`
