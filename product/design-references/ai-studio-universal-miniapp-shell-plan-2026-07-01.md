# AI Studio Universal Mini-App Shell Plan

Date: 2026-07-01
Status: AI Studio build prompt source
Owner: product/design

## Purpose

Use Google AI Studio/Gemini to generate a polished, clickable ChopDot mini-app
shell that covers the full product ambition, not only the current dinner loop.

Gemini should build complete local-state product flows for every surface named
here. Treat every named surface as buildable now. If a capability depends on an
external service, Gemini should implement a complete local simulator behind a
real interface and still build the complete user journey.

Codex/ChopDot remains responsible for:

- real product state
- backend integration
- payment intent matching
- scoped guest-link permissions
- receiver confirmation
- event log
- cockpit/product evidence
- tests and screenshot review

## Current Repo Truth

ChopDot's current story spine:

```text
I paid / I need to collect
-> ChopDot captures the moment
-> friends get one obvious action
-> payment is marked or recorded
-> receiver confirms what arrived
-> group closes with a readable saved record
```

Current active product context:

- P-022: Regular pot end-to-end coherence
- P-015: Friend-pilot readiness scorecard
- P-020: Chat capture agent
- P-025: Universal Chop Core security architecture

Current cockpit status:

```text
cards: 25
active or ready cards: 21
blocked cards: 1
ready for pilot: 16
journey reviews validated: 12
current app screen files: 31
mapped screens: 10
unmapped screens: 21
```

Current routed app surfaces Gemini must respect:

```text
/                       -> Pots home
/pots                   -> Pots home
/activity               -> Activity home
/people                 -> People / settlements home
/you                    -> Profile/settings home
/spend?t=TOKEN          -> Spend / receipt / payment capture
/pay?t=TOKEN            -> Friend payment link
/confirm?t=TOKEN        -> Receiver confirmation
?cid=INVITE             -> Import / join pot link
```

Current screen/component inventory Gemini must cover as product concepts:

```text
AuthScreen, SignInScreen, SignUpScreen, ResetPasswordScreen
PotsHome, CreatePot, PotHome, AddMember, AddExpense, ExpenseDetail
SpendCardScreen, CaptureHandoffScreen, CaptureConfirmScreen
CloseoutReview
SettleSelection, SettleHome, SettlementConfirmation, SettlementHistory
ActivityHome, PeopleHome, PeopleView, MemberDetail
NotificationCenter, Settings, SettingsTab, YouTab, SharePotSheet
ChapterHome for savings circle, emergency pot, community fund
```

Universal mini-app expansion rule:

```text
Core owns truth.
Adapters submit evidence.
Capabilities are explicit.
Links are scoped.
Payments are matched by intent.
Confirmation is role-bound.
Everything is event logged.
Public claims are bounded.
```

Core product decisions Gemini must preserve:

```text
Pay-moment and receipt-first capture beat generic expense forms.
Friend links must show one useful action before account setup.
Infrastructure language stays out of normal UI.
Agent or scripted success does not equal human approval.
Mini-app surfaces act through one Chop Core record.
```

## Master Product Target

ChopDot is the smallest place a group can agree on shared money, act on it,
confirm what happened, and keep a readable record.

The product must serve two levels at once:

1. Friends and participants need a fast, shame-light flow:

```text
I paid -> add/capture -> split -> friend pays -> receiver confirms -> saved record
```

2. The accountable group treasurer needs a defensible close:

```text
roles -> approvals -> exceptions -> payment status -> confirmed receipt
-> unresolved items named -> export / handoff record
```

The shell must make both feel like one product. It must not become:

- a smaller Splitwise
- a smaller Eventbrite
- a generic payment app
- a chain-first wallet
- a dashboard explaining the system
- a form builder
- an admin console
- a static concept deck

## Competitor Floor

Gemini must treat the strongest existing products as table stakes.

### Splitwise-Class Floor

The shell must match or exceed:

- groups for trips, housemates, friends, and family
- add expenses quickly
- track balances and who owes whom
- equal, unequal, percentage, and share-based splits
- simplify debts
- recurring expense support as a modeled state
- offline-tolerant local state
- cloud-sync-shaped state model
- spending totals and category summaries
- 100+ currency-ready UI model
- payment integrations or payment method handoff
- receipt scanning, itemization, search, and export surfaces

ChopDot must go beyond this by adding:

- receiver confirmation
- role-scoped links
- explicit open/delayed/waived/disputed states
- saved record that does not hide unresolved items
- optional witnessed close for higher-trust contexts

### Tricount-Class Floor

The shell must match or exceed:

- add expenses in seconds
- share a group link
- everyone can add and see expenses
- clear overview of who paid, who owes, and each balance
- flexible splits by exact amount, shares, participation, or custom amount
- settlement suggestions
- easy import from another app
- simple no-friction travel/weekend flow

ChopDot must go beyond this by making payment and closeout more trustworthy,
not just easier to calculate.

### Settle Up-Class Floor

The shell must match or exceed:

- backed-up shared expenses
- every member can see expenses
- who pays next
- minimized transactions
- offline/web app posture
- receipts as a normal user object

ChopDot must go beyond this by separating "marked paid" from "confirmed
received" and by producing a saved group record.

### Revolut / Wise / Bank-Tab Floor

The shell must match or exceed:

- create a group with currency
- invite people by link or QR
- add bill from a transaction or custom bill
- allow non-account users to join a group where possible
- mark as paid for outstanding payments
- digital-card-like "spend appeared automatically" path
- owner/member permission clarity
- multi-currency-ready UI

ChopDot must go beyond this by staying rail-neutral and no-custody by default:
payment app, bank, cash, wallet, receipt, and manual confirmation all feed the
same group record.

### Spend Card / Group Card Floor

Gemini must treat spend cards and group cards as first-class product surfaces,
not as a small receipt-capture variant.

The shell must include:

- Spend Card home for "I just paid with a card"
- "Split this spend" as the dominant action
- card-like purchase feed with merchant, amount, member, date, category, and
  status
- transaction review before saving a split
- receipt/photo/link attachment for a card purchase
- group-card setup simulator with group name, currency, members, optional
  budget, and optional spend limit
- owner view: create group spend card, invite members, set lightweight rules
- member view: see their usable group spend pass/card and recent purchases
- automatic "purchase appeared" path that turns a transaction into a pending
  split review
- decline / needs-review states: over budget, wrong currency, missing receipt,
  merchant not recognized, member not allowed
- group-card history that feeds the same pot, payment, confirmation, close, and
  saved-record flow as every other ChopDot surface

ChopDot must not become a card-management dashboard. Do not show real card
numbers, PAN, CVC, issuing promises, custody claims, banking language, or KYC
screens. The group-card path is a complete local simulator whose product job is
zero-manual-entry group spending.

### Event / Deposit / Organizer Floor

From Luma, Eventbrite, Partiful, Meetup, OpenTable, and the real workaround
stack, Gemini must include:

- invited, joined, committed, waitlisted, cancelled, no-show, checked-in states
- approval before payment capture where relevant
- refund due / refund claimed / refund confirmed states
- exception notes
- policy visibility before commitment
- lightweight social invite feel
- recurring organizer model
- fairness framing for deposits/no-shows
- QR/pass style proof of access without confusing it with payment truth

ChopDot must not become a ticketing app. It should use these patterns for
commitment state, approvals, reminders, exceptions, and closeout.

### Real Competitor

The strongest competitor is the workaround stack:

```text
event tool + payment app + chat + spreadsheet + organizer memory
```

The shell must beat that stack on:

- time to capture
- clarity of next person/action
- fewer awkward reminders
- less retyping
- safer payment status
- readable handoff
- less private-data leakage
- fewer open questions at the end

## Answer: Are Prompt 1 And 2 Enough?

No. The earlier Prompt 1 and Prompt 2 are useful warmups, but they are not
enough for the shell we want.

They cover the dinner loop:

```text
create pot -> add expense -> split -> friend marks paid -> receiver confirms -> saved record
```

They do not sufficiently cover:

- welcome and sign-on
- profile setup
- host-aware mini-app constraints
- safe guest-link entry
- mobile and desktop mode behavior
- receipt/photo/link capture
- wallet/payment method states
- failed, duplicate, wrong-currency, stale, or pending payment states
- role-aware journeys
- privacy flows
- community fund roles
- chat capture review
- transitions, gestures, and animation rules
- readiness/security checks
- screenshot/test completeness

The correct AI Studio strategy is a prompt sequence, not one mega-prompt.

## What The App Shell Must Accomplish

### Universal Shell Goals

1. Open cleanly in mobile web, desktop browser, and mini-app webviews.
2. Make the first next action obvious within three seconds.
3. Support one shared Chop record across different surfaces.
4. Hide technical host, chain, protocol, adapter, and proof language from
   normal users.
5. Keep every high-trust task focused: pay, mark paid, confirm, approve, close.
6. Show enough status to trust the record, not enough to become a dashboard.
7. Preserve safe fallbacks when host features are unavailable.
8. Include desktop review mode without turning the product into an admin panel.

### Core User Jobs

The shell must cover these jobs end to end:

1. First-time user understands ChopDot.
2. User signs in or continues as guest.
3. User creates a lightweight profile.
4. User creates a regular pot.
5. User adds friends.
6. User captures a receipt, payment link, or amount.
7. User reviews the split before saving.
8. User sends or opens a payment link.
9. Friend pays or marks paid.
10. Receiver confirms money arrived.
11. User handles pending, delayed, waived, disputed, or wrong-payment states.
12. User closes with a readable saved record.
13. User reopens saved history.
14. User runs a savings circle round.
15. User contributes to an emergency pot privately.
16. User manages a community fund request by role.
17. User sees a host-aware payment option without technical language.
18. User can recover if payment host/wallet/app is unavailable.
19. User imports or joins a pot from a scoped link.
20. User sees activity/history without reading raw logs.
21. User can search/filter records, people, payments, and saved history.
22. User can export/share a group summary.
23. User can handle event/deposit exceptions without leaving the record.
24. User can switch between mobile mini-app mode and desktop review mode.
25. User can understand whether a journey is ready, needs setup, or blocked.
26. User can review a Spend Card purchase that appeared automatically.
27. User can set up a group spend card/pass simulator for a shared group.
28. User can turn a group-card purchase into a normal split and saved record.
29. User can handle spend-card exceptions like missing receipt, wrong currency,
    over budget, merchant not recognized, or member not allowed.

## Product Card Coverage Matrix

Gemini should build the shell so every product card has a visible place in the
complete local-state product shell.

| Card | Product job Gemini must represent |
| --- | --- |
| P-001 Dinner split pay-moment capture | Capture "I just paid" without a blank accounting form |
| P-002 No-app friend payment link | Friend sees amount, receiver, and one action before account setup |
| P-003 Confirm received | Receiver confirms exact payment item |
| P-004 Close with readable saved record | Group saves a clear record with unresolved items named |
| P-005 Spend card capture path | Spend Card and group-card purchases can become a split without card-management drift |
| P-006 Savings circle round | Round contributions, delay, payout, and close |
| P-007 Emergency pot privacy flow | Private contribution and redacted record by role |
| P-008 Community fund role flow | Admin, approver, contributor, payer, receiver, reviewer views |
| P-009 Agent/humanlike journey testing | Multi-person, separate-device journeys and confusion states |
| P-010 Native session boundary | Optional proof/wallet path is invisible until useful |
| P-011 Product language cleanup | User language only in normal UI |
| P-012 Receipt capture | Photo/link/import first, correction second |
| P-013 Competitor and 10x benchmark | Same journey can be compared against competitor floors |
| P-014 Product cockpit | Dev-only cockpit/review mode, hidden from normal UI |
| P-015 Friend-pilot readiness | Ready / needs work / setup / blocked classification |
| P-016 Product resume | A handoff/resume surface for dev-only review |
| P-017 AI PM guardrails | AI suggests and pre-fills; human review before state mutation |
| P-018 Normal pot tracking | Add shared cost without dense forms |
| P-019 Mobile/desktop polish | Same journey works at 390px and desktop review |
| P-020 Chat capture agent | Chat message becomes a reviewable pending item before add |
| P-021 Friend link validation | Scoped link, no unrelated controls |
| P-022 Regular pot coherence | Full normal pot journey is one coherent flow |
| P-023 PAS test wallet payment | Wallet-shaped payment can clear exact share only |
| P-024 DOT/USDC checks | Wrong currency/funds states do not clear the wrong share |
| P-025 Universal Chop Core | Surfaces submit scoped actions into one record |

## Current Product Capabilities To Preserve

The shell should include these capabilities because they already exist in
ChopDot product truth or product evidence:

- guest mode and first-use onboarding
- email/sign-in/wallet sign-in surfaces
- create pot, import pot, invite/join links
- local/offline-tolerant state
- people and member views
- activity and notification center
- normal expense tracking
- quick add / keypad sheet pattern
- spend-card capture path
- receipt capture with review before save
- payment link handoff
- mark paid
- receiver confirmation
- settlement/payment history
- close record / saved record
- savings circle mode
- emergency pot mode
- community fund mode
- chat capture review flow
- wallet payment check states
- wrong amount/currency/needs-funds states
- desktop and mobile screenshot review mode

## Future-Standard Capabilities To Implement Locally

Gemini should implement complete local-state versions of these flows, not leave
them as labels or empty placeholders:

- recurring expenses
- recurring rounds
- default splits
- exact, equal, shares, percentage, itemized, and participation-based splits
- receipt photo, receipt import, email/forwarded receipt, and payment-link paste
- receipt confidence and correction
- search
- filters
- export / share summary
- CSV/PDF-style saved record preview
- QR invite
- QR/pass access proof
- push/reminder preview
- event/deposit policy
- waitlist / approval / no-show / refund states
- multi-currency display and currency conversion preview
- account recovery and guest-to-profile upgrade
- role-based permissions
- dual approval
- dispute / exception notes
- unread activity
- group-card local simulator
- group spend pass / member card surface
- card transaction review
- spend limits and needs-review states
- merchant/category detection preview
- dev-only journey completeness panel
- competitor benchmark replay panel

## Persona And Role Model

Use concrete named people. Every screen must be role-aware.

### Normal Pot

- Mina: organizer, payer, receiver
- Leo: friend, payer
- Nina: friend, payer
- Omar: optional observer or later payer

### Spend Card / Group Card

- Mina: organizer, owner, card payer
- Leo: member, card payer, owes a share
- Nina: member, non-card payer, later reimburses
- Omar: treasurer/reviewer for group-card exceptions

### Savings Circle

- Mina: treasurer
- Leo: contributor
- Nina: delayed contributor
- Omar: payout recipient or reviewer

### Emergency Pot

- Riley: organizer
- Casey: contributor
- Morgan: contributor
- Taylor: approver
- Jordan: recipient

### Community Fund

- Ana: admin
- Ben: contributor
- Priya: approver
- Sam: payer
- Jo: receiver
- Mia: reviewer

### Accountable Treasurer

The economic buyer is the accountable group treasurer: the person who needs the
record correct, closed, and defensible. The UI should still be friendly for
casual friends, but treasurer-grade closeout, export, roles, and handoff are
part of the shell.

## State Model Gemini Must Implement Locally

Gemini should implement local reducer state that can represent:

```text
Chop / pot statuses:
pending_review, active, collecting, settling, ready_to_close, saved, cancelled, disputed

Participant roles:
organizer, treasurer, payer, receiver, contributor, approver, reviewer, observer

Payment item statuses:
requested, payment started, marked paid, waiting for receiver,
confirmed received, delayed, waived, disputed, rejected, expired, duplicate

Receipt statuses:
empty, capturing, needs review, looks ready, corrected, saved

Spend card statuses:
card ready, purchase appeared, needs review, split saved, missing receipt,
over budget, wrong currency, merchant not recognized, member not allowed,
declined, exported to saved record

Invite statuses:
created, sent, opened, joined, expired, revoked

Event/deposit states:
invited, joined, committed, waitlisted, cancelled by participant,
cancelled by organizer, checked in, no show, refund due, refund claimed,
refund confirmed, exception open, closed

Readiness states:
ready, needs work, setup required, blocked, local proof, needs human review
```

Normal user copy can simplify these states, but the local state must be able to
drive every scenario above.

## Payment Truth Rules

Gemini must encode these as UI behavior:

- Mark paid does not mean confirmed received.
- External payment/wallet result can move an item to waiting for receiver.
- Only the receiver or allowed organizer can confirm received.
- Wrong amount does not clear.
- Wrong currency does not clear.
- Wrong receiver does not clear.
- Duplicate payment does not double-clear.
- Expired links cannot mutate state.
- Saved record must name open, delayed, waived, disputed, and unresolved items.
- Payment method outage must fall back to normal payment link/manual recording.
- Wallet/host-specific details must be hidden behind normal payment language.

## AI And Capture Rules

AI-assisted capture should feel useful but never magical or unsafe.

- AI extracts, suggests, and pre-fills.
- AI never silently adds an expense.
- AI never silently sends a payment link.
- AI never marks paid.
- AI never confirms received.
- AI never closes or saves a record.
- Every capture has a review step.
- Every low-confidence extraction has a correction path.
- Raw model output is not visible in normal UI.

## Mini-App Environment Requirements

The shell must run as a standard responsive web app and inside mini-app
containers.

### Web

- full journey works in normal mobile browser and desktop browser
- no host API required
- share and payment fall back to copy/open link

### Telegram

- safe-area and content-safe-area support
- bottom button / main action compatibility
- haptics when available
- back button compatibility
- share message / chat handoff simulator
- no chat mutation without explicit review action

### Farcaster / Base-Style Standard Web

- standard web and wallet-ready path
- wallet identity can be read as a claim, not assumed personhood
- notifications and share actions simulated through the adapter
- no reliance on deprecated SDK-specific behavior

### Circles / Gnosis

- focused mini-app inside wallet iframe
- postMessage-style signing/transaction bridge simulator
- Circles/CRC payment request path
- create/connect Circles account surface
- CRC payment can submit payment support, not final receipt confirmation

### Polkadot / Dot Host

- hosted shell can render without native proof
- wallet proof path is optional
- user sees normal payment words
- developer proof status lives only in dev-only cockpit

## Readiness And Build-To-Audit Requirements

The shell must include a dev-only readiness panel that shows:

- journey name
- current screen
- current role
- current state
- ready / needs work / setup / blocked
- missing action if any
- screenshot checklist
- forbidden word scan
- payment truth checks
- role-permission checks
- unresolved item checks

This panel is not normal user UI. It exists so Codex and humans can review the
shell before wiring it into the real app.

## Design Principles Gemini Must Follow

1. One screen, one job.
2. Hero first, details second.
3. One dominant pink primary action.
4. Labels beat explanations.
5. Details must belong to the current moment.
6. Completion must feel clean.
7. Privacy should be designed away.
8. Focused tasks can hide app chrome.
9. Mobile fit is a product requirement.
10. Copy the discipline, not the skin.

Normal UI forbidden words:

```text
evidence
rail
claim
kernel
adapter
obligation
chapter
test-token
raw JSON
protocol
settlement
native
host
state machine
```

Use user language instead:

```text
receipt
payment app
mark paid
confirmed received
waiting on
ready to close
saved record
payment link
```

## Screen Inventory

### A. Welcome, Sign-On, Profile

1. Welcome
   - Job: understand ChopDot in one glance.
   - Primary action: Start a pot.
   - Secondary action: Join from link.
   - Must not explain architecture.

2. Sign-on choice
   - Job: choose fastest safe entry.
   - Primary action: Continue as guest.
   - Secondary actions: Sign in with email, connect wallet, mini-app identity.
   - Copy: guest mode is enough for a private group record.

3. Profile setup
   - Job: make the user recognizable in a group.
   - Primary action: Continue.
   - Fields: display name, optional payment app label, optional avatar.
   - No KYC, no wallet-first posture.

4. Permissions / host readiness
   - Job: gracefully request only what helps.
   - Primary action: Continue.
   - States: notifications available, share available, wallet available.
   - Must degrade silently to web behavior.

### B. Normal Pot

5. Empty home
   - Job: start first shared money record.
   - Primary action: Create pot.

6. Create pot
   - Job: name the group and currency.
   - Primary action: Create pot.
   - Fields: pot name, currency, optional note.

7. Add friends
   - Job: add people before splitting.
   - Primary action: Add friends.
   - Supports: name chips, invite link, contacts simulator.

8. Pot ready
   - Job: add first shared cost.
   - Primary action: Add shared cost.

9. Capture method
   - Job: capture what happened with least typing.
   - Primary action: Add receipt.
   - Secondary: paste payment link, enter total instead.
   - Manual item entry is never first.

10. Add expense
   - Job: enter or confirm amount/title/payer.
   - Primary action: Review split.

11. Review split
   - Job: prevent mistakes before saving.
   - Primary action: Save split.
   - Shows: total, payer, people, each share, who owes whom.

12. Pot with open shares
   - Job: see who owes and collect.
   - Primary action: Collect.
   - Shows: open total, people rows, activity below.

13. Choose person to collect from
   - Job: focus on one payer.
   - Primary action: Collect from Leo.

14. Choose payment method
   - Job: pick a normal payment path.
   - Primary action: Send payment link.
   - Options: payment app, bank transfer, in person, wallet if available.
   - Do not expose chain/host language.

15. Payment request sent
   - Job: know what happens next.
   - Primary action: Share link.

16. Friend payment link
   - Job: Leo pays without joining.
   - Primary action: Pay Mina / Mark paid.
   - Shows: amount, receiver, method, what happens after marking paid.

17. Mark paid
   - Job: Leo records his action.
   - Primary action: Mark paid.
   - Optional: add note/reference/screenshot.

18. Waiting for confirmation
   - Job: Leo knows Mina must confirm.
   - Primary action: Done.

19. Receiver confirmation
   - Job: Mina confirms exact matching payment.
   - Primary action: Confirm received.
   - Shows: payer, amount, method, timestamp.

20. Partial state
   - Job: show Leo confirmed, Nina still open.
   - Primary action: Collect from Nina or Review record.

21. Close review
   - Job: decide if the record can close.
   - Primary action: Save record.
   - Must show open/delayed/waived/disputed items honestly.

22. Saved record
   - Job: preserve readable history.
   - Primary action: Done / Share summary.
   - Shows: confirmed, open, notes, date, participants.

### B2. Spend Cards And Group Cards

Spend-card and group-card screens are capture surfaces. They must stay focused
on a recent purchase and one action. They must not become a card-management
dashboard.

- Spend Card home
  - Job: see the latest card/payment spend.
  - Primary action: Split this spend.
  - Shows: merchant, amount, payer, date, group, status.

- Spend feed
  - Job: choose a card/payment purchase to review.
  - Primary action: Review spend.
  - Shows: recent purchases, needs-review badges, saved badges.

- Group spend card setup
  - Job: create a shared spend surface for a group.
  - Primary action: Create group spend card.
  - Fields: group, currency, members, optional budget, optional spend limit.
  - Must be local simulator only; no KYC, no card-number, no banking copy.

- Group card member view
  - Job: show a member their usable group spend pass/card.
  - Primary action: Use for next group purchase.
  - Shows: group name, allowed spend, recent purchases, rule summary.

- Purchase appeared
  - Job: review an automatically captured card purchase.
  - Primary action: Review split.
  - Shows: merchant, amount, payer/member, category, receipt status.

- Card purchase split review
  - Job: turn the purchase into a normal ChopDot split.
  - Primary action: Save split.
  - Shows: participants, shares, payer, receipt, correction controls.

- Card exception state
  - Job: handle a purchase that cannot be saved cleanly.
  - Primary action: Add receipt / Fix currency / Ask member.
  - States: missing receipt, wrong currency, over budget, merchant unknown,
    member not allowed, declined.

- Group-card saved history
  - Job: prove card purchases land in the same record as all other costs.
  - Primary action: Review record.
  - Shows: confirmed, open, needs review, saved card purchases.

### C. Payment And Error States

23. Payment pending
   - Job: payment started, not confirmed.
   - Primary action: Check again / I paid.

24. Wrong amount
   - Job: explain mismatch without technical language.
   - Primary action: Add note / Try again.

25. Wrong currency
   - Job: show that this cannot clear the share.
   - Primary action: Choose another method.

26. Duplicate payment
   - Job: avoid double clearing.
   - Primary action: Review with receiver.

27. Payment app unavailable
   - Job: fall back safely.
   - Primary action: Copy payment details.

28. Wallet/payment host unavailable
   - Job: use another payment method.
   - Primary action: Use payment link instead.

### D. Receipt Capture

29. Add receipt
   - Job: capture by photo/import/link.
   - Primary action: Add receipt.

30. Extracting receipt
   - Job: short progress state.
   - Primary action: none unless cancel.

31. Review captured receipt
   - Job: confirm extracted total and people.
   - Primary action: Review split.
   - Must show confidence without exposing raw AI output.

32. Correction path
   - Job: fix amount/person after capture.
   - Primary action: Save correction.

### E. Savings Circle

33. Open round
   - Job: start a contribution round.
   - Primary action: Open round.

34. Member contribution
   - Job: member marks paid.
   - Primary action: Mark paid.

35. Treasurer confirmation
   - Job: confirm contribution received.
   - Primary action: Confirm received.

36. Delay
   - Job: record a delay without blocking the round.
   - Primary action: Record delay.

37. Payout
   - Job: record round payout.
   - Primary action: Record payout.

38. Close round
   - Job: save round record.
   - Primary action: Close round.

### F. Emergency Pot

39. Start private help request
   - Job: create private support pot.
   - Primary action: Start pot.

40. Contributor view
   - Job: contribute privately.
   - Primary action: Contribute.
   - No recipient private identity by default.

41. Organizer confirms contribution
   - Job: confirm received.
   - Primary action: Confirm received.

42. Approver approves release
   - Job: approve release.
   - Primary action: Approve release.

43. Recipient confirms received
   - Job: confirm support arrived.
   - Primary action: Confirm received.

44. Redacted saved record
   - Job: preserve safe history.
   - Primary action: Done.

### G. Community Fund

45. Fund home
   - Job: show fund status and next role action.
   - Primary action: Add contribution or Request release.

46. Contribution
   - Job: record incoming contribution.
   - Primary action: Add contribution.

47. Request release
   - Job: request spend/release.
   - Primary action: Request release.

48. Approval
   - Job: approve or reject.
   - Primary action: Approve.

49. Mark paid
   - Job: payer records outgoing payment.
   - Primary action: Mark paid.

50. Handoff record
   - Job: export or share saved summary.
   - Primary action: Share record.

### H. Chat Capture

51. Chat message review
   - Job: review a paid-message import.
   - Primary action: Add to pot.
   - Must not silently write expenses.

52. Chat import correction
   - Job: fix amount/person.
   - Primary action: Save correction.

### I. Desktop Review Mode

53. Desktop app frame
   - Job: preview mobile flows on desktop.
   - Primary action: same as mobile.
   - Layout: centered app surface plus optional right-side review panel only in dev.

54. Dev-only journey map
   - Job: inspect shell completeness.
   - Primary action: Run journey.
   - Must be hidden from normal user UI.

## Prompt Sequence Overview

| Prompt | Purpose | Output |
| --- | --- | --- |
| 0 | Establish product/design/security contract | Gemini restates constraints and screen inventory |
| 1 | Build design system and host-neutral shell | React/Tailwind app shell, tokens, components |
| 2 | Build welcome/sign-on/profile flow | Complete first-run journey |
| 3 | Build normal pot end-to-end | Main dinner loop with real local state |
| 3.5 | Recover after prompts 0-3 | Upgrade current AI Studio build with missing product/competitor scope |
| 3.6 | Add spend cards and group cards | Spend Card, group-card simulator, purchase feed, exceptions |
| 4 | Build payment states and failure handling | Pending, mismatch, duplicate, unavailable states |
| 5 | Build receipt capture/review/correction | Capture-first flow, AI-safe review |
| 6 | Build savings circle | Repeated contribution round |
| 7 | Build emergency pot | Privacy-first role flow |
| 8 | Build community fund | Multi-role fund decisions |
| 9 | Build chat capture review flow | Review-first chat import |
| 10 | Add host adapters | Web, Telegram, Farcaster, Gnosis, dot-host simulators |
| 11 | Add transitions/gestures/responsiveness | Motion and mobile/desktop behavior |
| 12 | Add completeness self-test | Route map, Playwright/checklist, forbidden words |
| 13 | Final audit/rewrite | Remove placeholders, unreachable screens, fake state |
| 14 | Add competitor-floor capabilities | Splitwise/Tricount/Settle Up/Revolut/Wise table stakes |
| 15 | Add treasurer/export/deposit layer | Approvals, exceptions, no-shows, refunds, handoff record |
| 16 | Add current-app inventory map | Explicit mapping to existing ChopDot routes/screens |
| 17 | Final master-piece pass | Merge all flows into one coherent premium shell |
| 18 | Harden spend cards/groups | Verify every card purchase flows into split, confirm, close |

## Prompt 0: Contract Setup

```text
You are building a complete Google AI Studio product shell for ChopDot.

Before writing code, restate the full product contract and screen inventory back
to me as an implementation checklist.

ChopDot is a group-money coordination app. It helps groups capture money
moments, make the next action obvious, mark or record payment, confirm what
arrived, and close with a readable saved record.

Hard rules:
- one screen, one job
- one dominant pink primary action
- hero amount/status first, details second
- no dashboard, lab, ledger, protocol console, admin panel, or generic form dump
- no normal-user technical language
- mobile first, desktop review second
- all screens must be reachable from the shell
- every primary button must change local React state
- no TODOs, no fake handlers, no static-only completion
- payments can use local simulators, but state transitions must be honest
- external payment evidence can never confirm receipt by itself
- receiver confirmation is required before a payment is fully confirmed
- saved records must show open/delayed/waived/disputed items honestly

Forbidden normal UI words:
evidence, rail, claim, kernel, adapter, obligation, chapter, test-token, raw JSON,
protocol, settlement, native, host, state machine.

Use instead:
receipt, payment app, mark paid, confirmed received, waiting on, ready to close,
saved record, payment link.

Return:
1. the screen inventory you will build
2. the data model you will use for complete local shell state
3. the component inventory
4. the host adapter interface
5. the test/completeness checklist
Do not write app code yet.
```

## Prompt 1: Design System And Shell

```text
Build the ChopDot design system and host-neutral mini-app shell in React,
TypeScript, and Tailwind.

Required:
- AppShell
- FocusedTaskShell
- DesktopPreviewFrame
- BottomActionBar
- PrimaryActionButton
- SecondaryActionButton
- HeroState
- AmountHero
- PersonRow
- MoneyRow
- StatusPill
- DetailCard
- SavedRecordCard
- PaymentMethodRow
- ActivityRow
- EmptyState
- TextInput
- CurrencyPicker
- AvatarChip
- Progressless loading states

Visual direction:
- premium money-app feel
- dark calm surface
- strong contrast
- ChopDot pink only for primary action and active state
- compact rows
- no nested cards
- no decorative gradients or blobs
- text must fit at 390px width
- desktop centers the app surface, not a dashboard

Interaction:
- primary action pinned at bottom on mobile
- focused payment/confirm/approve/close screens hide bottom nav
- clear back action at top
- support swipe-back where reasonable
- no primary action hidden under bottom nav or safe area

Return complete file tree and full code.
```

## Prompt 2: Welcome, Sign-On, Profile

```text
Add the complete first-run flow.

Screens:
1. Welcome
2. Sign-on choice
3. Profile setup
4. Mini-app readiness
5. Empty home

Journey:
Mina opens ChopDot for the first time. She understands the app, continues as
guest, enters display name "Mina", optionally sets a payment label "TWINT", and
lands on an empty home where the obvious action is "Create pot".

Rules:
- Continue as guest is the primary action
- wallet/connect/sign-in options are secondary
- no architecture or protocol copy
- profile setup asks only for what helps friends recognize her
- readiness screen only asks for useful permissions and degrades silently
- empty home has one primary action: Create pot

Implement with real local reducer state. Every button advances the flow.
Output all changed files in full.
```

## Prompt 3: Normal Pot End-To-End

```text
Build the full regular pot dinner journey end to end.

Characters:
- Mina: organizer and receiver
- Leo: friend/payer
- Nina: friend/payer

Journey:
1. Mina creates "Friday dinner" pot in CHF.
2. Mina adds Leo and Nina.
3. Mina adds CHF 120 dinner cost.
4. Mina reviews split: Mina, Leo, Nina each CHF 40.
5. Mina saves split.
6. Pot shows CHF 80 open.
7. Mina chooses Leo.
8. Mina sends Leo a payment link.
9. Leo opens link.
10. Leo marks CHF 40 paid.
11. Leo sees waiting for Mina.
12. Mina confirms Leo received.
13. Pot shows Leo confirmed and Nina still open.
14. Mina reviews record.
15. Mina saves record with Nina still open.
16. Saved record clearly shows Leo confirmed and Nina open.

Rules:
- no account creation for Leo
- friend link shows only Leo's relevant amount/action
- marking paid does not confirm receipt
- only Mina can confirm received
- saved record must not hide Nina's open item
- all buttons move state forward
- no unreachable screens

Output complete code.
```

## Prompt 3.5: Recovery Prompt After Prompts 0-3

Use this now if AI Studio already built a smoother normal-pot shell from prompts
0-3 but it still feels incomplete.

```text
You have built a smoother ChopDot shell, but it is not complete enough yet.
Do not restart from scratch. Upgrade the existing implementation so it becomes
the full ChopDot universal mini-app shell described below.

Current issue:
The app currently covers part of welcome/profile/create pot/normal pot, but it
does not yet cover the full product standard, competitor floor, current app
inventory, treasurer closeout, mini-app hosts, payment failure states, receipt
capture, Spend Card, group-card simulator, savings circle, emergency pot,
community fund, chat capture, desktop review, and readiness checks.

Build all missing pieces as real reachable local-state screens.

Product spine:
I paid / I need to collect
-> ChopDot captures the moment
-> friends get one obvious action
-> payment is marked or recorded
-> receiver confirms what arrived
-> group closes with a readable saved record

Must preserve:
- one screen, one job
- one dominant pink primary action
- hero amount/status first
- details below the action moment
- no dashboard, lab, ledger, protocol console, admin panel, or form dump
- no technical language in normal UI
- mobile mini-app first, desktop review second
- all primary actions advance local state
- no TODOs, no placeholders, no dead buttons, no unreachable screens

Competitor floor:
Match or exceed Splitwise, Tricount, Settle Up, Revolut/Wise-style group bills:
- fast add expense
- groups and invite links
- everyone can see shared expenses
- equal, exact, shares, percentage, participation, and itemized splits
- who paid, who owes, current balance
- settlement suggestions
- recurring expenses
- receipts
- search/filter
- export/share summary
- multi-currency-ready UI
- mark as paid
- payment handoff
- offline/local state
- simple no-account friend link

ChopDot must go beyond competitors with:
- receiver confirmation
- open/delayed/waived/disputed states
- role-scoped links
- saved record that names unresolved items
- privacy-by-role
- treasurer handoff/export
- optional payment/wallet support hidden behind normal words
- readiness and permission checks in a dev-only panel

Add these sections to the app:
1. Current app route map: home, pots, activity, people, profile, spend, pay,
   confirm, invite/import, settings, settlement history, saved records.
2. Payment state gallery: requested, payment started, marked paid, waiting for
   receiver, confirmed received, wrong amount, wrong currency, duplicate,
   expired link, delayed, waived, disputed, payment app unavailable.
3. Receipt capture: photo/import/link first, manual total fallback, review,
   correction, save split.
4. Spend Card / group-card: latest purchase, purchase feed, group-card setup,
   member pass, automatic purchase appeared, split this spend, review split,
   missing receipt, wrong currency, over budget, merchant unknown, member not
   allowed, declined, saved group-card history.
5. Savings circle: open round, mark paid, confirm received, record delay,
   record payout, close round.
6. Emergency pot: contributor private view, organizer confirm, approver approve,
   recipient confirm, redacted saved record.
7. Community fund: admin, contributor, approver, payer, receiver, reviewer.
8. Chat capture: message becomes a pending review item; Add to pot is explicit.
9. Treasurer closeout: approvals, exceptions, export preview, handoff record.
10. Event/deposit states: committed, waitlisted, no-show, refund due, refund
   confirmed, exception open, checked in, closed.
11. Mini-app host adapter preview: web, Telegram, Farcaster/Base, Gnosis/Circles,
    dot-host, each with safe-area/share/payment fallbacks.
12. Desktop review mode: centered app plus dev-only journey checklist.

Payment truth rules:
- Mark paid does not confirm received.
- External wallet/payment support does not confirm received by itself.
- Only receiver or allowed organizer can confirm received.
- Wrong amount/currency/receiver does not clear.
- Duplicate payment does not double-clear.
- Expired/revoked links cannot mutate state.
- Saved record never hides unresolved items.

Forbidden normal UI words:
evidence, rail, claim, kernel, adapter, obligation, chapter, test-token, raw JSON,
protocol, settlement, native, host, state machine.

Use normal words:
receipt, payment app, mark paid, confirmed received, waiting on, ready to close,
saved record, payment link, group summary, close record.

Return:
1. exact file tree
2. complete code changes
3. list of added screens
4. list of all user journeys now reachable
5. pass/fail checklist for every required journey
```

## Prompt 3.6: Spend Cards And Group Cards Recovery

Use this immediately if the AI Studio shell has a normal pot but does not have
first-class Spend Card and group-card journeys.

```text
Do not restart from scratch. Add first-class Spend Card and group-card flows to
the existing ChopDot shell.

Product rule:
Spend Card is not card management. It is a capture surface for "a purchase just
happened; split this spend." Group Card is a local simulator for zero-manual
entry shared spending. It must still flow into the same ChopDot split, payment,
receiver confirmation, close, and saved-record model.

Build these reachable screens:

1. Spend Card home
   - hero: latest purchase
   - primary action: Split this spend
   - shows merchant, amount, payer, date, group, status

2. Spend feed
   - list recent card/payment purchases
   - each row has merchant, amount, member, needs-review/saved status
   - primary action on a row: Review spend

3. Group spend card setup
   - local simulator only
   - fields: group, currency, members, optional budget, optional spend limit
   - primary action: Create group spend card
   - no KYC, no card numbers, no banking or issuing claims

4. Group card member view
   - member sees their usable group spend pass/card
   - shows group, allowed spend, recent purchases, lightweight rules
   - primary action: Use for next group purchase

5. Purchase appeared
   - automatic transaction event appears in local state
   - primary action: Review split
   - shows merchant, amount, payer/member, category, receipt status

6. Card purchase split review
   - turn the purchase into a normal ChopDot split
   - primary action: Save split
   - supports equal, exact, shares, percentage, itemized, involved-only
   - after save, it lands in the same pot as receipt/manual expenses

7. Card exception states
   - missing receipt
   - wrong currency
   - over budget
   - merchant not recognized
   - member not allowed
   - declined
   - each state has one recovery action: Add receipt, Fix currency, Ask member,
     Review rule, Choose another method, or Mark as not shared

8. Group-card saved history
   - shows card purchases next to normal expenses
   - confirmed, open, needs-review, and saved states are visible
   - primary action: Review record or Share summary

Required local state:
- cards/groups array
- card members and roles
- group-card budgets/limits
- card transaction feed
- transaction statuses: card ready, purchase appeared, needs review, split
  saved, missing receipt, over budget, wrong currency, merchant unknown, member
  not allowed, declined
- transaction-to-expense conversion
- saved record includes card-origin expenses without technical language

Design requirements:
- one screen, one job
- no card-management dashboard
- no fake card numbers, PAN, CVC, KYC, issuer promise, custody copy, or banking
  product language
- do not use words like rail, adapter, host, protocol, native, state machine
- the first card screen must make "Split this spend" obvious in under 3 seconds
- every button must mutate local state or navigate to a reachable screen

Return complete code and a checklist proving:
1. latest card spend can be split
2. group-card simulator can be created
3. member card/pass view is reachable
4. automatic purchase appeared path is reachable
5. exceptions are reachable
6. card purchase can become a normal split
7. card split can be paid, confirmed, closed, and saved
```

## Prompt 4: Payment States And Failure Handling

```text
Add payment state screens and local state cases.

Required states:
- payment started
- marked paid
- waiting for receiver
- confirmed received
- delayed
- waived
- disputed
- wrong amount
- wrong currency
- duplicate payment
- payment app unavailable
- wallet unavailable
- expired payment link

Rules:
- mismatch states do not clear the share
- duplicate states do not double clear
- unavailable states offer a normal fallback
- receiver can manually confirm or add note where appropriate
- the UI must explain actionably without technical terms
- no screen should say evidence/protocol/adapter/host/native

Add a dev-only route or journey switcher to preview each state, hidden from
normal UI.

Output complete code.
```

## Prompt 5: Receipt Capture

```text
Add receipt capture without manual-first entry.

Journey:
Mina has a receipt or payment link. She taps Add receipt, chooses photo/import
or paste payment link, sees a short capture progress state, reviews extracted
total and people, corrects details if needed, and then reviews the split.

Rules:
- default action is Add receipt
- paste payment link is allowed
- enter total manually is a fallback only
- item editing appears only after capture/review
- AI/OCR output is treated as unconfirmed input, not truth
- confidence can be shown as "Looks ready" / "Needs review", not raw model output
- user must review before saving

Output complete code.
```

## Prompt 6: Savings Circle

```text
Add a savings circle round journey.

Journey:
Mina opens a Friday savings circle round. Leo marks paid. Mina confirms
received. Nina is delayed. Mina records delay. Mina records payout. The round
closes with a saved record.

Rules:
- do not make this feel like a banking admin dashboard
- one round, one current next action
- contribution, delay, payout, close are separate focused moments
- no custody language
- saved record shows who paid, who delayed, and payout status

Output complete code.
```

## Prompt 7: Emergency Pot

```text
Add emergency pot privacy journey.

Roles:
- Casey: contributor
- Morgan: contributor
- Riley: organizer
- Taylor: approver
- Jordan: recipient

Journey:
1. Riley starts private help request.
2. Casey contributes privately.
3. Riley confirms Casey received.
4. Morgan contributes privately.
5. Riley confirms Morgan received.
6. Riley prepares release.
7. Taylor approves release.
8. Riley records release.
9. Jordan confirms received.
10. Riley saves record.
11. Casey sees redacted saved record.

Rules:
- contributor does not see recipient private identity by default
- no private reason details in contributor view
- privacy copy should be natural: Kept private, Private by default
- hide bottom nav during focused contribute/confirm/approve/release tasks
- no progress bar directly under primary button
- no defensive privacy paragraphs
- saved record is readable and redacted appropriately

Output complete code.
```

## Prompt 8: Community Fund

```text
Add community fund role flow.

Roles:
- Admin
- Contributor
- Approver
- Payer
- Receiver
- Reviewer

Journey:
1. Admin opens community fund.
2. Contributor adds contribution.
3. Admin requests release.
4. Approver approves.
5. Payer marks payment made.
6. Receiver confirms received.
7. Reviewer opens saved handoff record.

Rules:
- each role sees exactly one next action
- no role sees controls they cannot use
- fund home is a status surface, not a control panel
- approvals and payment confirmation are separate moments
- handoff record is readable without internal terms

Output complete code.
```

## Prompt 9: Chat Capture Review

```text
Add a chat-capture review flow for a Telegram-like mini-app context.

Journey:
Mina is in a dinner chat. A message says "Mina paid CHF 120 for dinner". ChopDot
creates a pending review item. Mina reviews amount, payer, people, and split.
Mina taps Add to pot. Nothing is added silently.

Rules:
- chat capture creates a pending review item, never a silent write
- /addlast or Add to pot is the explicit action
- payment/confirmed states still require explicit actions
- private chat access must be opt-in in copy
- no bot/control panel UI in normal flow

Output complete code.
```

## Prompt 10: Host Adapters

```text
Add a host adapter layer without changing product screens.

Supported hosts:
- web
- telegram
- farcaster
- gnosis
- dotHost

Create:
- MiniAppHost type
- HostCapabilities type
- HostAdapter interface
- useMiniAppHost hook
- complete local adapters for every host
- dev-only HostPreviewSwitcher

Adapter methods:
- getUser()
- getSafeAreaInsets()
- sharePaymentLink(payload)
- openPaymentApp(payload)
- requestWalletPayment(payload)
- closeMiniApp()
- haptic(type)
- track(eventName, payload)

Rules:
- product components never import host-specific APIs directly
- unsupported features degrade to web behavior
- normal UI should not show host names unless needed for a user action
- host switcher hidden from normal product UI
- the core journey must not change by host

Output complete code.
```

## Prompt 11: Transitions, Gestures, Mobile/Desktop

```text
Add transitions, gestures, and responsive behavior.

Requirements:
- screen transitions are quick and calm
- forward navigation slides subtly left
- back navigation slides subtly right
- focused success states can scale/fade in lightly
- primary action press has tactile feedback
- rows have clear tap states
- support swipe-back on mobile where safe
- respect reduced-motion preference
- safe-area padding for mobile webviews
- desktop uses centered phone surface
- optional desktop side panel only for dev journey review
- no animation delays that block action

Return complete code.
```

## Prompt 12: Completeness Tests

```text
Add a completeness test suite for the shell.

Tests/checks:
1. every screen is reachable
2. every primary action advances state
3. welcome -> profile -> create pot works
4. normal pot full journey works
5. Leo cannot confirm receipt
6. Mina can confirm Leo
7. Nina remains open after Leo confirmed
8. saved record shows open items
9. wrong amount/currency does not clear
10. receipt capture requires review
11. emergency contributor sees redacted view
12. community fund role controls are scoped
13. chat capture creates a pending review item before add
14. forbidden words do not appear in normal UI
15. mobile 390px viewport has no clipped primary action
16. desktop mode is not a dashboard

Use Playwright if possible. If not, include a runnable in-app test harness that
prints pass/fail.

Output complete code.
```

## Prompt 13: Final Audit And Rewrite

```text
Audit your entire implementation for gaps.

Fail the implementation if any are true:
- any required screen is missing
- any primary button does nothing
- any screen is static-only
- any normal UI uses forbidden words
- any payment state clears the wrong person
- marking paid confirms receipt automatically
- saved record hides open/delayed/waived/disputed items
- mobile primary action is clipped or blocked
- desktop layout becomes a dashboard
- host-specific code leaks into product components
- there are TODOs, placeholder comments, missing imports, or fake handlers
- a user journey requires manually editing code to complete

Then rewrite the complete implementation to fix every issue.

Return:
1. pass/fail checklist
2. list of files changed
3. complete corrected code
```

## Prompt 14: Competitor-Floor Upgrade

```text
Upgrade the shell so it meets the competitor floor before adding any more visual
polish.

Build these as real screens or reachable states:

Splitwise-class:
- groups for trips, home, friends, and family
- add bill / add expense
- who paid
- who owes
- equal split
- unequal split
- percentage split
- shares split
- itemized split
- simplify debts
- recurring expense
- offline/local saved state
- search
- category/spending totals
- receipt scan/review
- export/share summary

Tricount-class:
- share group link
- everyone can add
- everyone can see current balance
- include only people involved in an expense
- import from another app
- custom amounts
- settlement suggestion

Settle Up-class:
- who pays next
- minimized transactions
- backed-up shared expenses
- receipt object

Revolut/Wise-class:
- create group with currency
- add members by link/QR
- add bill from transaction or custom bill
- allow a non-account participant path
- mark as paid
- card-like automatic spend appeared path
- Spend Card home with Split this spend
- group-card local simulator
- group-card owner and member views
- purchase feed with merchant, amount, member, category, status
- missing receipt / wrong currency / over budget / declined states
- owner/member permission clarity
- multi-currency display

ChopDot extension:
- receiver confirmation
- saved record
- unresolved items named
- role-scoped links
- no-account friend link
- treasurer export/handoff
- privacy-by-role

Do not create a feature checklist screen for normal users. Put each capability
inside a real journey or a dev-only review panel.

Return complete code.
```

## Prompt 15: Treasurer, Deposit, Exception, Export

```text
Add the accountable-treasurer layer and event/deposit state model.

Persona:
Mina is the accountable treasurer. She is responsible for a group trip or
community budget being correct, closed, and defensible.

Build these journeys:

1. Policy before commitment
   - Mina sets refund/cancellation/no-show rules.
   - Participant sees the rule before committing.
   - Primary action: Join / Commit.

2. Deposit and waitlist
   - Leo commits and pays/marks paid.
   - Nina joins waitlist.
   - Mina approves Leo.
   - Nina stays waitlisted.

3. Exception
   - Nina cancels.
   - Mina records exception note.
   - State shows refund due or waived.

4. Check-in / attendance
   - Leo checks in with QR/pass style screen.
   - Check-in is access status, not payment truth.

5. Refund
   - Refund due -> refund claimed -> refund confirmed.
   - Refund status appears in saved record.

6. Treasurer closeout
   - Mina reviews confirmed, open, delayed, waived, disputed, refund, no-show,
     and exception items.
   - Mina saves record.
   - Export preview shows a readable group summary.

Rules:
- Do not become a ticketing app.
- Do not show payment processing language unless user action needs it.
- Make policy and exception states clear but compact.
- Saved record must be readable by a future treasurer.

Return complete code.
```

## Prompt 16: Current ChopDot Route And Screen Map

```text
Add a dev-only screen map that proves the shell covers current ChopDot product
surfaces.

Normal users must not see this map. It is for review only.

Map these surfaces:
- Home / Pots
- Activity
- People / settlements
- You / profile
- Settings
- Create pot
- Import/join pot link
- Add member
- Add expense
- Expense detail
- Spend card / receipt capture
- Spend Card home
- Spend feed
- Group spend card setup
- Group card member view
- Purchase appeared
- Card purchase split review
- Card exception states
- Group-card saved history
- Friend payment link
- Receiver confirmation
- Settle selection
- Settle home
- Payment confirmation
- Settlement history
- Close record
- Saved record
- Savings circle
- Emergency pot
- Community fund
- Chat capture review
- Notification center

For each surface show:
- route name
- user role
- current job
- primary action
- next state
- missing or blocked state if any
- mobile screenshot state
- desktop screenshot state

Add a "Run full journey" dev-only action that walks through:
welcome -> guest/profile -> create pot -> add friends -> add shared cost ->
review split -> send payment link -> Leo marks paid -> Mina confirms ->
close review -> saved record.

Return complete code.
```

## Prompt 17: Final Master-Piece Pass

```text
Now make the shell feel like one finished product, not many stitched demos.

Unify:
- navigation
- screen rhythm
- typography
- spacing
- button placement
- dark premium money-app material
- empty states
- receipt/payment/saved-record cards
- Spend Card and group-card screens
- purchase feed and card exception states
- role labels
- activity rows
- readiness panel
- desktop review mode

Polish requirements:
- every first viewport has one obvious action
- no screen starts with a metric dashboard
- no paragraph explains a screen before action
- primary action is never visually blocked
- bottom nav hides during focused payment/confirm/approve/close tasks
- success/completion states feel final
- privacy states feel natural, not defensive
- transitions are calm and fast
- reduced motion is respected
- 390px mobile viewport has no clipped text or controls
- desktop is centered phone-like app plus optional dev panel
- no visible technical language in normal UI

Final output:
1. complete code
2. screen inventory
3. journey inventory
4. competitor-floor checklist
5. payment-truth checklist
6. role-permission checklist
7. mobile/desktop checklist
8. forbidden-word scan result
```

## Prompt 18: Spend Cards And Groups Hardening

Use this after Prompt 3.6 or after the final pass if the spend-card/group-card
screens exist but do not yet feel like a complete ChopDot journey.

```text
Audit and harden the Spend Card and group-card flows.

Do not add a dashboard. Do not add banking, issuing, KYC, custody, card-number,
PAN, CVC, protocol, adapter, host, native, or rail language. Keep this as a
premium group-money capture surface.

Required end-to-end journeys:

Journey A: Spend Card split
1. Mina opens Spend Card home.
2. Latest purchase shows "Coop Market CHF 48.20".
3. Mina taps Split this spend.
4. Mina reviews merchant, total, payer, receipt status, and people.
5. Mina saves split.
6. Leo gets a payment link.
7. Leo marks paid.
8. Mina confirms received.
9. Saved record includes the card-origin purchase.

Journey B: Group-card simulator
1. Mina creates a group spend card for "Friday Crew".
2. Currency is CHF.
3. Members are Mina, Leo, Nina.
4. Optional budget and spend limit are set.
5. Leo sees his member group spend pass/card.
6. A Leo purchase appears automatically.
7. Mina reviews and saves it as a split.
8. The group-card purchase lands in the same pot history.

Journey C: Exceptions
Build reachable states for:
- missing receipt
- wrong currency
- over budget
- merchant not recognized
- member not allowed
- declined

Each exception must have exactly one obvious recovery action and must never
clear a payment or close a record by itself.

Checklist:
- latest spend has one primary action: Split this spend
- group-card setup is reachable from a normal group context
- member card/pass view is reachable
- purchase feed is reachable
- purchase appeared state is reachable
- split review supports equal, exact, shares, percentage, itemized, involved-only
- card-origin expense can be paid, confirmed, closed, and saved
- saved record labels it as a card purchase in normal language
- no forbidden technical or banking language appears in normal UI
- mobile 390px view has no clipped controls
- desktop review mode maps every spend-card/group-card screen

Return complete corrected code and the pass/fail checklist.
```

## What To Send Back To Codex

After Gemini produces the shell, send Codex:

1. Full generated code or a zip/folder.
2. Screenshots/contact sheet for:
   - welcome
   - profile
   - create pot
   - add expense
   - review split
   - friend payment link
   - receiver confirmation
   - saved record
   - payment mismatch
   - receipt capture
   - Spend Card home
   - Spend feed
   - group-card setup
   - group-card member view
   - card purchase split review
   - card exception state
   - group-card saved history
   - emergency contributor
   - community role
   - desktop mode
3. Gemini's pass/fail checklist from Prompt 13.
4. Notes on any parts it could not complete.

## Codex Integration Gate

Codex should not port the shell directly. First:

1. Save as `product/design-references/ai-studio-universal-miniapp-shell-YYYY-MM-DD/`.
2. Compare against:
   - product/story-map.md
   - product/cards.md
   - product/design-references/chopdot-batch-1-2-consolidated-principles-2026-07-01.md
   - docs/security/universal-chop-core-security-architecture.md
3. Extract reusable UI patterns only.
4. Wire into real ChopDot components and state.
5. Run:
   - npm run product:validate
   - npx tsc --noEmit
   - npm run build
   - focused Playwright journey
   - screenshot review

## Final Build Standard

The shell passes only if a first-time user can complete:

```text
welcome
-> guest/profile
-> create pot
-> add shared cost
-> review split
-> send payment link
-> friend marks paid
-> receiver confirms
-> saved record with honest open items
```

without reading instructions, seeing internal terms, or encountering a dead end.

The shell also passes only if a first-time user can complete:

```text
Spend Card home
-> Split this spend
-> review card purchase
-> save split
-> friend marks paid
-> receiver confirms
-> saved record
```

and:

```text
create group spend card
-> member card/pass view
-> purchase appeared
-> review split
-> save into pot
-> close with saved group record
```
