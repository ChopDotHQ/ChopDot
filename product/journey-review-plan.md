# ChopDot Journey Review Plan

This is the working list for improving ChopDot one real user journey at a time.
Each journey must be clicked through in the real app, screenshotted at every meaningful state, reduced to a wireframe read, and then judged before implementation continues.

The goal is not to add more surfaces. The goal is to make every core ChopDot moment feel obvious, trustworthy, and professionally designed.

Story-map routing:

- Start from `product/story-map.md`.
- Pick one story-map slice before choosing a cockpit card.
- Use the cockpit to execute and record evidence for that slice.
- Do not let a generated cockpit next-action override the story-map sequence without explicitly saying why.

Executable gate:

```bash
npm run validate:journey-reviews
```

No journey can be marked passed without a review file in `product/journey-reviews/` that includes screenshot references, the product gate, and the full visual quality gate.

## Method

For each journey:

1. Write the user story:
   - "I am [person], I need to [do one job], so the group can [outcome]."
2. Click the real app like a first-time user.
3. Capture screenshots for every state.
4. Translate each screenshot into a wireframe read:
   - title
   - status
   - primary action
   - secondary information
   - what changes after tap
5. Run the product gate:
   - friction /3
   - trust /3
   - clarity /3
   - language /1
6. Run the design gate:
   - hierarchy
   - spacing
   - typography
   - shape system
   - color discipline
   - copy tightness
   - state timing
   - mobile fit
   - desktop fit
   - comparative bar
7. Run the effortless-app gate:
   - locked state model before UI polish
   - strict design system before new components
   - scope cuts before feature expansion
   - invariants/tests around product laws
   - fewer screens before more screens
   - QA clicked empty, error, payment, privacy, and close paths where relevant
8. Fix only the mismatch.
9. Re-click and compare before/after screenshots.

## Design Quality Bar

Every normal ChopDot screen should feel:

- calm, compact, and money-first
- mobile-native before desktop-expanded
- action-led, not explanation-led
- visually consistent with the clean published pot flow
- professional enough to show friends without explaining that it is a prototype

Current reference packet:

- `product/design-references/kast-premium-money-app-2026-06-30/README.md`

Use this packet to judge what the operator means by sleek, professional, and tight: one screen has one job, the first viewport is sparse, the primary action is obvious, copy is compact, and nothing internal leaks into normal UI.

Common design failures to catch:

- oversized cards where a row would work
- repeated cards inside cards
- too many equal-weight buttons
- long explanatory sentences in product UI
- inconsistent border radius, spacing, and type size
- lifecycle states shown too early
- internal words leaking into normal UI
- desktop layouts that feel like stretched mobile screens
- mobile layouts that feel like compressed dashboards
- UI polish hiding an unclear state model
- new components introduced when existing ChopDot patterns would work
- happy-path-only QA that skips empty, error, payment, privacy, or closeout paths

## Review Artifacts

- Template: `product/journey-reviews/_template.md`
- Validator: `scripts/validate-journey-reviews.mjs`
- Command: `npm run validate:journey-reviews`

The validator fails when a review is missing the user story, one next action, screenshots, wireframe read, product gate, visual quality gate, findings, fixes, or decision. A journey marked `PASS` must score at least `8/10` on both product and visual gates.

## Journey Queue

### J-001 Normal Pot: Add And Track Expenses

User story:
"I am Mina, I need to track costs during a shared evening or trip, so the group can see what has been spent and keep adding expenses until we are ready to settle."

Screens to capture:
- pots list
- pot detail before adding
- quick add sheet
- pot detail after adding
- expense detail

Primary action:
- Add Expense

Pass criteria:
- first viewport makes adding an expense obvious
- no settlement plan appears before it is useful
- quick add feels fast, not like an accounting form
- recent activity helps review without crowding the primary action

### J-002 Normal Pot: Settle One Person

User story:
"I am Mina, I am done adding expenses, so I need to collect from one person and return to the pot knowing what changed."

Screens to capture:
- pot detail before settle
- settle person list
- selected person payment method
- payment confirmed
- pot detail after returning

Primary action:
- Settle Up

Current status:
- partially improved on 2026-06-28

Pass criteria:
- pot balances and Settle Up agree
- one person can be settled without explaining the calculation
- returning to pot shows the changed state and remaining open amount

### J-003 Normal Pot: Finish All Settlements And Close Record

User story:
"I am Mina, everyone has paid or been handled, so I need to close the pot with a readable record for the group."

Screens to capture:
- pot with multiple open people
- after each person is settled
- ready-to-close state
- close record review
- saved record

Primary action:
- Close record

Pass criteria:
- close appears only when it makes sense
- open items are visible before closing
- saved record is readable and not technical
- user understands what the record proves and does not prove

### J-004 Friend Link: Pay Without Joining

User story:
"I am Leo, Mina sent me a ChopDot link, so I need to understand what I owe and pay without setting up an account first."

Screens to capture:
- opened link
- payment handoff
- mark paid
- done state

Primary action:
- Pay Mina

Pass criteria:
- one amount, one receiver, one action
- no full app chrome or admin controls
- no account requirement before the low-risk action

### J-005 Regular Pot: End-To-End Coherence

User story:
"I am Mina, I am using a regular pot for dinner, so I need to add costs, split/pay, confirm received money, and close the record without wondering which flow I am in."

Screens captured:
- pots list
- pot before first cost
- add expense sheet
- pot after first cost
- split payment start
- split payment created
- friend payment links
- receiver confirmation
- pot after confirmations
- close review
- saved record

Primary action:
- Review journey

Current status:
- completed on 2026-06-29

Pass criteria:
- normal expenses survive payment-moment capture
- confirmed friend payments reduce only the matching visible shares
- remaining open amount, close review, and saved record agree
- no normal UI internal language appears in the journey

### J-006 Receiver Confirmation

User story:
"I am Mina, Leo says he paid, so I need to confirm what arrived and keep the group record accurate."

Screens to capture:
- confirmation link or prompt
- exact payment item
- confirm received
- updated group state

Primary action:
- Confirm received

Pass criteria:
- confirmation updates only the matching item
- remaining open items stay visible
- user does not need to understand backend/payment-provider state

### J-007 Members And Roles

User story:
"I am Mina, I need to manage who is in the pot, so everyone can see their own share and no one gets mixed up."

Screens to capture:
- members tab
- add member
- pending invite/member state
- remove/edit member

Primary action:
- Add member

Pass criteria:
- members and roles are clear without admin-console feel
- pending people do not confuse balances
- member edits do not interrupt the money flow

### J-009 Empty Pot First Run

User story:
"I am Mina, I just created a pot, so I need to add the first shared cost without wondering what to do next."

Screens to capture:
- empty pot
- first add action
- after first expense

Primary action:
- Add first expense

Pass criteria:
- empty state is not a marketing panel
- no receipt/scanner language unless that path is actually ready
- first useful state appears quickly

### J-008 Mobile/Desktop Layout Quality

User story:
"I am a ChopDot user on phone or desktop, so I need the same money flow to feel intentionally designed for my screen."

Screens to capture:
- pots list mobile
- pot detail mobile
- settle flow mobile
- pots list desktop
- pot detail desktop
- settle flow desktop

Primary action:
- depends on journey state

Pass criteria:
- desktop is not just stretched mobile
- mobile is not cramped dashboard UI
- type scale, cards, buttons, and spacing feel deliberate
- bottom nav, tabs, and top bar do not compete

### J-010 Savings Circle

User story:
"I am Mina, I run a savings circle, so I need each round to show who paid, who is delayed, who receives next, and when the round can close."

Primary action:
- Record contribution

Pass criteria:
- this does not start until J-001 through J-003 are strong
- it uses the same product discipline as normal pots

### J-010 Emergency Pot

User story:
"I am Mina, I am coordinating urgent help, so I need people to contribute privately and close with a respectful record."

Primary action:
- Contribute or approve release

Pass criteria:
- privacy defaults are clear
- sensitive details are not exposed
- it does not feel like a public donor wall or bank product

### J-011 Community Fund

User story:
"I am Mina, I help manage a community fund, so I need contributions, approvals, releases, and handoff to stay understandable."

Primary action:
- Request or approve release

Pass criteria:
- roles are understandable
- approvals do not feel like DAO/admin software
- period closeout is readable by the next treasurer

### J-012 Spend Capture

User story:
"I am Mina, I paid with the group card or payment shortcut, so I need ChopDot to turn that payment moment into a split without extra typing."

Primary action:
- Use at checkout

Pass criteria:
- this does not become a card-management product
- capture reduces friction compared to normal quick add
- payment capture never hides who paid, who owes, or who received

### J-013 Receipt Capture

User story:
"I am Mina, I have a receipt, so I need ChopDot to read it and prepare a split I can review."

Primary action:
- Add receipt

Pass criteria:
- photo/link/import first
- manual item entry only as correction
- AI output is draft, not truth

## Immediate Run Order

1. J-001 Normal Pot: Add And Track Expenses
2. J-002 Normal Pot: Settle One Person
3. J-003 Normal Pot: Finish All Settlements And Close Record
4. J-008 Mobile/Desktop Layout Quality for J-001 through J-003
5. J-004 Friend Link
6. J-005 Receiver Confirmation
7. J-006 Members And Roles
8. J-007 Empty Pot First Run
9. J-009 Savings Circle
10. J-010 Emergency Pot
11. J-011 Community Fund
12. J-012 Spend Capture
13. J-013 Receipt Capture

## Non-Negotiable Rule

Do not start a later journey because it is exciting.
Do not add a new capability because it exists in the code.
Do not promote a screen because tests pass.

The journey is only good when the screenshots make the flow obvious.
