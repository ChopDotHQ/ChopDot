# Shared Commitment Kernel Roadmap

## Why this exists

The `mvp` cleanup removed a lot of correct-to-defer infrastructure:

- Polkadot wallet and settlement complexity
- CRDT / Automerge sync
- IPFS / Crust backup
- Hyperbridge
- feature sprawl

That cleanup was mostly right.

The problem is that it also removed commitment-lifecycle behavior that is core to what ChopDot is actually trying to become.

ChopDot is not aiming to be a thinner Splitwise clone.
ChopDot is aiming to become a **shared commitment layer**:

- visible shared objective
- contribution state
- approval / release semantics
- event history
- clear closure

This roadmap is the correction: keep the cleanup wins, restore the commitment loop, and shape the MVP into a builder-usable kernel.

## What we are striving for

The shared commitment MVP should be:

- small enough to ship
- strong enough to trust
- legible enough that another builder can understand it
- narrow enough to use as a hackathon kernel later

The target is:

- one clear shared commitment object
- one clear lifecycle
- one event model
- one wedge story

## The wedge

The wedge remains:

- group deposits
- trip / event funding
- service-linked shared funding

Expense tracking stays in the product, but it is supporting capability, not the headline thesis.

## Non-negotiables

Any MVP branch still needs to preserve:

- typed chapter / closeout lifecycle
- contribution state
- approval / release semantics
- counterparty confirmation
- durable event history
- visible current state
- visible next action
- visible closure

These are not advanced features.
They are the product semantics that distinguish ChopDot from a generic expense app.

## Safe cuts

These can stay deferred:

- blockchain settlement rails
- wallet complexity
- CRDT / IPFS / bridge systems
- booking engine depth
- agents executing money actions
- token / yield / protocol work

The rule is simple:

- remove rail complexity if needed
- do not remove commitment semantics

## Immediate roadmap

### 1. Restore a fiat-only chapter / closeout lifecycle

Implement a lifecycle such as:

- `draft`
- `active`
- `partially_settled`
- `completed`
- `cancelled`

This is not a blockchain requirement.
It is a commitment requirement.

### 2. Restore typed settlement legs

Each settlement leg should have a clear state:

- `pending`
- `paid`
- `confirmed`

That gives the system a real answer to:

- what has been proposed
- what has been paid
- what has actually been acknowledged

### 3. Make settlement actions persist

`confirmSettlement` cannot be a toast-only action.

It needs to:

- create or update settlement state
- attach the action to the current chapter
- persist across refresh

### 4. Add counterparty confirmation

The receiver needs a way to confirm receipt.

Without this, ChopDot has the same trust model as:

- a message
- a screenshot
- or “I sent it” in chat

### 5. Restore typed event history

At minimum:

- `settlement_proposed`
- `settlement_confirmed`
- `chapter_closed`

History should support:

- explainability
- auditability
- “what happened”
- “what happens next”

### 6. Make the UI expose the commitment loop

The product should clearly show:

- current state
- next action
- waiting on who
- chapter closed

The branch should feel like a commitment system, not just a balance calculator.

### 7. Remove or neutralize misleading stubs

If wallet, checkpoint, or “auditable” surfaces do nothing meaningful in the MVP, they should be:

- removed
- hidden
- or relabeled honestly

## Builder-kernel goal

This MVP should become usable by outside builders in a sponsored hackathon.

That does not mean “full platform” now.

It means the kernel should be clear enough that another developer can understand:

- the shared commitment object
- the lifecycle
- the event model
- the wedge use case
- what can be extended safely

## Acceptance

This roadmap is done when:

- a group can create a commitment and reach a visible chaptered settlement state
- a settlement proposal is persisted
- a payer can mark a leg paid
- a counterparty can confirm receipt
- the chapter closes visibly when conditions are met
- the loop persists across refresh
- the simplified MVP remains free of unnecessary rail, wallet, sync, and protocol complexity
- another builder can understand what the primitive is and what to build on top of it
