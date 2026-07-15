# Kast Premium Money App Reference

Status: `active reference`
Captured: 2026-06-30
Source: user-provided screenshots

This packet defines what the operator means by a sleek, professional, tight money app experience.

It is not a request to copy Kast's brand, crypto-banking position, dark theme, card product, or visual assets. It is a reference for quality, restraint, hierarchy, and flow.

## Screenshot Set

Stored screenshots:

- `screenshots/batch-01-*`: app store, login, account creation, PIN, biometrics, notifications, phone verification.
- `screenshots/batch-02-*`: verification channel, phone verification, WhatsApp code, country services, tag, contacts, referral, earn, card, pay.
- `screenshots/batch-03-*`: accounts, home, deposit, referral, WhatsApp code, country services, tag.

## What To Learn

### 1. One screen, one job

Every strong screen has one reason to exist:

- enter email
- set PIN
- verify mobile
- choose country
- claim tag
- deposit
- pay
- get card

ChopDot screens should not show the entire pot lifecycle when the user is only trying to add, pay, confirm, or close.

### 2. Sparse first viewport

The first viewport usually contains:

- one icon or brand mark
- one clear title
- at most one short support sentence
- one input, choice group, or status block
- one primary bottom action
- one quiet secondary action when needed

If ChopDot needs a paragraph or process diagram to explain a screen, the screen is not ready.

### 3. Bottom-led commitment

Primary actions are large, easy to hit, and stable at the bottom. Secondary actions are visually lighter.

For ChopDot:

- friend pay page: one bottom action
- confirm received: one bottom action
- close record: one bottom action
- create pot step: one bottom action

### 4. Detail appears after intent

Dense product information appears only after the user has chosen a mode or need. Deposit choices live in a deposit screen. Payment choices live in Pay. Card details live in Cards.

For ChopDot:

- expenses view should not always show suggested settle-up
- settle-up belongs in the settlement moment
- close record belongs only when the pot is ready or the user asks to finish
- payment method detail belongs after the person and amount are clear

### 5. Professional copy is compact

The copy works because it is mostly labels, titles, and short status. It does not narrate the product mechanics.

ChopDot should prefer:

- `Add expense`
- `Pay Mina`
- `Confirm received`
- `Waiting on Leo`
- `Ready to close`
- `Saved record`

Avoid long instructional text in normal UI.

### 6. Everything fits in screen

Screens feel intentional because spacing, type, buttons, inputs, and sections fit the mobile viewport without crowding.

For ChopDot, a screen fails this reference when:

- the primary action is pushed below clutter
- cards stack before the user has acted
- text wraps into explanations
- mobile looks like a compressed desktop dashboard
- desktop looks like stretched mobile without added intent

## What Not To Copy

- Do not make ChopDot a banking app.
- Do not copy Kast's visual identity, logo, card imagery, marketing language, or stablecoin positioning.
- Do not force dark mode unless the whole ChopDot brand system is intentionally updated.
- Do not add rewards, vaults, card ordering, or account balances unless they serve a real ChopDot journey.

## ChopDot Translation

### Normal Pot Home

Purpose:
Show where the group is and the one next action.

First viewport:

- pot title
- compact balance/status
- one primary action based on state: `Add expense`, `Settle up`, `Confirm`, or `Close record`
- quiet secondary access to members/activity/settings

Avoid:

- showing every lifecycle stage
- suggested settlements before the settle moment
- process copy
- internal state language

### Add Expense

Purpose:
Capture what happened.

First viewport:

- title: `What did you pay?`
- amount/context input
- payer/people summary
- primary action: `Add expense`

Avoid:

- itemized receipt editing before capture
- multiple payment-method choices before an amount exists

### Pay Link

Purpose:
Let a friend finish one low-risk action.

First viewport:

- amount
- receiver
- pot context
- primary action: `Pay Mina`
- after-state: `Marked paid`

Avoid:

- full app onboarding before first action
- admin controls
- group-wide dashboards

### Confirm Received

Purpose:
Let the receiver confirm one matching payment.

First viewport:

- payer
- amount
- payment context
- primary action: `Confirm received`

Avoid:

- asking the receiver to interpret provider state
- showing unrelated pot mechanics

### Close Record

Purpose:
Save the final readable record.

First viewport:

- confirmed total
- open/delayed/waived items if any
- primary action: `Close record`

Avoid:

- technical proof language
- raw activity logs

## Reference Gate

Before a ChopDot screen passes visual review, answer yes to all:

- Does the first viewport make one action obvious?
- Does the screen fit without crowding on mobile?
- Does each section have one job?
- Is the primary action visually dominant and stable?
- Are secondary actions quiet?
- Is the copy mostly title, label, amount, person, status, or action?
- Are technical/product-internal terms absent?
- Would this feel like a finished app, not a prototype or dashboard?

If any answer is no, simplify before adding more UI.

