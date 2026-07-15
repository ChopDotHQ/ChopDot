# ChopDot Batch 1 Flow Reference

Status: `active reference`
Captured: 2026-07-01
Source: user-provided `Downloads/Batch_1*` mock screenshots

This packet is the current ChopDot-specific reference for a tighter, more professional product flow.

It does not replace the product story map. It gives the visual and interaction bar for the next journey passes.

## Files

- `batch-1-contact-sheet.png`: the Batch 1 mock flow in one view.
- `current-onboarding-contact-sheet.png`: the current normal-pot onboarding screenshot packet in one view.
- `screenshots/Batch_1_1.png` through `screenshots/Batch_1_9.png`: source mock screens.

## What Batch 1 Gets Right

### 1. The flow is staged, not dumped

The mock separates:

- empty home
- create pot
- pot ready
- add expense
- review split
- settlement-ready pot
- choose person
- collect from one person

Each screen has one job. This is the bar for emergency pots and community funds too.

### 2. Pot home is a status surface, not a workflow console

The strongest pot screens show:

- pot name
- current status
- one primary action
- short member/payment state
- recent activity only after the main state is clear

Avoid putting settlement method choices, lifecycle explanations, or closeout mechanics on the pot home before the user asks for them.

### 3. Create pot is a real setup moment

The mock create flow asks for:

- name
- currency
- optional description

It does not make the user understand advanced modes first. It lets the pot become useful before adding expenses and members next.

### 4. Add expense is compact and high confidence

The add expense screen is strong because it keeps:

- amount
- title
- paid by
- split between
- split type
- each person's share
- one continue action

This is a better model than a large sheet with weak boundaries or a generic accounting form.

### 5. Review split earns trust before saving

The review screen states:

- what was paid
- who paid
- total spend
- each person's share
- who owes whom

This is the clearest way to prevent mistakes without adding explanatory copy.

### 6. Settlement is a separate moment

Settlement appears only once there is something to collect.

The flow is:

```text
Settlement ready -> choose person -> choose collection method -> send request / mark paid in person
```

That is cleaner than showing suggested settlement controls inside the default expense view.

### 7. Copy is mostly labels, amounts, people, and states

The mock rarely explains the system. It uses compact product language:

- `No pots yet`
- `Create pot`
- `Pot is ready`
- `Ready for your first shared cost`
- `Review split`
- `Settlement ready`
- `Collect from Alice`

This is the right direction for ChopDot.

## Current Onboarding Gaps Seen Against Batch 1

- The natural create-pot flow still reaches a state where no `Settle up` path appears after the created expense.
- Some current screens still feel like the app shell plus status blocks instead of one focused moment.
- The current add-member flow is functional, but heavier than the mock rhythm.
- Payment and settlement screens are closer to the target, but need to keep the primary action stable at the bottom and avoid bottom-nav collisions.
- The first screen should feel like a finished product, not an operator packet or generated audit view.

## Emergency Pot Translation

For `P-007`, use Batch 1 as the interaction model but not as a literal visual clone.

The emergency flow should be staged:

```text
Start private pot -> contribute privately -> organizer confirms -> approvers approve -> recipient confirms -> saved private record
```

Normal UI must not expose:

- recipient private identity by default
- private reason details
- payment references
- developer/native/proof terms

Each participant should see one job:

- Contributor: `Contribute`
- Organizer: `Confirm received`
- Approver: `Approve release`
- Recipient: `Confirm received`
- Reviewer: `Save record`

## Gate For Next Passes

Before a screen passes:

- one screen, one job
- one dominant action
- compact title/status/amount/person copy
- no lifecycle explanations in the first viewport
- no internal technical terms
- no settlement controls until settlement is the job
- screenshots must fit mobile without looking cramped

If a screen needs a paragraph to explain itself, simplify before adding more UI.
