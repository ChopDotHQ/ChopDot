# Teddy UX Mapping

## Purpose

This file explains how the shared commitment thesis maps onto the current ChopDot app.

It is here to prevent a common mistake:

- thinking this direction means building a whole new app

It does not.

The correct move is:

- keep the current app shell
- change what the product is expressing

## Core UX shift

### Old product feeling

ChopDot feels like:

- a pot
- with expenses
- balances
- and a settle action

### New product feeling

ChopDot should feel like:

- a shared objective
- with participants
- with contribution state
- with release / approval semantics
- with visible next action
- with visible closure

That means the product should stop leading with:

- balances
- expense lists
- generic settle actions

and start leading with:

- objective
- state
- progress
- blockers
- closure

## Screen-by-screen mapping

## 1. Create Pot -> Create Commitment

Do not think of this as:

- making a container

Think of it as:

- starting a shared commitment

### What should stay

- existing creation flow shell
- existing form structure where useful

### What should change

The first decision should explicitly be:

- `Expense`
- `Goal`
- `Deposit`

The user should understand:

- what kind of shared commitment they are creating

### UX priority

The creation flow should make the objective legible before the details.

Users should leave the flow understanding:

- what this commitment is for
- what success looks like

## 2. Pot Home -> Commitment Home

This is the most important shift.

### What should stay

- Pot Home as the main implementation surface
- current shell and navigation pattern

### What should change

The top of the screen should answer immediately:

- what is this
- who is involved
- what state are we in
- how much is needed
- what is the next action
- can this be released / closed yet

### UX priority

The header and summary area should become commitment-first.

That means:

- title
- commitment type
- target/progress
- status
- next action

should matter more than raw tabs or balance math.

## 3. Expenses area -> Obligation / contribution input

This area does not have the same meaning across all commitment types.

### For `expense`

This remains:

- what happened
- who paid
- who owes

### For `goal` / `deposit`

This becomes secondary.

The more important product concept is:

- contribution progress toward execution

### UX priority

Do not force expense-first framing on every commitment type.

## 4. Members Tab -> Participants + roles + blockers

### What should stay

- the current member management surface

### What should change

This should not just be a static member list.

It should make visible:

- organizer
- participants
- invited vs joined
- who still needs to act
- whose approval matters

### UX priority

The tab should communicate responsibility, not just membership.

## 5. Settle Flow -> Chapter closure flow

This is the biggest product shift.

### What should stay

- the existence of a settle / closeout flow

### What should change

The flow should no longer feel like:

- choose payment method
- say done

It should feel like:

- proposal exists
- leg marked paid
- counterparty confirms
- chapter closes visibly

### UX priority

This is not only a payment flow.
It is a **closure flow**.

Users should understand:

- what stage they are in
- what is waiting on the other side
- when this chapter is actually done

## 6. Settlement History -> Commitment history

### What should stay

- a history screen

### What should change

History should stop being a flat list of payment-like rows.

It should show meaningful transitions such as:

- settlement proposed
- leg paid
- counterparty confirmed
- chapter closed

### UX priority

History should explain the state machine, not just log activity.

## 7. Settings -> Policy surface

### What should stay

- current settings area

### What should change

Treat settings as commitment rules, not generic configuration.

Examples:

- approval rule
- release rule
- deadline
- target
- organizer control

### UX priority

Settings are where the commitment policy becomes explicit.

## The primary UX rule

Every commitment screen should make these obvious:

- objective
- current state
- next action
- who is blocking progress
- whether closure happened

If the UI only shows:

- expenses
- balances
- buttons

then it is still behaving like an expense app.

## What to keep vs what to change

### Keep

- app shell
- current navigation shape
- current implementation base in `Pot`
- current major screen families

### Change

- product framing
- top-level summary hierarchy
- action labels
- state visibility
- history meaning
- settlement/closeout semantics

## What not to do

Do not:

- redesign the whole app first
- build separate apps for each commitment type
- block progress on a giant UX rewrite
- introduce a new navigation model before the loop works

## The simplest mental model

Implementation language may still be:

- Pot
- Expense
- Settlement
- History

But the product meaning should become:

- Commitment
- Contribution / obligation
- Approval / closeout
- Commitment history

## UI success test

The UX is moving in the right direction if a user can open a commitment and answer:

- What is this?
- What state is it in?
- What do I need to do?
- Who are we waiting on?
- Is this actually closed yet?

If they cannot answer those, the product is still too expense-app-shaped.

## What Teddy should use this for

Use this file to guide:

- screen priorities
- label changes
- status exposure
- what to show in headers and summaries
- where to avoid unnecessary redesign

Do not use it as a reason to pause implementation and redesign the entire app.
