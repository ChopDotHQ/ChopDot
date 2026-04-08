# Teddy Shared Commitment Implementation Brief

## Why you are getting this

This brief is meant to replace scattered chat context.

You should be able to read this document alone and understand:

- what ChopDot is actually trying to become
- what your `mvp` cleanup got right
- what it accidentally removed that must come back
- what you should work on next
- what should stay cut
- what questions should come back to the founder immediately

## Short version

Your cleanup was directionally right.

The mistake was not simplification.
The mistake was cutting **commitment lifecycle semantics** together with blockchain/infra complexity.

The target is not:

- a thinner Splitwise clone

The target is:

- a **shared commitment MVP**
- strong enough to trust
- simple enough to ship
- clear enough that other builders could later build on it

## Product direction

ChopDot is moving toward a **shared commitment layer**.

That means the product should help groups:

- define what they are doing together
- see who is involved
- see who contributed
- request approval or release
- confirm what actually happened
- close a chapter visibly

The strongest current wedge is:

- group deposits
- trip funding
- event funding
- service-linked shared funding

Expense tracking still matters, but it is supporting capability, not the headline thesis.

## What your `mvp` branch got right

These cuts were directionally correct:

- blockchain wallet complexity
- Polkadot settlement adapters
- CRDT / Automerge sync
- IPFS / Crust backup
- Hyperbridge
- feature sprawl
- test/docs noise tied to removed systems

Keep those wins unless a concrete product need proves otherwise.

## What your `mvp` branch removed that must come back

These are not optional features.
They are the core semantics of the shared commitment MVP:

- typed chapter / closeout lifecycle
- typed settlement legs
- persisted settlement actions
- counterparty confirmation
- typed event history
- visible closure

Without those, the product proves:

- balances
- basic pot creation
- expense entry

But it does not prove:

- commitment
- approval
- release
- acknowledgement
- closure

## Core build rule

Use this rule for every decision:

- remove rail complexity if needed
- do not remove commitment semantics

## Immediate work to do

### 1. Restore a fiat-only chapter / closeout lifecycle

Implement a lifecycle such as:

- `draft`
- `active`
- `partially_settled`
- `completed`
- `cancelled`

This should not depend on blockchain.

### 2. Restore typed settlement legs

Each leg should have at least:

- `from`
- `to`
- `amount`
- `status`

Statuses:

- `pending`
- `paid`
- `confirmed`

### 3. Make settlement persistence real

Settlement actions cannot be toast-only.

When a user marks a settlement action, the app should:

- persist the state
- attach it to the current chapter
- survive refresh

### 4. Add counterparty confirmation

The receiver needs to confirm receipt.

We need a dependable difference between:

- proposed
- paid
- confirmed

### 5. Restore typed history

At minimum:

- `settlement_proposed`
- `settlement_confirmed`
- `chapter_closed`

### 6. Make the UI expose the commitment loop

The user should be able to see:

- current state
- next action
- waiting on who
- whether the chapter is closed

### 7. Remove or neutralize misleading stubs

If something does not really exist in the MVP:

- remove it
- hide it
- or label it honestly

This especially applies to:

- wallet affordances that do nothing
- checkpoint language with no meaningful checkpoint behavior
- “auditable” labels with no real implementation behind them

## What should stay cut for now

Do not reintroduce these unless asked explicitly:

- blockchain settlement rails
- wallet complexity
- CRDT / IPFS / bridge systems
- booking engine depth
- token / yield / protocol work
- autonomous agent execution

## What success looks like

The branch is moving in the right direction when:

- a group can create a commitment
- participants can contribute
- a release or closeout can be proposed
- a payer can mark a leg paid
- a counterparty can confirm
- the chapter closes visibly
- the whole loop persists across refresh

And the product still feels:

- small
- understandable
- dependable

## What to use as reference

Work against these docs:

- [SHARED_COMMITMENT_KERNEL_ROADMAP.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/SHARED_COMMITMENT_KERNEL_ROADMAP.md)
- [SHARED_COMMITMENT_KERNEL_SPEC.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/SHARED_COMMITMENT_KERNEL_SPEC.md)
- [REFERENCE_FLOWS.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/REFERENCE_FLOWS.md)
- [KERNEL_VERIFICATION.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/KERNEL_VERIFICATION.md)
- [TEDDY_IMPLEMENTATION_ORDER.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/TEDDY_IMPLEMENTATION_ORDER.md)

## Task checklist

- [ ] restore fiat-only chapter lifecycle
- [ ] restore typed settlement legs
- [ ] make settlement actions persist real state
- [ ] add counterparty confirmation
- [ ] restore typed event history
- [ ] expose the commitment loop clearly in UI
- [ ] remove or neutralize misleading stubs
- [ ] keep blockchain / wallet / CRDT / bridge complexity out
- [ ] validate the loop survives refresh
- [ ] validate the product feels like a shared commitment system, not just a balance calculator

## Come back to the founder immediately if

- you think the product needs blockchain back to preserve the commitment semantics
- you think the chapter / closeout model is the wrong shape
- you think `expense`, `goal`, and `deposit` need different lifecycle behavior than currently assumed
- you hit a point where the current pot model fundamentally blocks the shared commitment kernel
- you find that unanimity or organizer-only release rules produce obviously broken UX
- you believe a new feature should come back in, but it is currently on the “stay cut” list
- you cannot preserve clear closure without rethinking the object model

## Final rule

Do not optimize for “smaller app” alone.

Optimize for:

- smallest app that still proves the shared commitment loop.
